"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calculator, Trash2 } from "lucide-react";
import { FOREST_ZONES, USD_PER_CREDIT } from "@/lib/map-utils";

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Polygon = dynamic(() => import("react-leaflet").then((mod) => mod.Polygon), { ssr: false });

interface InteractiveMapProps {
  onZoneSelect?: (zone: any) => void;
  selectedZone?: string;
}

export default function InteractiveMap({ onZoneSelect, selectedZone }: InteractiveMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [drawnArea, setDrawnArea] = useState<number | null>(null);
  const [drawnCredits, setDrawnCredits] = useState<number | null>(null);
  const [drawnValue, setDrawnValue] = useState<number | null>(null);
  const mapRef = useRef<any>(null);

  const mapCenter: [number, number] = [10.4, 106.92];

  useEffect(() => {
    setIsClient(true);

    // Load Leaflet and required plugins
    const loadLeaflet = async () => {
      if (typeof window !== "undefined") {
        const L = await import("leaflet");

        // Fix for default markers
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });

        // Load required CSS
        const leafletCSS = document.createElement("link");
        leafletCSS.rel = "stylesheet";
        leafletCSS.href = "https://unpkg.com/leaflet@1.7.1/dist/leaflet.css";
        document.head.appendChild(leafletCSS);

        const drawCSS = document.createElement("link");
        drawCSS.rel = "stylesheet";
        drawCSS.href = "https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css";
        document.head.appendChild(drawCSS);

        setLeafletLoaded(true);
      }
    };

    loadLeaflet();
  }, []);

  const handleZoneClick = (zoneKey: string, zone: any) => {
    if (onZoneSelect) {
      onZoneSelect({ ...zone, id: zoneKey });
    }
  };

  const clearDrawnPolygon = () => {
    setDrawnArea(null);
    setDrawnCredits(null);
    setDrawnValue(null);
  };

  if (!isClient || !leafletLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Interactive Forest Map
          </CardTitle>
          <CardDescription>Loading map...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-green-50 rounded-lg flex items-center justify-center border-2 border-dashed border-green-200">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-green-400 mx-auto mb-4 animate-pulse" />
              <p className="text-green-600 font-medium">Loading Interactive Map</p>
              <p className="text-sm text-gray-500 mt-2">Initializing Leaflet components...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Interactive Forest Map
          </div>
          {drawnArea && (
            <Button variant="outline" size="sm" onClick={clearDrawnPolygon}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </CardTitle>
        <CardDescription>Click on forest zones to view details. Draw polygons to calculate carbon credits.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="h-96 rounded-lg overflow-hidden border">
            <MapContainer center={mapCenter} zoom={11} style={{ height: "100%", width: "100%" }} ref={mapRef}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {/* Render forest zones */}
              {Object.entries(FOREST_ZONES).map(([key, zone]) => (
                <Polygon
                  key={key}
                  positions={zone.coordinates as any}
                  pathOptions={{
                    color: zone.color,
                    fillColor: zone.color,
                    fillOpacity: selectedZone === key ? 0.7 : 0.5,
                    weight: selectedZone === key ? 3 : 2,
                  }}
                  eventHandlers={{
                    click: () => handleZoneClick(key, zone),
                  }}
                />
              ))}
            </MapContainer>
          </div>

          {/* Zone Information Overlay */}
          <div className="absolute top-4 left-4 space-y-2 z-[1000]">
            {Object.entries(FOREST_ZONES).map(([key, zone]) => (
              <Badge key={key} variant={selectedZone === key ? "default" : "secondary"} className="cursor-pointer" onClick={() => handleZoneClick(key, zone)}>
                {zone.name}
              </Badge>
            ))}
          </div>

          {/* Carbon Credit Calculator Overlay */}
          {drawnArea && (
            <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-[1000] min-w-[220px]">
              <div className="flex items-center mb-2">
                <Calculator className="h-4 w-4 mr-2 text-green-600" />
                <span className="font-semibold">Carbon Credit Calculator</span>
              </div>
              <div className="space-y-1 text-sm">
                <div>
                  <strong>Area:</strong> {drawnArea.toFixed(2)} m²
                </div>
                <div>
                  <strong>Carbon Credits:</strong> {drawnCredits?.toFixed(4)} tCO₂
                </div>
                <div>
                  <strong>USD Value:</strong> ${drawnValue?.toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Zone Legend */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(FOREST_ZONES).map(([key, zone]) => (
            <div
              key={key}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedZone === key ? "bg-green-50 border-green-200" : "bg-gray-50 hover:bg-gray-100"}`}
              onClick={() => handleZoneClick(key, zone)}
            >
              <div className="flex items-center mb-2">
                <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: zone.color }} />
                <span className="font-medium text-sm">{zone.name}</span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Area: {zone.area} hectares</div>
                <div>Credits: {zone.credits} tCO₂</div>
                <div>Value: ${(zone.credits * USD_PER_CREDIT).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
