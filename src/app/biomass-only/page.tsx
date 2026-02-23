'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, FeatureGroup, Layer, Rectangle } from 'leaflet';
import BiomassMapBase, { type Bounds } from '@/components/biomass-map-base';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { biomassToCredits } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useBiomassApi } from '@/hooks/use-biomass-api';

const BIOMASS_THRESHOLD = 10; // Mg/ha — areas above this are considered forest
const MAX_MASK_DIMENSION = 1024;
const MAX_UNDO_STEPS = 20;

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalysisStats {
  totalAreaKm2: number | null;
  totalBiomassMg: number | null;
  meanBiomassDensity: number | null;
  forestAreaKm2: number | null;
  forestCoveragePct: number | null;
  forestBiomassMg: number | null;
}

const EMPTY_STATS: AnalysisStats = {
  totalAreaKm2: null,
  totalBiomassMg: null,
  meanBiomassDensity: null,
  forestAreaKm2: null,
  forestCoveragePct: null,
  forestBiomassMg: null,
};

type LeafletStatic = typeof import('leaflet');

// ─── Pure helpers ────────────────────────────────────────────────────────────

function calculateBoundsAreaKm2(b: Bounds): number {
  const latDiff = b.north - b.south;
  const lngDiff = b.east - b.west;
  const avgLat = (b.north + b.south) / 2;
  const latKm = latDiff * 111.32;
  const lngKm = lngDiff * 111.32 * Math.cos((avgLat * Math.PI) / 180);
  return latKm * lngKm;
}

function generateForestMask(biomassData: number[][]): number[][] {
  const rows = biomassData.length;
  const cols = biomassData[0]?.length ?? 0;
  const shouldDownsample = rows > MAX_MASK_DIMENSION || cols > MAX_MASK_DIMENSION;
  const scale = shouldDownsample
    ? Math.max(rows / MAX_MASK_DIMENSION, cols / MAX_MASK_DIMENSION)
    : 1;
  const outRows = shouldDownsample ? Math.floor(rows / scale) : rows;
  const outCols = shouldDownsample ? Math.floor(cols / scale) : cols;

  const mask: number[][] = [];
  for (let i = 0; i < outRows; i++) {
    mask[i] = [];
    for (let j = 0; j < outCols; j++) {
      const srcI = shouldDownsample ? Math.floor(i * scale) : i;
      const srcJ = shouldDownsample ? Math.floor(j * scale) : j;
      mask[i][j] = biomassData[srcI][srcJ] > BIOMASS_THRESHOLD ? 1 : 0;
    }
  }
  return mask;
}

