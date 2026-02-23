'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type Bounds = { north: number; south: number; east: number; west: number };

interface BiomassMapBaseProps {
  bounds: Bounds | null;
  mask: number[][] | null;
  onMapReady?: (map: unknown, L: unknown) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  center?: [number, number];
  zoom?: number;
}

/**
 * Pre-renders a mask grid into an offscreen canvas using ImageData (single
 * putImageData call instead of N*M fillRect calls). The returned canvas is
 * cols × rows pixels and can be stamped onto the visible canvas with one
 * drawImage per frame, making zoom/pan redraws essentially free.
 */
function buildMaskTexture(mask: number[][]): HTMLCanvasElement {
  const rows = mask.length;
  const cols = mask[0]?.length ?? 0;

  const offscreen = document.createElement('canvas');
  offscreen.width = cols;
  offscreen.height = rows;

  const ctx = offscreen.getContext('2d');
  if (!ctx || !rows || !cols) return offscreen;

  const imageData = ctx.createImageData(cols, rows);
  const px = imageData.data; // Uint8ClampedArray — R,G,B,A per pixel

  for (let i = 0; i < rows; i++) {
    const row = mask[i];
    const rowOffset = i * cols * 4;
    for (let j = 0; j < cols; j++) {
      if (row[j] > 0) {
        const idx = rowOffset + j * 4;
        px[idx] = 0; // R
        px[idx + 1] = 255; // G
        px[idx + 2] = 0; // B
        px[idx + 3] = 102; // A  (~0.4 opacity)
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return offscreen;
}

export default function BiomassMapBase({
  bounds,
  mask,
  onMapReady,
  onCanvasReady,
  center = [10.4, 106.92],
  zoom = 11,
}: BiomassMapBaseProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<any>(null);
  const [isDark, setIsDark] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);
  // eslint-disable-next-line
  const layersRef = useRef<{ light: any; dark: any }>({ light: null, dark: null });

  // Cached offscreen texture — rebuilt only when `mask` changes
  const maskTextureRef = useRef<HTMLCanvasElement | null>(null);

  // Build / invalidate the offscreen texture whenever mask changes
  useEffect(() => {
    if (mask && mask.length > 0 && mask[0]?.length > 0) {
      maskTextureRef.current = buildMaskTexture(mask);
    } else {
      maskTextureRef.current = null;
    }
  }, [mask]);

  // Stamp the pre-built texture onto the visible overlay canvas.
  // This runs on every zoom/pan but is a single drawImage — sub-ms.
  const drawMaskOnCanvas = useCallback(() => {
    if (!canvasRef.current || !mapRef.current || !bounds) return;

    const texture = maskTextureRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const map = mapRef.current;
    const mapEl = map.getContainer() as HTMLElement;
    const mapWidth = mapEl.clientWidth;
    const mapHeight = mapEl.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    const targetW = Math.floor(mapWidth * dpr);
    const targetH = Math.floor(mapHeight * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, mapWidth, mapHeight);

    if (!texture) return;

    const topRight = map.latLngToContainerPoint({ lat: bounds.north, lng: bounds.east });
    const bottomLeft = map.latLngToContainerPoint({ lat: bounds.south, lng: bounds.west });

    ctx.drawImage(
      texture,
      bottomLeft.x,
      topRight.y,
      topRight.x - bottomLeft.x,
      bottomLeft.y - topRight.y,
    );
  }, [bounds]);

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

      const dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      });
      const light = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20,
        },
      );

      light.addTo(map);
      layersRef.current = { light, dark };
      mapRef.current = map;

      // Leaflet calculates the tile grid from the container's size at init
      // time. Because we're inside an async import the container is often
      // not at its final layout dimensions yet, so tiles only cover a
      // fraction of the viewport.  Force a recalculation after the browser
      // has had a chance to settle the layout.
      requestAnimationFrame(() => {
        if (!cancelled) map.invalidateSize();
      });

      setLeafletReady(true);

      if (onMapReady) onMapReady(map, L);
    };

    loadLeaflet();

    // Keep Leaflet in sync whenever the container is resized (window
    // resize, sidebar toggle, parent flex/grid reflow, etc.).
    const container = mapContainerRef.current;
    let resizeObserver: ResizeObserver | undefined;
    if (container) {
      resizeObserver = new ResizeObserver(() => {
        mapRef.current?.invalidateSize();
      });
      resizeObserver.observe(container);
    }

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setLeafletReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw on map move/zoom — only moveend and resize (not the continuous events)
  useEffect(() => {
    if (!leafletReady || !mapRef.current) return;
    const map = mapRef.current;

    let rafId: number | null = null;
    const handleRedraw = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        drawMaskOnCanvas();
        rafId = null;
      });
    };

    map.on('moveend', handleRedraw);
    map.on('resize', handleRedraw);

    return () => {
      map.off('moveend', handleRedraw);
      map.off('resize', handleRedraw);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [leafletReady, drawMaskOnCanvas]);

  // Redraw when mask/bounds data arrives
  useEffect(() => {
    if (leafletReady && bounds && mapRef.current) {
      requestAnimationFrame(drawMaskOnCanvas);
    }
  }, [mask, bounds, leafletReady, drawMaskOnCanvas]);

  // Fit bounds when bounds prop changes
  useEffect(() => {
    if (leafletReady && bounds && mapRef.current) {
      const map = mapRef.current;
      // Ensure Leaflet knows the true container size before fitting
      map.invalidateSize();
      import('leaflet').then((L) => {
        const leafletBounds = L.latLngBounds(
          [bounds.south, bounds.west],
          [bounds.north, bounds.east],
        );
        map.fitBounds(leafletBounds, { padding: [50, 50], animate: true });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds, leafletReady]);

  // Handle Canvas Ref for parent
  useEffect(() => {
    if (canvasRef.current && onCanvasReady) {
      onCanvasReady(canvasRef.current);
    }
  }, [onCanvasReady]);

  const toggleLayer = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const { light, dark } = layersRef.current;

    if (isDark) {
      if (map.hasLayer(dark)) map.removeLayer(dark);
      if (!map.hasLayer(light)) light.addTo(map);
    } else {
      if (map.hasLayer(light)) map.removeLayer(light);
      if (!map.hasLayer(dark)) dark.addTo(map);
    }
    setIsDark(!isDark);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full bg-[#1a1f2e]" />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full z-[400] pointer-events-none"
      />

      <button
        className="absolute bottom-4 left-4 z-[500] px-3 py-2 rounded-md text-xs font-medium border border-[#1e3a2a] bg-[#0b1324] text-[#10b981] hover:bg-[#13324a] transition shadow-lg"
        onClick={toggleLayer}
      >
        {isDark ? 'Light Map' : 'Dark Map'}
      </button>
    </div>
  );
}
