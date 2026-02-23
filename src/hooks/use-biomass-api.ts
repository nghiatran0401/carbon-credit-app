'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Bounds } from '@/components/biomass-map-base';

const MAX_SELECTION_AREA_KM2 = 10_000;

function calculateBoundsAreaKm2(b: Bounds): number {
  const latDiff = b.north - b.south;
  const lngDiff = b.east - b.west;
  const avgLat = (b.north + b.south) / 2;
  const latKm = latDiff * 111.32;
  const lngKm = lngDiff * 111.32 * Math.cos((avgLat * Math.PI) / 180);
  return latKm * lngKm;
}

export interface BiomassResult {
  biomassShape: [number, number];
  biomassPrediction: number[][];
  overlayUrl: string | null;
}

export function useBiomassApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BiomassResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const analyze = useCallback(
    async (bounds: Bounds, year?: number): Promise<BiomassResult | null> => {
      const area = calculateBoundsAreaKm2(bounds);
      if (area > MAX_SELECTION_AREA_KM2) {
        setError(
          `Selected area (${area.toFixed(0)} km²) exceeds the ${MAX_SELECTION_AREA_KM2} km² limit. Please draw a smaller rectangle.`,
        );
        return null;
      }
      if (bounds.north <= bounds.south || bounds.east <= bounds.west) {
        setError('Invalid selection. Please draw a valid rectangle.');
        return null;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setLoading(true);
      setResult(null);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_BIOMASS_API_URL;
        if (!apiUrl) {
          throw new Error(
            'Biomass API URL is not configured. Set NEXT_PUBLIC_BIOMASS_API_URL in your environment.',
          );
        }

        const res = await fetch(`${apiUrl}/predict_biomass`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify({ bounds, year: year ?? new Date().getFullYear() }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Server error (${res.status})`);
        }

        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Analysis failed');

        let overlayUrl: string | null = null;
        if (data.biomass_vis_base64) {
          overlayUrl = data.biomass_vis_base64.startsWith('data:')
            ? data.biomass_vis_base64
            : `data:image/png;base64,${data.biomass_vis_base64}`;
        }

        const r: BiomassResult = {
          biomassShape: data.biomass_shape as [number, number],
          biomassPrediction: data.biomass_prediction as number[][],
          overlayUrl,
        };
        setResult(r);
        return r;
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return null;

        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('fetch') || msg.includes('network') || msg === 'Failed to fetch') {
          setError(
            'Network error — the connection was lost. The server may be unreachable or the request timed out.',
          );
        } else {
          setError(msg);
        }
        return null;
      } finally {
        if (abortRef.current === controller) {
          setLoading(false);
        }
      }
    },
    [],
  );

  const clearResult = useCallback(() => {
    abortRef.current?.abort();
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { loading, error, result, analyze, clearResult };
}
