"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calculator, Trash2, TreeDeciduous, BadgeCheck, Leaf, Ruler, ShieldCheck, Tag } from "lucide-react";
import { FOREST_ZONES } from "@/lib/map-utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { remove as removeDiacritics } from "diacritics";
import { useMap } from "react-leaflet";
import { Forest, Bookmark } from "@/types";

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Polygon = dynamic(() => import("react-leaflet").then((mod) => mod.Polygon), { ssr: false });

interface InteractiveMapProps {
  forests: Forest[];
  bookmarks: Bookmark[];
  selectedForest: Forest | null;
  onSelectForest: (forest: Forest) => void;
}

export default function InteractiveMap({ forests, bookmarks, selectedForest, onSelectForest }: InteractiveMapProps) {
  const [tab, setTab] = useState("all");
  const [isClient, setIsClient] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [drawnArea, setDrawnArea] = useState<number | null>(null);
  const [drawnCredits, setDrawnCredits] = useState<number | null>(null);
  const [drawnValue, setDrawnValue] = useState<number | null>(null);
  const mapRef = useRef<any>(null);
  const mapCenter: [number, number] = [10.4, 106.92];
  // Add a state to hold the map instance
  // const [leafletMap, setLeafletMap] = useState<any>(null); // Removed
  const [flyToCenter, setFlyToCenter] = useState<[number, number] | null>(null);

  const isBookmarked = (forestId: number) => bookmarks.some((b) => b.forestId === forestId || b.forest?.id === forestId);
  const normalize = (str: string) =>
    removeDiacritics(str || "")
      .toLowerCase()
      .replace(/\s+/g, "");
  const filteredForests = tab === "favorites" ? forests.filter((f) => isBookmarked(f.id)) : forests;

  useEffect(() => {
    setIsClient(true);
    const loadLeaflet = async () => {
      if (typeof window !== "undefined") {
        const L = await import("leaflet");
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });
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

  // When tab changes, select the first forest in the filtered list
  useEffect(() => {
    if (filteredForests.length && (!selectedForest || !filteredForests.some((f) => f.id === selectedForest.id))) {
      onSelectForest(filteredForests[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, bookmarks, forests]);

  const handleZoneClick = (zoneKey: string, zone: { name: string }) => {
    const zoneName = normalize(zone.name);
    const forest = filteredForests.find((f) => normalize(f.name) === zoneName);
    if (forest) {
      onSelectForest(forest);
    } else if (filteredForests.length) {
      onSelectForest(filteredForests[0]);
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
        <Tabs value={tab} onValueChange={setTab} className="mb-6">
          <TabsList className="w-full flex justify-center bg-gray-100 rounded-lg p-1">
            <TabsTrigger value="all" className="flex-1 data-[state=active]:bg-green-600 data-[state=active]:text-white rounded-md py-2 px-4 font-semibold transition-colors">
              <Leaf className="h-4 w-4 mr-2 inline-block" /> All Forests
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1 data-[state=active]:bg-yellow-500 data-[state=active]:text-white rounded-md py-2 px-4 font-semibold transition-colors">
              <BadgeCheck className="h-4 w-4 mr-2 inline-block" /> Favorites
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <div className="h-64 sm:h-80 lg:h-96 rounded-lg overflow-hidden border">
            <MapContainer center={mapCenter} zoom={11} style={{ height: "100%", width: "100%" }} ref={mapRef}>
              <MapFlyTo center={flyToCenter} />
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {Object.entries(FOREST_ZONES).map(([key, zone]) => (
                <Polygon
                  key={key}
                  positions={zone.coordinates as any}
                  pathOptions={{
                    color: zone.color,
                    fillColor: zone.color,
                    fillOpacity: selectedForest && normalize(selectedForest.name) === normalize(zone.name) ? 0.7 : 0.5,
                    weight: selectedForest && normalize(selectedForest.name) === normalize(zone.name) ? 3 : 2,
                  }}
                  eventHandlers={{
                    click: () => handleZoneClick(key, zone),
                  }}
                />
              ))}
            </MapContainer>
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

        {/* Forest List Under the Map */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {filteredForests.map((forest) => {
            const zoneEntry = Object.entries(FOREST_ZONES).find(([, zone]) => normalize(zone.name) === normalize(forest.name));
            const zone = zoneEntry ? zoneEntry[1] : null;
            const zoneCenter = zone ? [zone.coordinates.reduce((sum, c) => sum + c[0], 0) / zone.coordinates.length, zone.coordinates.reduce((sum, c) => sum + c[1], 0) / zone.coordinates.length] : null;
            return (
              <Card
                key={forest.id}
                className={`cursor-pointer transition-shadow border-2 ${selectedForest?.id === forest.id ? "border-green-600 shadow-lg" : "border-gray-200 hover:border-green-400"} group bg-white hover:shadow-md`}
                onClick={() => {
                  onSelectForest(forest);
                  if (zoneCenter) {
                    setFlyToCenter(zoneCenter as [number, number]);
                  }
                }}
              >
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="flex-shrink-0">
                    <TreeDeciduous className="h-8 w-8 text-green-600 group-hover:text-green-800 transition-colors" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold group-hover:text-green-700 transition-colors">{forest.name}</CardTitle>
                    <CardDescription className="flex items-center text-xs text-gray-500">
                      <MapPin className="h-3 w-3 mr-1" /> {forest.location}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <div className="flex flex-col gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Ruler className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Area:</span>
                      <span className="ml-auto font-semibold text-gray-900">{forest.area} ha</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Status:</span>
                      <span className={`ml-auto font-semibold ${forest.status === "Active" ? "text-green-700" : "text-yellow-600"}`}>{forest.status}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Tag className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">Type:</span>
                      <span className="ml-auto font-semibold text-gray-900">{forest.type}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function MapFlyTo({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 13, { animate: true });
    }
  }, [center, map]);
  return null;
}
