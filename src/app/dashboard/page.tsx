"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Leaf, DollarSign, MapPin, TrendingUp, Trash2 } from "lucide-react";
import BiomassMapBase from "@/components/biomass-map-base";
import { useAuth } from "@/components/auth-context";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { apiGet } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const { data: savedForests, error, isLoading, mutate } = useSWR<any[]>("/api/analysis", apiGet);
  const [selectedForest, setSelectedForest] = useState<any | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth");
    }
  }, [isAuthenticated, router]);
  
  useEffect(() => {
      if (savedForests && savedForests.length > 0 && !selectedForest) {
          setSelectedForest(savedForests[0]);
      }
  }, [savedForests, selectedForest]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm("Are you sure you want to delete this forest?")) return;
      try {
          await fetch(`/api/analysis?id=${id}`, { method: 'DELETE' });
          toast({ title: "Forest deleted" });
          mutate();
          if (selectedForest?.id === id) setSelectedForest(null);
      } catch(e) {
          toast({ title: "Failed to delete", variant: "destructive" });
      }
  }

  if (!isAuthenticated) return null;
  if (isLoading) return <div className="p-8 text-center">Loading forests...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Failed to load data.</div>;
  
  const forests = savedForests || [];

  // Calculate aggregate stats
  const totalCredits = forests.reduce((sum: number, f: any) => sum + (f.stats?.forestBiomassMg ? f.stats.forestBiomassMg / 3.67 : 0), 0);
  const totalArea = forests.reduce((sum: number, f: any) => sum + (f.stats?.forestAreaKm2 || 0), 0);
  // Mock value calculation ($3 per credit)
  const totalValue = totalCredits * 3; 

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Forest Carbon Credit Dashboard</h1>
                <p className="text-gray-600">Monitor your saved forest analyses</p>
            </div>
            <Button onClick={() => router.push('/biomass-only')}>
                + New Analysis
            </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
            <OverviewCard title="Total Carbon Credits" icon={Leaf} value={totalCredits.toLocaleString(undefined, {maximumFractionDigits: 2})} unit="tCO₂e" />
            <OverviewCard title="Total Value" icon={DollarSign} value={`$${totalValue.toLocaleString(undefined, {maximumFractionDigits: 2})}`} unit="USD" />
            <OverviewCard title="Protected Area" icon={MapPin} value={totalArea.toFixed(2)} unit="km²" />
            <OverviewCard title="Active Zones" icon={TrendingUp} value={forests.length} unit="forests" />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map View */}
            <div className="lg:col-span-2 h-[600px] bg-white rounded-lg shadow overflow-hidden border relative">
                {selectedForest ? (
                    <BiomassMapBase 
                        key={selectedForest.id} // Force re-render when forest changes
                        bounds={selectedForest.bounds}
                        mask={selectedForest.mask}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">Select a forest to view</div>
                )}
                {selectedForest && (
                    <div className="absolute top-4 left-4 bg-white/90 p-3 rounded shadow backdrop-blur-sm z-[400] max-w-[300px]">
                        <h3 className="font-bold text-lg truncate">{selectedForest.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{selectedForest.description}</p>
                    </div>
                )}
            </div>

            {/* List & Details */}
            <div className="flex flex-col gap-4 h-[600px]">
                <Card className="flex-1 overflow-hidden flex flex-col">
                    <CardHeader>
                        <CardTitle>Saved Forests</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto space-y-3 p-3 pt-0">
                        {forests.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">No forests saved yet.</div>
                        ) : (
                            forests.map((forest: any) => (
                                <div 
                                    key={forest.id} 
                                    className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-slate-50 ${selectedForest?.id === forest.id ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-200'}`}
                                    onClick={() => setSelectedForest(forest)}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-semibold truncate pr-2">{forest.name}</h4>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-500 shrink-0" onClick={(e) => handleDelete(forest.id, e)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="text-xs text-gray-500 mb-2 line-clamp-1">{forest.description || "No description"}</div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center gap-1">
                                            <Leaf className="h-3 w-3 text-green-500" />
                                            <span>{forest.stats?.forestBiomassMg ? (forest.stats.forestBiomassMg / 3.67).toFixed(1) : 0} tCO₂</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3 text-blue-500" />
                                            <span>{forest.stats?.forestAreaKm2?.toFixed(2)} km²</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
                
                {selectedForest && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Detailed Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                             <div className="flex justify-between">
                                 <span className="text-gray-500">Biomass</span>
                                 <span className="font-mono font-medium">{selectedForest.stats?.forestBiomassMg?.toFixed(2)} Mg</span>
                             </div>
                             <div className="flex justify-between">
                                 <span className="text-gray-500">Coverage</span>
                                 <span className="font-mono font-medium">{selectedForest.stats?.forestCoveragePct?.toFixed(1)}%</span>
                             </div>
                             <div className="flex justify-between">
                                 <span className="text-gray-500">Mean Density</span>
                                 <span className="font-mono font-medium">{selectedForest.stats?.meanBiomassDensity?.toFixed(1)} Mg/ha</span>
                             </div>
                             <div className="pt-2 border-t flex justify-between items-center">
                                 <span className="font-medium">Est. Value</span>
                                 <span className="font-bold text-green-600">
                                     ${((selectedForest.stats?.forestBiomassMg / 3.67) * 3).toLocaleString(undefined, {maximumFractionDigits: 0})}
                                 </span>
                             </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}

function OverviewCard({ title, icon: Icon, value, unit }: any) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{unit}</p>
            </CardContent>
        </Card>
    )
}
