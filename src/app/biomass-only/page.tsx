'use client';

import { useEffect, useRef, useState } from 'react';
import BiomassMapBase, { Bounds } from '@/components/biomass-map-base';
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
import { BIOMASS_TO_CO2_FACTOR } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

const BASE_URL = 'https://judgmental-differently-norberto.ngrok-free.dev'; //Contact Nguyen Vinh Khang if you want to this server
const BIOMASS_THRESHOLD = 10; // Mg/ha - areas with biomass > this are considered forest

export default function BiomassOnlyPage() {
  const { toast } = useToast();

  // Refs for external control of map components (Leaflet types not in @types/leaflet)
  // eslint-disable-next-line
  const mapRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // eslint-disable-next-line
  const layersRef = useRef<{ rectangle: any | null; drawnItems: any | null }>({
    rectangle: null,
    drawnItems: null,
  });

  const paintStateRef = useRef<{ isPainting: boolean }>({ isPainting: false });
  const forestMaskRef = useRef<number[][] | null>(null);
  const rafRef = useRef<number | null>(null);

  const [selectedBounds, setSelectedBounds] = useState<Bounds | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forest mask editing
  const [forestMask, setForestMask] = useState<number[][] | null>(null);
  const [forestMaskShape, setForestMaskShape] = useState<[number, number] | null>(null);
  const [editHistory, setEditHistory] = useState<number[][][]>([]);
  const [editHistoryIndex, setEditHistoryIndex] = useState(-1);
  const [editMode, setEditMode] = useState<'add' | 'remove' | null>(null);
  const [brushSize, setBrushSize] = useState(20);

  // Results
  const [biomassShape, setBiomassShape] = useState<[number, number] | null>(null);
  const [biomassPrediction, setBiomassPrediction] = useState<number[][] | null>(null);
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalAreaKm2: null as number | null,
    totalBiomassMg: null as number | null,
    meanBiomassDensity: null as number | null,
    forestAreaKm2: null as number | null,
    forestCoveragePct: null as number | null,
    forestBiomassMg: null as number | null,
  });

  // Save Dialog State
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    forestMaskRef.current = forestMask;
  }, [forestMask]);

  // Generate forest mask - downsample for performance on large datasets
  const generateForestMask = (biomassData: number[][]) => {
    const originalRows = biomassData.length;
    const originalCols = biomassData[0]?.length || 0;

    // If data is too large, downsample it for editing performance
    const MAX_DIMENSION = 1024;
    const shouldDownsample = originalRows > MAX_DIMENSION || originalCols > MAX_DIMENSION;

    if (shouldDownsample) {
      console.log(`⚡ Downsampling from ${originalRows}×${originalCols} to improve performance...`);
      const scale = Math.max(originalRows / MAX_DIMENSION, originalCols / MAX_DIMENSION);
      const newRows = Math.floor(originalRows / scale);
      const newCols = Math.floor(originalCols / scale);

      const mask: number[][] = [];
      for (let i = 0; i < newRows; i++) {
        mask[i] = [];
        for (let j = 0; j < newCols; j++) {
          // Sample from original data
          const origI = Math.floor(i * scale);
          const origJ = Math.floor(j * scale);
          mask[i][j] = biomassData[origI][origJ] > BIOMASS_THRESHOLD ? 1 : 0;
        }
      }
      console.log(`✅ Downsampled to ${newRows}×${newCols} for editing`);
      return mask;
    } else {
      // Original logic for small arrays
      const mask: number[][] = [];
      for (let i = 0; i < originalRows; i++) {
        mask[i] = [];
        for (let j = 0; j < originalCols; j++) {
          mask[i][j] = biomassData[i][j] > BIOMASS_THRESHOLD ? 1 : 0;
        }
      }
      return mask;
    }
  };

  // Stats computation
  const calculateBoundsAreaKm2 = (b: Bounds) => {
    const latDiff = b.north - b.south;
    const lngDiff = b.east - b.west;
    const avgLat = (b.north + b.south) / 2;
    const latKm = latDiff * 111.32;
    const lngKm = lngDiff * 111.32 * Math.cos((avgLat * Math.PI) / 180);
    return latKm * lngKm;
  };

  const computeStats = (
    prediction: number[][],
    shape: [number, number],
    bounds: Bounds,
    mask?: number[][],
  ) => {
    const [h, w] = shape;
    const totalPixels = h * w;
    const areaKm2 = calculateBoundsAreaKm2(bounds);
    const totalAreaHa = areaKm2 * 100;
    const areaPerPixelHa = totalAreaHa / totalPixels;

    const currentMask = mask || forestMask;
    let totalMg = 0;
    let sumDensity = 0;
    let forestPixels = 0;
    let forestMg = 0;

    // If mask dimensions don't match prediction (due to downsampling), scale coordinates
    const maskH = currentMask?.length || 0;
    const maskW = currentMask?.[0]?.length || 0;
    const scaleI = maskH > 0 && h > 0 ? maskH / h : 1;
    const scaleJ = maskW > 0 && w > 0 ? maskW / w : 1;

    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        const density = prediction[i][j];
        const pixelMg = density * areaPerPixelHa;
        totalMg += pixelMg;
        sumDensity += density;

        // Map prediction coordinates to mask coordinates
        const maskI = Math.min(Math.floor(i * scaleI), maskH - 1);
        const maskJ = Math.min(Math.floor(j * scaleJ), maskW - 1);

        if (
          currentMask &&
          maskI >= 0 &&
          maskJ >= 0 &&
          currentMask[maskI] &&
          currentMask[maskI][maskJ] > 0
        ) {
          forestPixels++;
          forestMg += pixelMg;
        } else if (!currentMask && density > BIOMASS_THRESHOLD) {
          forestPixels++;
          forestMg += pixelMg;
        }
      }
    }

    setStats({
      totalAreaKm2: areaKm2,
      totalBiomassMg: totalMg,
      meanBiomassDensity: sumDensity / totalPixels,
      forestAreaKm2: (forestPixels / totalPixels) * areaKm2,
      forestCoveragePct: (forestPixels / totalPixels) * 100,
      forestBiomassMg: forestMg,
    });
  };

  // Initialize Leaflet Draw when map is ready (Leaflet types not in @types/leaflet)
  // eslint-disable-next-line
  const handleMapReady = async (map: any, L: any) => {
    mapRef.current = map;
    await import('leaflet-draw'); // Ensure draw is loaded

    // Load Leaflet Draw CSS
    if (!document.getElementById('leaflet-draw-css')) {
      const drawCSS = document.createElement('link');
      drawCSS.id = 'leaflet-draw-css';
      drawCSS.rel = 'stylesheet';
      drawCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css';
      document.head.appendChild(drawCSS);
    }

    // FeatureGroup for drawn items
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    layersRef.current.drawnItems = drawnItems;

    // Draw Control
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polyline: false,
        polygon: false,
        circle: false,
        marker: false,
        circlemarker: false,
        rectangle: {
          shapeOptions: {
            color: '#ff0000',
            fillColor: '#ff0000',
            fillOpacity: 0.2,
            weight: 2,
          },
        },
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });
    map.addControl(drawControl);

    // Attach listener to rectangle for live drawing updates
    // eslint-disable-next-line
    const attachRectangleListeners = (rect: any) => {
      if (!rect) return;
      rect.off('edit');
      rect.off('drag');
      const sync = () => {
        const b = rect.getBounds();
        setSelectedBounds({
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        });
      };
      rect.on('edit', sync);
      rect.on('drag', sync);
    };

    // Handlers
    // eslint-disable-next-line
    const updateBounds = (layer: any) => {
      if (!layer) return;
      layersRef.current.rectangle = layer;
      attachRectangleListeners(layer); // Attach live update listeners
      const b = layer.getBounds();
      setSelectedBounds({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    };

    // eslint-disable-next-line
    map.on('draw:created', (e: any) => {
      if (layersRef.current.rectangle) {
        drawnItems.removeLayer(layersRef.current.rectangle);
      }
      drawnItems.addLayer(e.layer);
      updateBounds(e.layer);
    });

    // eslint-disable-next-line
    map.on('draw:edited', (e: any) => {
      if (layersRef.current.rectangle) {
        updateBounds(layersRef.current.rectangle);
      }
    });

    // If user deletes, clear bounds
    map.on('draw:deleted', () => {
      layersRef.current.rectangle = null;
      setSelectedBounds(null);
      // clearAll(); // Do not clear results immediately on delete, user might just be adjusting
    });
  };

  // Canvas Ready Handler
  const handleCanvasReady = (canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  };

  // Painting Logic
  const startPainting = (e: MouseEvent) => {
    if (!editMode || !forestMask) return;
    paintStateRef.current.isPainting = true;
    paint(e);
  };

  const paint = (e: MouseEvent) => {
    const mask = forestMaskRef.current;
    if (
      !paintStateRef.current.isPainting ||
      !editMode ||
      !mask ||
      !forestMaskShape ||
      !layersRef.current.rectangle ||
      !canvasRef.current ||
      !mapRef.current
    )
      return;

    const canvas = canvasRef.current;
    const map = mapRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rectBounds = layersRef.current.rectangle.getBounds();
    const rectNE = { lat: rectBounds.getNorth(), lng: rectBounds.getEast() };
    const rectSW = { lat: rectBounds.getSouth(), lng: rectBounds.getWest() };
    const topRight = map.latLngToContainerPoint(rectNE);
    const bottomLeft = map.latLngToContainerPoint(rectSW);

    const canvasLeft = bottomLeft.x;
    const canvasTop = topRight.y;
    const canvasRight = topRight.x;
    const canvasBottom = bottomLeft.y;

    const rectCanvasWidth = canvasRight - canvasLeft;
    const rectCanvasHeight = canvasBottom - canvasTop;

    if (x < canvasLeft || x > canvasRight || y < canvasTop || y > canvasBottom) return;

    const rectX = x - canvasLeft;
    const rectY = y - canvasTop;

    const maskX = Math.floor((rectX / rectCanvasWidth) * forestMaskShape[1]);
    const maskY = Math.floor((rectY / rectCanvasHeight) * forestMaskShape[0]);

    const brushRadiusX = Math.ceil((brushSize / rectCanvasWidth) * forestMaskShape[1]);
    const brushRadiusY = Math.ceil((brushSize / rectCanvasHeight) * forestMaskShape[0]);

    const value = editMode === 'add' ? 1 : 0;

    for (
      let i = Math.max(0, Math.floor(maskY - brushRadiusY));
      i < Math.min(forestMaskShape[0], Math.ceil(maskY + brushRadiusY));
      i++
    ) {
      for (
        let j = Math.max(0, Math.floor(maskX - brushRadiusX));
        j < Math.min(forestMaskShape[1], Math.ceil(maskX + brushRadiusX));
        j++
      ) {
        mask[i][j] = value;
      }
    }

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (forestMaskRef.current) {
          setForestMask(forestMaskRef.current.map((row) => [...row]));
        }
      });
    }
  };

  const stopPainting = () => {
    if (paintStateRef.current.isPainting) {
      paintStateRef.current.isPainting = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const mask = forestMaskRef.current;
      if (mask) {
        const snapshot = mask.map((row) => [...row]);
        setForestMask(snapshot);
        const newHistory = editHistory.slice(0, editHistoryIndex + 1);
        newHistory.push(snapshot);
        setEditHistory(newHistory);
        setEditHistoryIndex(newHistory.length - 1);
        if (biomassPrediction && biomassShape && selectedBounds) {
          computeStats(biomassPrediction, biomassShape, selectedBounds, mask);
        }
      }
    }
  };

  // Attach listeners to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('mousedown', startPainting);
    canvas.addEventListener('mousemove', paint);
    canvas.addEventListener('mouseup', stopPainting);
    canvas.addEventListener('mouseleave', stopPainting);
    return () => {
      canvas.removeEventListener('mousedown', startPainting);
      canvas.removeEventListener('mousemove', paint);
      canvas.removeEventListener('mouseup', stopPainting);
      canvas.removeEventListener('mouseleave', stopPainting);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, brushSize, forestMaskShape]);

  // Cursor update
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.cursor = editMode ? 'crosshair' : '';
      canvasRef.current.style.pointerEvents = editMode ? 'auto' : 'none';
      if (editMode) canvasRef.current.classList.add('active');
      else canvasRef.current.classList.remove('active');
    }
  }, [editMode]);

  // Start Analysis
  const startAnalysis = async () => {
    if (!selectedBounds) {
      setError('Draw a rectangle first.');
      return;
    }
    setError(null);
    setLoading(true);
    setOverlayUrl(null);

    try {
      console.log('🚀 Starting analysis at:', new Date().toLocaleTimeString());

      const res = await fetch(`${BASE_URL}/predict_biomass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ bounds: selectedBounds, year: 2021 }),
        // Note: No timeout or signal - let it run as long as needed
      });

      console.log('✅ Response received at:', new Date().toLocaleTimeString());

      if (!res.ok) {
        const text = await res.text();
        console.error('❌ Error response:', text);
        throw new Error(text || 'Request failed');
      }

      const data = await res.json();
      console.log('📊 Data parsed successfully');

      if (!data.success) throw new Error(data.error);

      const shape = data.biomass_shape as [number, number];
      const prediction = data.biomass_prediction as number[][];
      console.log(`📏 Received data: ${shape[0]}×${shape[1]} pixels`);

      setBiomassShape(shape);
      setBiomassPrediction(prediction);

      const mask = generateForestMask(prediction);
      const maskShape: [number, number] = [mask.length, mask[0]?.length || 0];
      setForestMask(mask);
      setForestMaskShape(maskShape);
      setEditHistory([mask]);
      setEditHistoryIndex(0);
      console.log(`🎭 Mask created: ${maskShape[0]}×${maskShape[1]} pixels`);

      if (data.biomass_vis_base64) {
        let base64 = data.biomass_vis_base64;
        if (!base64.startsWith('data:')) base64 = `data:image/png;base64,${base64}`;
        setOverlayUrl(base64);
      }

      computeStats(prediction, shape, selectedBounds, mask);
      console.log('✅ Analysis complete!');
    } catch (e: unknown) {
      console.error('❌ Analysis error:', e);
      // Show detailed error message
      const errorMsg = e instanceof Error ? e.message : String(e);
      if (
        errorMsg.includes('fetch') ||
        errorMsg.includes('network') ||
        errorMsg === 'Failed to fetch'
      ) {
        setError(
          'Network error - the connection was lost. This might be due to:\n• Ngrok timeout (max 2 hours on free tier)\n• Very large area requiring longer processing\n• Network instability\n\nConsider using a direct connection instead of ngrok for large areas.',
        );
      } else {
        setError(`Error: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const undo = () => {
    if (editHistoryIndex > 0) {
      const idx = editHistoryIndex - 1;
      setEditHistoryIndex(idx);
      setForestMask(editHistory[idx].map((r) => [...r]));
      if (biomassPrediction && biomassShape && selectedBounds)
        computeStats(biomassPrediction, biomassShape, selectedBounds, editHistory[idx]);
    }
  };
  const redo = () => {
    if (editHistoryIndex < editHistory.length - 1) {
      const idx = editHistoryIndex + 1;
      setEditHistoryIndex(idx);
      setForestMask(editHistory[idx].map((r) => [...r]));
      if (biomassPrediction && biomassShape && selectedBounds)
        computeStats(biomassPrediction, biomassShape, selectedBounds, editHistory[idx]);
    }
  };

  const clearAll = () => {
    setSelectedBounds(null);
    setOverlayUrl(null);
    setBiomassPrediction(null);
    setForestMask(null);
    setStats({
      totalAreaKm2: null,
      totalBiomassMg: null,
      meanBiomassDensity: null,
      forestAreaKm2: null,
      forestCoveragePct: null,
      forestBiomassMg: null,
    });
    if (layersRef.current.rectangle && layersRef.current.drawnItems) {
      layersRef.current.drawnItems.removeLayer(layersRef.current.rectangle);
      layersRef.current.rectangle = null;
    }
  };

  const handleSaveForest = async () => {
    if (!saveForm.name) {
      toast({
        title: 'Error',
        description: 'Please enter a name for the forest.',
        variant: 'destructive',
      });
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
          maskShape: forestMaskShape,
          stats,
          biomassData: biomassPrediction,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast({ title: 'Success', description: 'Forest saved successfully!' });
      setIsSaveDialogOpen(false);
      setSaveForm({ name: '', description: '' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save forest.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0f1419] text-[#e0e0e0]">
      <div className="max-w-[1600px] mx-auto px-0 md:px-4 py-0 md:py-4">
        <div
          className="flex flex-col md:flex-row h-[calc(100vh-90px)] md:h-[calc(100vh-130px)] overflow-hidden rounded-none md:rounded-lg md:border md:border-[#1e3a2a]"
          style={{ background: '#0f1419' }}
        >
          {/* Map Component */}
          <div className="flex-1 relative">
            <BiomassMapBase
              bounds={selectedBounds}
              mask={forestMask}
              onMapReady={handleMapReady}
              onCanvasReady={handleCanvasReady}
            />
          </div>

          {/* Sidebar Controls */}
          <div className="w-full md:w-[800px] flex flex-col border-t md:border-t-0 md:border-l border-[#1e3a2a] bg-[#151b28]">
            {/* Visualization */}
            <div className="flex-1 min-h-[260px] max-h-[600px] flex items-center justify-center overflow-hidden border-b border-[#1e3a2a] px-3">
              {overlayUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic base64 overlay from analysis API
                <img
                  src={overlayUrl}
                  className="max-w-full max-h-full rounded border border-[#1e3a2a]"
                  alt="Biomass Overlay"
                />
              ) : loading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-4 border-[rgba(16,185,129,0.2)] border-t-[#10b981] rounded-full animate-spin" />
                  <div className="text-center">
                    <div className="text-[13px] font-medium text-[#10b981]">
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
              <div className="w-[260px] border-r border-[#1e3a2a] bg-[rgba(15,23,42,0.98)] p-4 overflow-y-auto">
                <div className="text-[13px] font-semibold text-[#10b981] mb-3 uppercase">
                  📊 Analysis
                </div>
                <Button
                  onClick={startAnalysis}
                  disabled={!selectedBounds || loading}
                  className="w-full bg-[#10b981] text-[#0f1419] hover:bg-[#059669]"
                >
                  {loading ? 'Processing...' : 'Start Analysis'}
                </Button>
                {error && <div className="text-red-500 text-xs mt-2">{error}</div>}

                <div className="my-4 h-px bg-[#1e3a2a]" />

                <div className="text-[13px] font-semibold text-[#10b981] mb-3 uppercase">
                  🖌️ Editor
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Button
                    size="sm"
                    variant={editMode === 'add' ? 'default' : 'outline'}
                    onClick={() => setEditMode(editMode === 'add' ? null : 'add')}
                    className={
                      editMode === 'add'
                        ? 'bg-[#10b981] text-black'
                        : 'text-gray-400 border-gray-700'
                    }
                  >
                    ➕ Add
                  </Button>
                  <Button
                    size="sm"
                    variant={editMode === 'remove' ? 'default' : 'outline'}
                    onClick={() => setEditMode(editMode === 'remove' ? null : 'remove')}
                    className={
                      editMode === 'remove'
                        ? 'bg-[#10b981] text-black'
                        : 'text-gray-400 border-gray-700'
                    }
                  >
                    ➖ Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={undo}
                    disabled={editHistoryIndex <= 0}
                    className="text-gray-400 border-gray-700"
                  >
                    ↶ Undo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={redo}
                    disabled={editHistoryIndex >= editHistory.length - 1}
                    className="text-gray-400 border-gray-700"
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
                    className="w-full accent-[#10b981]"
                  />
                </div>

                <div className="my-4 h-px bg-[#1e3a2a]" />

                <Button
                  variant="secondary"
                  className="w-full mb-2 bg-[#1e3a2a] text-[#10b981] hover:bg-[#2d5a3d]"
                  onClick={() => setIsSaveDialogOpen(true)}
                  disabled={!forestMask}
                >
                  💾 Save as Forest
                </Button>
                <Button
                  variant="destructive"
                  className="w-full bg-red-900/20 text-red-400 border border-red-900 hover:bg-red-900/40"
                  onClick={clearAll}
                >
                  Clear All
                </Button>
              </div>

              {/* Stats Display */}
              <div className="flex-1 p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
                <StatCard title="Total Area" value={stats.totalAreaKm2} unit="km²" />
                <StatCard title="Forest Area" value={stats.forestAreaKm2} unit="km²" />
                <StatCard title="Forest Coverage" value={stats.forestCoveragePct} unit="%" />
                <StatCard title="Total Biomass" value={stats.totalBiomassMg} unit="Mg" />
                <StatCard title="Mean Density" value={stats.meanBiomassDensity} unit="Mg/ha" />
                <StatCard title="Your Biomass" value={stats.forestBiomassMg} unit="Mg" />
                <div className="col-span-full mt-2 bg-green-900/10 border border-green-900/20 rounded p-3">
                  <div className="text-xs text-gray-400 uppercase font-bold">Carbon Credits</div>
                  <div className="text-2xl font-bold text-[#10b981]">
                    {stats.forestBiomassMg
                      ? (stats.forestBiomassMg / BIOMASS_TO_CO2_FACTOR).toFixed(2)
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
            <DialogTitle>Save Forest Analysis</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Forest Name</Label>
              <Input
                id="name"
                value={saveForm.name}
                onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
                className="bg-[#0b1324] border-[#1e3a2a]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
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
              className="bg-[#10b981] text-black hover:bg-[#059669]"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value, unit }: { title: string; value: number | null; unit: string }) {
  return (
    <div className="bg-green-900/5 border border-green-900/20 rounded p-2">
      <div className="text-xs text-gray-500 font-medium uppercase">{title}</div>
      <div className="text-xl font-bold text-[#10b981]">
        {value !== null ? `${value.toFixed(2)} ${unit}` : '-'}
      </div>
    </div>
  );
}
