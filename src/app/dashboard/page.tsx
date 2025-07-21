"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Leaf, TrendingUp, DollarSign, Bookmark, Eye } from "lucide-react";
import InteractiveMap from "@/components/interactive-map";
import { useAuth } from "@/components/auth-context";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import useSWR from "swr";

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const fetcher = (url: string) => apiGet<any[]>(url);
  const { data: forests, error, isLoading, mutate } = useSWR("/api/forests", fetcher);
  const [selectedForest, setSelectedForest] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<any>({ name: "", location: "", type: "", area: "", description: "", status: "Active", lastUpdated: new Date().toISOString().slice(0, 10) });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }
    if (forests && forests.length && !selectedForest) {
      setSelectedForest(forests[0]);
    }
  }, [isAuthenticated, router, forests, selectedForest]);

  if (!isAuthenticated) return null;
  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error.message}</div>;
  if (!forests?.length) return <div className="p-8 text-center">No forest data available.</div>;

  const totalCredits = forests.reduce((sum, forest) => sum + (forest.credits?.reduce((cSum: number, c: any) => cSum + c.totalCredits, 0) || 0), 0);
  const totalValue = forests.reduce((sum, forest) => sum + (forest.credits?.reduce((cSum: number, c: any) => cSum + c.totalCredits * c.pricePerCredit, 0) || 0), 0);
  const totalArea = forests.reduce((sum, forest) => sum + (forest.area || 0), 0);

  // Remove all forest CRUD UI (modals, forms, edit/delete buttons, etc.) from the dashboard page. Only show analytics/overview and selected forest details.

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Forest Carbon Credit Dashboard</h1>
          <p className="text-gray-600">Monitor and manage carbon credits from Cần Giờ mangrove forests</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Carbon Credits</CardTitle>
              <Leaf className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCredits.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">tons CO₂ equivalent</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">USD at $3/credit</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Protected Area</CardTitle>
              <MapPin className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalArea.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">hectares</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Zones</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{forests.length}</div>
              <p className="text-xs text-muted-foreground">monitoring locations</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive Map */}
          <div className="lg:col-span-2">
            <InteractiveMap onZoneSelect={setSelectedForest} selectedZone={selectedForest?.id} />
          </div>

          {/* Forest Details */}
          <Card>
            <CardHeader>
              <CardTitle>Selected Zone Details</CardTitle>
              <CardDescription>{selectedForest?.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant={selectedForest?.status === "Active" ? "default" : "secondary"}>{selectedForest?.status}</Badge>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Area</span>
                  <span className="text-sm">{selectedForest?.area} hectares</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Carbon Credits</span>
                  <span className="text-sm font-bold text-green-600">{selectedForest?.carbonCredits} tons</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium">Credit Value</span>
                  <span className="text-sm font-bold">${selectedForest?.creditValue}</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-4">{selectedForest?.description}</p>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button size="sm" variant="outline">
                    <Bookmark className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