function computeStats(
  prediction: number[][],
  shape: [number, number],
  bounds: Bounds,
  mask: number[][] | null,
): AnalysisStats {
  const [h, w] = shape;
  const totalPixels = h * w;
  if (totalPixels === 0) return EMPTY_STATS;

  const areaKm2 = calculateBoundsAreaKm2(bounds);
  const areaPerPixelHa = (areaKm2 * 100) / totalPixels;
  const maskH = mask?.length ?? 0;
  const maskW = mask?.[0]?.length ?? 0;
  const scaleI = maskH > 0 ? maskH / h : 1;
  const scaleJ = maskW > 0 ? maskW / w : 1;

  let totalMg = 0;
  let sumDensity = 0;
  let forestPixels = 0;
  let forestMg = 0;

  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) {
      const density = prediction[i][j];
      const pixelMg = density * areaPerPixelHa;
      totalMg += pixelMg;
      sumDensity += density;

      if (mask) {
        const mi = Math.min(Math.floor(i * scaleI), maskH - 1);
        const mj = Math.min(Math.floor(j * scaleJ), maskW - 1);
        if (mi >= 0 && mj >= 0 && mask[mi]?.[mj] > 0) {
          forestPixels++;
          forestMg += pixelMg;
        }
      } else if (density > BIOMASS_THRESHOLD) {
        forestPixels++;
        forestMg += pixelMg;
      }
    }
  }

  return {
    totalAreaKm2: areaKm2,
    totalBiomassMg: totalMg,
    meanBiomassDensity: sumDensity / totalPixels,
    forestAreaKm2: (forestPixels / totalPixels) * areaKm2,
    forestCoveragePct: (forestPixels / totalPixels) * 100,
    forestBiomassMg: forestMg,
  };
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function BiomassOnlyPage() {
  const { toast } = useToast();
  const { loading, error: apiError, result, analyze, clearResult } = useBiomassApi();

  // Map & canvas
  const mapRef = useRef<LeafletMap | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layersRef = useRef<{ rectangle: Rectangle | null; drawnItems: FeatureGroup | null }>({
    rectangle: null,
    drawnItems: null,
  });

  // Selection
  const [selectedBounds, setSelectedBounds] = useState<Bounds | null>(null);
  const [analysisYear, setAnalysisYear] = useState(new Date().getFullYear());

  // Forest mask
  const forestMaskRef = useRef<number[][] | null>(null);
  const [forestMask, setForestMask] = useState<number[][] | null>(null);
  const [editHistory, setEditHistory] = useState<number[][][]>([]);
  const [editHistoryIndex, setEditHistoryIndex] = useState(-1);
  const [editMode, setEditMode] = useState<'add' | 'remove' | null>(null);
  const [brushSize, setBrushSize] = useState(20);
  const paintStateRef = useRef({ isPainting: false });
  const rafRef = useRef<number | null>(null);

  // Overlay
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<AnalysisStats>(EMPTY_STATS);

  // Save dialog
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Canvas readiness flag for listener registration
  const [canvasReady, setCanvasReady] = useState(false);

  // ── Refs to avoid stale closures in paint handlers ──────────────────────

  const selectedBoundsRef = useRef(selectedBounds);
  const editModeRef = useRef(editMode);
  const brushSizeRef = useRef(brushSize);
  const biomassPredictionRef = useRef<number[][] | null>(null);
  const biomassShapeRef = useRef<[number, number] | null>(null);
  const editHistoryRef = useRef(editHistory);
  const editHistoryIndexRef = useRef(editHistoryIndex);

  useEffect(() => {
    forestMaskRef.current = forestMask;
  }, [forestMask]);
  useEffect(() => {
    selectedBoundsRef.current = selectedBounds;
  }, [selectedBounds]);
  useEffect(() => {
    editModeRef.current = editMode;
  }, [editMode]);
  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);
  useEffect(() => {
    editHistoryRef.current = editHistory;
  }, [editHistory]);
  useEffect(() => {
    editHistoryIndexRef.current = editHistoryIndex;
  }, [editHistoryIndex]);

  // ── Process analysis result ─────────────────────────────────────────────

  useEffect(() => {
    if (!result) return;
    const bounds = selectedBoundsRef.current;
    if (!bounds) return;

    const { biomassShape, biomassPrediction, overlayUrl: url } = result;
    biomassPredictionRef.current = biomassPrediction;
    biomassShapeRef.current = biomassShape;
    setOverlayUrl(url);

    const mask = generateForestMask(biomassPrediction);
    setForestMask(mask);
    setEditHistory([mask]);
    setEditHistoryIndex(0);
    setStats(computeStats(biomassPrediction, biomassShape, bounds, mask));
  }, [result]);

  // ── Paint handlers (stable — all state accessed via refs) ───────────────

  const handlePaint = useCallback((e: MouseEvent) => {
    const mask = forestMaskRef.current;
    const mode = editModeRef.current;
    const rectangle = layersRef.current.rectangle;
    const canvas = canvasRef.current;
    const map = mapRef.current;
    if (!paintStateRef.current.isPainting || !mode || !mask || !rectangle || !canvas || !map)
      return;

    const maskRows = mask.length;
    const maskCols = mask[0]?.length ?? 0;
    if (!maskRows || !maskCols) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rectBounds = rectangle.getBounds();
    const topRight = map.latLngToContainerPoint({
      lat: rectBounds.getNorth(),
      lng: rectBounds.getEast(),
    });
    const bottomLeft = map.latLngToContainerPoint({
      lat: rectBounds.getSouth(),
      lng: rectBounds.getWest(),
    });

    const canvasLeft = bottomLeft.x;
    const canvasTop = topRight.y;
    const canvasRight = topRight.x;
    const canvasBottom = bottomLeft.y;
    const rectW = canvasRight - canvasLeft;
    const rectH = canvasBottom - canvasTop;

    if (x < canvasLeft || x > canvasRight || y < canvasTop || y > canvasBottom) return;

    const maskX = Math.floor(((x - canvasLeft) / rectW) * maskCols);
    const maskY = Math.floor(((y - canvasTop) / rectH) * maskRows);
    const bs = brushSizeRef.current;
    const brushRX = Math.ceil((bs / rectW) * maskCols);
    const brushRY = Math.ceil((bs / rectH) * maskRows);
    const value = mode === 'add' ? 1 : 0;

    for (let i = Math.max(0, maskY - brushRY); i < Math.min(maskRows, maskY + brushRY); i++) {
      for (let j = Math.max(0, maskX - brushRX); j < Math.min(maskCols, maskX + brushRX); j++) {
        mask[i][j] = value;
      }
    }

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const m = forestMaskRef.current;
        if (m) setForestMask(m.map((row) => [...row]));
      });
    }
  }, []);

  const handleStartPaint = useCallback(
    (e: MouseEvent) => {
      if (!editModeRef.current || !forestMaskRef.current) return;
      paintStateRef.current.isPainting = true;
      handlePaint(e);
    },
    [handlePaint],
  );

  const handleStopPaint = useCallback(() => {
    if (!paintStateRef.current.isPainting) return;
    paintStateRef.current.isPainting = false;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const mask = forestMaskRef.current;
    if (!mask) return;

    const snapshot = mask.map((row) => [...row]);
    setForestMask(snapshot);

    let newHistory = editHistoryRef.current.slice(0, editHistoryIndexRef.current + 1);
    newHistory.push(snapshot);
    if (newHistory.length > MAX_UNDO_STEPS) {
      newHistory = newHistory.slice(newHistory.length - MAX_UNDO_STEPS);
    }
    setEditHistory(newHistory);
    setEditHistoryIndex(newHistory.length - 1);

    const prediction = biomassPredictionRef.current;
    const shape = biomassShapeRef.current;
    const bounds = selectedBoundsRef.current;
    if (prediction && shape && bounds) {
      setStats(computeStats(prediction, shape, bounds, snapshot));
    }
  }, []);

  // ── Canvas event listeners ──────────────────────────────────────────────

  useEffect(() => {
    if (!canvasReady || !canvasRef.current) return;
    const canvas = canvasRef.current;

    canvas.addEventListener('mousedown', handleStartPaint);
    canvas.addEventListener('mousemove', handlePaint);
    canvas.addEventListener('mouseup', handleStopPaint);
    canvas.addEventListener('mouseleave', handleStopPaint);

    return () => {
      canvas.removeEventListener('mousedown', handleStartPaint);
      canvas.removeEventListener('mousemove', handlePaint);
      canvas.removeEventListener('mouseup', handleStopPaint);
      canvas.removeEventListener('mouseleave', handleStopPaint);
    };
  }, [canvasReady, handleStartPaint, handlePaint, handleStopPaint]);

  // ── Canvas cursor ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.style.cursor = editMode ? 'crosshair' : '';
    canvasRef.current.style.pointerEvents = editMode ? 'auto' : 'none';
  }, [editMode]);

  // ── Undo / Redo (stable — read from refs) ──────────────────────────────

  const performUndo = useCallback(() => {
    const history = editHistoryRef.current;
    const idx = editHistoryIndexRef.current;
    if (idx <= 0) return;

    const newIdx = idx - 1;
    const mask = history[newIdx].map((r) => [...r]);
    setEditHistoryIndex(newIdx);
    setForestMask(mask);

    const prediction = biomassPredictionRef.current;
    const shape = biomassShapeRef.current;
    const bounds = selectedBoundsRef.current;
    if (prediction && shape && bounds) {
      setStats(computeStats(prediction, shape, bounds, mask));
    }
  }, []);

  const performRedo = useCallback(() => {
    const history = editHistoryRef.current;
    const idx = editHistoryIndexRef.current;
    if (idx >= history.length - 1) return;

    const newIdx = idx + 1;
    const mask = history[newIdx].map((r) => [...r]);
    setEditHistoryIndex(newIdx);
    setForestMask(mask);

    const prediction = biomassPredictionRef.current;
    const shape = biomassShapeRef.current;
    const bounds = selectedBoundsRef.current;
    if (prediction && shape && bounds) {
      setStats(computeStats(prediction, shape, bounds, mask));
    }
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        performUndo();
      } else if ((mod && e.key === 'z' && e.shiftKey) || (mod && e.key === 'y')) {
        e.preventDefault();
        performRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [performUndo, performRedo]);

  // ── Map ready handler ──────────────────────────────────────────────────

  const handleMapReady = useCallback(async (mapInstance: unknown, leafletLib: unknown) => {
    const map = mapInstance as LeafletMap;
    const L = leafletLib as LeafletStatic;
    mapRef.current = map;

    await import('leaflet-draw');

    if (!document.getElementById('leaflet-draw-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-draw-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css';
      document.head.appendChild(link);
    }

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    layersRef.current.drawnItems = drawnItems;

    const LControl = L.Control as unknown as Record<string, new (opts: unknown) => L.Control>;
    const drawControl = new LControl.Draw({
      position: 'topright',
      draw: {
        polyline: false,
        polygon: false,
        circle: false,
        marker: false,
        circlemarker: false,
        rectangle: {
          shapeOptions: { color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.2, weight: 2 },
        },
      },
      edit: { featureGroup: drawnItems, remove: true },
    });
    map.addControl(drawControl);

    const syncBounds = (layer: Layer) => {
      const rect = layer as Rectangle;
      layersRef.current.rectangle = rect;
      const b = rect.getBounds();
      setSelectedBounds({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });

      rect.off('edit');
      rect.off('drag');
      const onEditOrDrag = () => {
        const nb = rect.getBounds();
        setSelectedBounds({
          north: nb.getNorth(),
          south: nb.getSouth(),
          east: nb.getEast(),
          west: nb.getWest(),
        });
      };
      rect.on('edit', onEditOrDrag);
      rect.on('drag', onEditOrDrag);
    };

    map.on('draw:created', (e) => {
      const layer = (e as unknown as { layer: Layer }).layer;
      if (layersRef.current.rectangle && layersRef.current.drawnItems) {
        layersRef.current.drawnItems.removeLayer(layersRef.current.rectangle);
      }
      drawnItems.addLayer(layer);
      syncBounds(layer);
    });

    map.on('draw:edited', () => {
      if (layersRef.current.rectangle) syncBounds(layersRef.current.rectangle);
    });

    map.on('draw:deleted', () => {
      layersRef.current.rectangle = null;
      setSelectedBounds(null);
    });
  }, []);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
    setCanvasReady(true);
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────

  const startAnalysis = async () => {
    if (!selectedBounds) return;
    setOverlayUrl(null);
    await analyze(selectedBounds, analysisYear);
  };

  const canUndo = editHistoryIndex > 0;
  const canRedo = editHistoryIndex < editHistory.length - 1;

  const clearAll = () => {
    setSelectedBounds(null);
    setOverlayUrl(null);
    clearResult();
    setForestMask(null);
    setEditHistory([]);
    setEditHistoryIndex(-1);
    setEditMode(null);
    setStats(EMPTY_STATS);
    biomassPredictionRef.current = null;
    biomassShapeRef.current = null;
    if (layersRef.current.rectangle && layersRef.current.drawnItems) {
      layersRef.current.drawnItems.removeLayer(layersRef.current.rectangle);
      layersRef.current.rectangle = null;
    }
  };

  const handleSaveForest = async () => {
    if (!saveForm.name) {
      toast({ title: 'Error', description: 'Please enter a name.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveForm.name,
          description: saveForm.description,
          bounds: selectedBounds,
          mask: forestMask,
          stats,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast({ title: 'Success', description: 'Forest calculation saved!' });
      setIsSaveDialogOpen(false);
      setSaveForm({ name: '', description: '' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save calculation.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen w-full bg-[#0f1419] text-gray-200">
      <div className="max-w-[1600px] mx-auto px-0 md:px-4 py-0 md:py-4">
        <div
          className="flex flex-col md:flex-row h-[calc(100vh-90px)] md:h-[calc(100vh-130px)] overflow-hidden rounded-none md:rounded-lg md:border md:border-[#1e3a2a]"
          style={{ background: '#0f1419' }}
        >
          {/* Map */}
          <div className="flex-1 relative">
            <BiomassMapBase
              bounds={selectedBounds}
              mask={forestMask}
              onMapReady={handleMapReady}
              onCanvasReady={handleCanvasReady}
            />
          </div>

          {/* Sidebar */}
          <div className="w-full md:w-[800px] flex flex-col border-t md:border-t-0 md:border-l border-[#1e3a2a] bg-[#151b28]">
            {/* Visualization */}
            <div className="flex-1 min-h-[260px] max-h-[600px] flex items-center justify-center overflow-hidden border-b border-[#1e3a2a] px-3">
              {overlayUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={overlayUrl}
                  className="max-w-full max-h-full rounded border border-[#1e3a2a]"
                  alt="Biomass density heatmap overlay"
                />
              ) : loading ? (
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"
                    role="status"
                    aria-label="Loading"
                  />
                  <div className="text-center">
                    <div className="text-[13px] font-medium text-emerald-500">
                      Processing Biomass Analysis...
                    </div>
                    <div className="text-[11px] text-[#7a8fa3] mt-1">
                      This may take several minutes for large areas
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[13px] text-[#5a6b7a]">Draw a rectangle to begin</div>
              )}
            </div>

            {/* Toolbar & Stats */}
            <div className="flex w-full min-h-[360px]">
              {/* Toolbar */}
              <div className="w-[260px] border-r border-[#1e3a2a] bg-[rgba(15,23,42,0.98)] p-4 overflow-y-auto">
                <div className="text-[13px] font-semibold text-emerald-500 mb-3 uppercase">
                  📊 Analysis
                </div>

                <div className="mb-2">
                  <Label htmlFor="analysis-year" className="text-xs text-gray-500 mb-1 block">
                    Year
                  </Label>
                  <Input
                    id="analysis-year"
                    type="number"
                    min={2000}
                    max={new Date().getFullYear()}
                    value={analysisYear}
                    onChange={(e) =>
                      setAnalysisYear(parseInt(e.target.value) || new Date().getFullYear())
                    }
                    className="bg-[#0b1324] border-[#1e3a2a] h-8 text-sm"
                  />
                </div>

                <Button
                  onClick={startAnalysis}
                  disabled={!selectedBounds || loading}
                  className="w-full bg-emerald-500 text-[#0f1419] hover:bg-emerald-600"
                  aria-label="Start biomass analysis"
                >
                  {loading ? 'Processing...' : 'Start Analysis'}
                </Button>
                {apiError && (
                  <div className="text-red-500 text-xs mt-2 whitespace-pre-line" role="alert">
                    {apiError}
                  </div>
                )}

                <div className="my-4 h-px bg-[#1e3a2a]" />

                <div className="text-[13px] font-semibold text-emerald-500 mb-3 uppercase">
                  🖌️ Editor
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Button
                    size="sm"
                    variant={editMode === 'add' ? 'default' : 'outline'}
                    onClick={() => setEditMode(editMode === 'add' ? null : 'add')}
                    className={
                      editMode === 'add'
                        ? 'bg-emerald-500 text-black'
                        : 'text-gray-400 border-gray-700'
                    }
                    aria-label="Add forest area"
                    aria-pressed={editMode === 'add'}
                  >
                    ➕ Add
                  </Button>
                  <Button
                    size="sm"
                    variant={editMode === 'remove' ? 'default' : 'outline'}
                    onClick={() => setEditMode(editMode === 'remove' ? null : 'remove')}
                    className={
                      editMode === 'remove'
                        ? 'bg-emerald-500 text-black'
                        : 'text-gray-400 border-gray-700'
                    }
                    aria-label="Remove forest area"
                    aria-pressed={editMode === 'remove'}
                  >
                    ➖ Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={performUndo}
                    disabled={!canUndo}
                    className="text-gray-400 border-gray-700"
                    aria-label="Undo (Ctrl+Z)"
                  >
                    ↶ Undo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={performRedo}
                    disabled={!canRedo}
                    className="text-gray-400 border-gray-700"
                    aria-label="Redo (Ctrl+Y)"
                  >
                    ↷ Redo
                  </Button>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Brush Size</span>
                    <span>{brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full accent-emerald-500"
                    aria-label="Brush size"
                  />
                </div>

                <div className="my-4 h-px bg-[#1e3a2a]" />

                <Button
                  variant="secondary"
                  className="w-full mb-2 bg-[#1e3a2a] text-emerald-500 hover:bg-[#2d5a3d]"
                  onClick={() => setIsSaveDialogOpen(true)}
                  disabled={!forestMask}
                  aria-label="Save analysis as forest"
                >
                  💾 Save as Forest
                </Button>
                <Button
                  variant="destructive"
                  className="w-full bg-red-900/20 text-red-400 border border-red-900 hover:bg-red-900/40"
                  onClick={clearAll}
                  aria-label="Clear all analysis data"
                >
                  Clear All
                </Button>
              </div>

              {/* Stats */}
              <div
                className="flex-1 p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 content-start"
                role="region"
                aria-label="Analysis statistics"
              >
                <StatCard title="Total Area" value={stats.totalAreaKm2} unit="km²" />
                <StatCard title="Forest Area" value={stats.forestAreaKm2} unit="km²" />
                <StatCard title="Forest Coverage" value={stats.forestCoveragePct} unit="%" />
                <StatCard title="Total Biomass" value={stats.totalBiomassMg} unit="Mg" />
                <StatCard title="Mean Density" value={stats.meanBiomassDensity} unit="Mg/ha" />
                <StatCard title="Your Biomass" value={stats.forestBiomassMg} unit="Mg" />
                <div className="col-span-full mt-2 bg-green-900/10 border border-green-900/20 rounded p-3">
                  <div className="text-xs text-gray-400 uppercase font-bold">Carbon Credits</div>
                  <div className="text-2xl font-bold text-emerald-500">
                    {stats.forestBiomassMg
                      ? biomassToCredits(stats.forestBiomassMg).toFixed(2)
                      : '-'}{' '}
                    tCO₂e
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="bg-[#151b28] border-[#1e3a2a] text-gray-200 z-[2000]">
          <DialogHeader>
            <DialogTitle>Save Calculated Forest</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="forest-name">Forest Name</Label>
              <Input
                id="forest-name"
                value={saveForm.name}
                onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
                className="bg-[#0b1324] border-[#1e3a2a]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="forest-desc">Description</Label>
              <Textarea
                id="forest-desc"
                value={saveForm.description}
                onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
                className="bg-[#0b1324] border-[#1e3a2a]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSaveDialogOpen(false)}
              className="border-[#1e3a2a] text-gray-400 hover:bg-[#1e3a2a]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveForest}
              disabled={isSaving}
              className="bg-emerald-500 text-black hover:bg-emerald-600"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ title, value, unit }: { title: string; value: number | null; unit: string }) {
  return (
    <div className="bg-green-900/5 border border-green-900/20 rounded p-2">
      <div className="text-xs text-gray-500 font-medium uppercase">{title}</div>
      <div className="text-xl font-bold text-emerald-500">
        {value !== null ? `${value.toFixed(2)} ${unit}` : '-'}
      </div>
    </div>
  );
}
