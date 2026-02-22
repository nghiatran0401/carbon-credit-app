'use client';

import { useEffect, useRef, useState } from 'react';

export type Bounds = { north: number; south: number; east: number; west: number };

interface BiomassMapBaseProps {
  bounds: Bounds | null;
  mask: number[][] | null;
  // For editor mode, we might want to control the view or layers externally
  onMapReady?: (map: unknown, L: unknown) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  // Optional: force a specific view center/zoom
  center?: [number, number];
  zoom?: number;
}

export default function BiomassMapBase({
  bounds,
  mask,
  onMapReady,
  onCanvasReady,
  center = [10.4, 106.92], // Default to Cần Giờ
  zoom = 11,
}: BiomassMapBaseProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<any>(null);
  const [isSatellite, setIsSatellite] = useState(true);
  const [leafletReady, setLeafletReady] = useState(false);
  // eslint-disable-next-line
  const layersRef = useRef<{ street: any; satellite: any }>({ street: null, satellite: null });

  // Draw mask on canvas
  const drawMaskOnCanvas = () => {
    if (!canvasRef.current || !mapRef.current || !mask || !bounds) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const map = mapRef.current;

    // Ensure canvas matches map container size and device pixel ratio
    const mapEl = map.getContainer() as HTMLElement;
    const mapWidth = mapEl.clientWidth;
    const mapHeight = mapEl.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    if (
      canvas.width !== Math.floor(mapWidth * dpr) ||
      canvas.height !== Math.floor(mapHeight * dpr)
    ) {
      canvas.width = Math.floor(mapWidth * dpr);
      canvas.height = Math.floor(mapHeight * dpr);
      const newCtx = canvas.getContext('2d');
      if (newCtx) newCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
      // Clear canvas if size matched (otherwise resize clears it)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Re-set transform in case context was lost or reset
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, mapWidth, mapHeight); // Clear in logical pixels

    // Get bounds in container pixels
    const rectNE = { lat: bounds.north, lng: bounds.east };
    const rectSW = { lat: bounds.south, lng: bounds.west };
    const topRight = map.latLngToContainerPoint(rectNE);
    const bottomLeft = map.latLngToContainerPoint(rectSW);

    const canvasLeft = bottomLeft.x;
    const canvasTop = topRight.y;
    const canvasRight = topRight.x;
    const canvasBottom = bottomLeft.y;

    const rectCanvasWidth = canvasRight - canvasLeft;
    const rectCanvasHeight = canvasBottom - canvasTop;

    // Mask shape
    const rows = mask.length;
    const cols = mask[0]?.length || 0;
    if (!rows || !cols) return;

    const scaleX = rectCanvasWidth / cols;
    const scaleY = rectCanvasHeight / rows;

    // Draw mask - semi-transparent green for forest
    ctx.fillStyle = 'rgba(0, 255, 0, 0.4)';

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (mask[i][j] > 0) {
          // Draw slightly larger to avoid gaps? Math.ceil helps
          ctx.fillRect(
            canvasLeft + j * scaleX,
            canvasTop + i * scaleY,
            Math.ceil(scaleX),
            Math.ceil(scaleY),
          );
        }
      }
    }
  };

  // Initialize Map
  useEffect(() => {
    let cancelled = false;

    const loadLeaflet = async () => {
      if (typeof window === 'undefined') return;

      if (!document.getElementById('leaflet-css')) {
        const leafletCSS = document.createElement('link');
        leafletCSS.id = 'leaflet-css';
        leafletCSS.rel = 'stylesheet';
        leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(leafletCSS);
      }

      const L = await import('leaflet');

      if (cancelled || mapRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      const map = L.map(mapContainerRef.current as HTMLDivElement, {
        center: center,
        zoom: zoom,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      });
      const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles © Esri', maxZoom: 19 },
      );

      satellite.addTo(map);
      layersRef.current = { street, satellite };
      mapRef.current = map;

      setLeafletReady(true);

      if (onMapReady) onMapReady(map, L);
    };

    loadLeaflet();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setLeafletReady(false);
      }
    };
    // Init once; adding deps would re-run map init and cause loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle view updates (bounds change, mask change, resize, zoom/move)
  useEffect(() => {
    if (!leafletReady || !mapRef.current) return;
    const map = mapRef.current;

    const handleRedraw = () => requestAnimationFrame(drawMaskOnCanvas);

    map.on('zoom', handleRedraw);
    map.on('move', handleRedraw);
    map.on('zoomend', handleRedraw);
    map.on('moveend', handleRedraw);
    map.on('resize', handleRedraw);

    return () => {
      map.off('zoom', handleRedraw);
      map.off('move', handleRedraw);
      map.off('zoomend', handleRedraw);
      map.off('moveend', handleRedraw);
      map.off('resize', handleRedraw);
    };
    // drawMaskOnCanvas is stable; adding it would not change behavior
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady, mask, bounds]);

  // Trigger redraw when data changes AND fit bounds if bounds changed
  useEffect(() => {
    if (leafletReady && mask && bounds && mapRef.current) {
      requestAnimationFrame(drawMaskOnCanvas);
    }
    // drawMaskOnCanvas reads refs; adding it would not change behavior
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mask, bounds, leafletReady]);

  // Fit bounds when bounds prop changes (for dashboard navigation)
  useEffect(() => {
    if (leafletReady && bounds && mapRef.current) {
      const map = mapRef.current;
      // Calculate center and zoom to fit bounds
      const latCenter = (bounds.north + bounds.south) / 2;
      const lngCenter = (bounds.east + bounds.west) / 2;

      // Create Leaflet bounds and fit
      import('leaflet').then((L) => {
        const leafletBounds = L.latLngBounds(
          [bounds.south, bounds.west],
          [bounds.north, bounds.east],
        );
        map.fitBounds(leafletBounds, { padding: [50, 50], animate: true });
      });
    }
    // Only trigger on bounds change; adding mapRef would cause re-fit loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds, leafletReady]);

  // Handle Canvas Ref for parent
  useEffect(() => {
    if (canvasRef.current && onCanvasReady) {
      onCanvasReady(canvasRef.current);
    }
  }, [onCanvasReady]);

  // Layer toggle
  const toggleLayer = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const { street, satellite } = layersRef.current;

    if (isSatellite) {
      if (map.hasLayer(satellite)) map.removeLayer(satellite);
      if (!map.hasLayer(street)) street.addTo(map);
    } else {
      if (map.hasLayer(street)) map.removeLayer(street);
      if (!map.hasLayer(satellite)) satellite.addTo(map);
    }
    setIsSatellite(!isSatellite);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full bg-[#1a1f2e]" />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full z-[400] pointer-events-none"
      />

      {/* Layer Toggle Button - Floating */}
      <button
        className="absolute bottom-4 left-4 z-[500] px-3 py-2 rounded-md text-xs font-medium border border-[#1e3a2a] bg-[#0b1324] text-[#10b981] hover:bg-[#13324a] transition shadow-lg"
        onClick={toggleLayer}
      >
        {isSatellite ? 'Show Street View' : 'Show Satellite'}
      </button>
    </div>
  );
}
