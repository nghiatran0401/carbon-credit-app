"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Leaf, TrendingUp, DollarSign, Bookmark, Eye, Bookmark as BookmarkIcon, BookmarkCheck, Ruler, ShieldCheck, Tag, TreeDeciduous } from "lucide-react";
import InteractiveMap from "@/components/interactive-map";
import { useAuth } from "@/components/auth-context";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import useSWR from "swr";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { remove as removeDiacritics } from "diacritics";

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const fetcher = (url: string) => apiGet<any[]>(url);
  const { data: forests, error, isLoading, mutate } = useSWR("/api/forests", fetcher);
  const { data: bookmarksRaw, mutate: mutateBookmarks } = useSWR(user?.id ? `/api/bookmarks?userId=${user.id}` : null, apiGet);
  const bookmarks = Array.isArray(bookmarksRaw) ? bookmarksRaw : [];
  const [selectedForest, setSelectedForest] = useState<any | null>(null);
  const [showForestInfo, setShowForestInfo] = useState(false);
  // const [tab, setTab] = useState("all"); // Removed as per edit hint

  // Helper to check if a forest is bookmarked
  const isBookmarked = (forestId: number) => bookmarks.some((b: any) => b.forestId === forestId || b.forest?.id === forestId);
  // Helper to get the correct forest ID
  const getForestId = (forest: any) => {
    if (!forest) return null;
    if (typeof forest.id === "number") return forest.id;
    if (typeof forest.forestId === "number") return forest.forestId;
    if (forest.forest && typeof forest.forest.id === "number") return forest.forest.id;
    return null;
  };
  const forestsSafe = forests || [];
  // const filteredForests = tab === "favorites" ? forestsSafe.filter((f: any) => isBookmarked(f.id)) : forestsSafe; // Removed as per edit hint

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }
    if (forestsSafe.length && !selectedForest) {
      setSelectedForest(forestsSafe[0]);
    }
  }, [isAuthenticated, router, forestsSafe, selectedForest]);

  // When tab changes, update selectedForest to the first in filteredForests // Removed as per edit hint
  // useEffect(() => {
  //   if (filteredForests.length && (!selectedForest || !filteredForests.some((f: any) => f.id === selectedForest.id))) {
  //     setSelectedForest(filteredForests[0]);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [tab, bookmarksRaw, forestsSafe]);

  if (!isAuthenticated) return null;
  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error.message}</div>;
  if (!forestsSafe?.length) return <div className="p-8 text-center">No forest data available.</div>;

  const totalCredits = forestsSafe.reduce((sum, forest) => sum + (forest.credits?.reduce((cSum: number, c: any) => cSum + c.totalCredits, 0) || 0), 0);
  const totalValue = forestsSafe.reduce((sum, forest) => sum + (forest.credits?.reduce((cSum: number, c: any) => cSum + c.totalCredits * c.pricePerCredit, 0) || 0), 0);
  const totalArea = forestsSafe.reduce((sum, forest) => sum + (forest.area || 0), 0);

  // Add/remove bookmark handlers
  const handleBookmark = async (forestId: number | null) => {
    if (!user?.id || !forestId) return;
    if (isBookmarked(forestId)) {
      await apiDelete("/api/bookmarks", { userId: user.id, forestId });
      toast({ title: "Removed from favorites" });
    } else {
      await apiPost("/api/bookmarks", { userId: user.id, forestId });
      toast({ title: "Added to favorites", description: "You can view all your favorites in the 'Favorites' tab." });
    }
    mutateBookmarks();
  };

  const normalize = (str: string) =>
    removeDiacritics(str || "")
      .toLowerCase()
      .replace(/\s+/g, "");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Forest Carbon Credit Dashboard</h1>
          <p className="text-gray-600">Monitor and manage carbon credits from Cần Giờ mangrove forests</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
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
              <div className="text-2xl font-bold">{forestsSafe.length}</div>
              <p className="text-xs text-muted-foreground">monitoring locations</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {/* Only show main content if not viewing forest info */}
        {!showForestInfo && (
          <>
            {/* <Tabs value={tab} onValueChange={setTab} className="mb-4">
              <TabsList>
                <TabsTrigger value="all">All Forests</TabsTrigger>
                <TabsTrigger value="favorites">Favorites</TabsTrigger>
              </TabsList>
            </Tabs> */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Interactive Map */}
              <div className="lg:col-span-2">
                <InteractiveMap forests={forestsSafe} bookmarks={bookmarks} selectedForest={selectedForest} onSelectForest={setSelectedForest} />
              </div>

              {/* Forest List Under the Map */}
              {/* <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredForests.map((forest: any) => (
                  <Card key={forest.id} className={`cursor-pointer transition-shadow ${selectedForest?.id === forest.id ? "ring-2 ring-green-500" : ""}`} onClick={() => setSelectedForest(forest)}>
                    <CardHeader>
                      <CardTitle className="text-lg">{forest.name}</CardTitle>
                      <CardDescription>{forest.location}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Area</span>
                        <span className="text-sm">{forest.area} ha</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Status</span>
                        <span className="text-sm">{forest.status}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Type</span>
                        <span className="text-sm">{forest.type}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div> */}

              {/* Forest Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TreeDeciduous className="h-6 w-6 text-green-600" />
                    Selected Zone Details
                  </CardTitle>
                  <CardDescription className="text-lg font-bold text-gray-900">{selectedForest?.name}</CardDescription>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <MapPin className="h-3 w-3 mr-1" /> {selectedForest?.location}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex flex-col gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Ruler className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Area:</span>
                      <span className="ml-auto font-semibold text-gray-900">{selectedForest?.area} ha</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-700">
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Status:</span>
                      <span className={`ml-auto font-semibold ${selectedForest?.status === "Active" ? "text-green-700" : "text-yellow-600"}`}>{selectedForest?.status}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Tag className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">Type:</span>
                      <span className="ml-auto font-semibold text-gray-900">{selectedForest?.type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Leaf className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Carbon Credits:</span>
                      <span className="ml-auto font-bold text-green-700">
                        {selectedForest?.carbonCredits || (Array.isArray(selectedForest?.credits) ? selectedForest.credits.reduce((sum: number, c: any) => sum + (c.totalCredits || 0), 0) : 0)} tCO₂
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <DollarSign className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">Credit Value:</span>
                      <span className="ml-auto font-bold text-yellow-700">
                        $
                        {selectedForest?.creditValue ||
                          (Array.isArray(selectedForest?.credits) ? selectedForest.credits.reduce((sum: number, c: any) => sum + (c.totalCredits || 0) * (c.pricePerCredit || 0), 0).toLocaleString() : 0)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-4">{selectedForest?.description}</p>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowForestInfo(true)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button size="sm" variant={isBookmarked(getForestId(selectedForest)) ? "default" : "outline"} onClick={() => handleBookmark(getForestId(selectedForest))} disabled={!getForestId(selectedForest)}>
                        {isBookmarked(getForestId(selectedForest)) ? <BookmarkCheck className="h-4 w-4" /> : <BookmarkIcon className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Forest Info Modal - now acts as a standalone popup */}
        <Dialog open={showForestInfo} onOpenChange={setShowForestInfo}>
          <DialogContent className="max-w-lg z-[2000]">
            <DialogHeader>
              <DialogTitle>Forest Information</DialogTitle>
            </DialogHeader>
            {selectedForest && (
              <div className="space-y-2">
                <div className="font-bold text-lg">{selectedForest.name}</div>
                <div className="text-sm text-gray-600">{selectedForest.location}</div>
                <div>
                  Type: <span className="font-medium">{selectedForest.type}</span>
                </div>
                <div>
                  Area: <span className="font-medium">{selectedForest.area} hectares</span>
                </div>
                <div>
                  Status: <span className="font-medium">{selectedForest.status}</span>
                </div>
                <div>
                  Last Updated: <span className="font-medium">{selectedForest.lastUpdated ? new Date(selectedForest.lastUpdated).toLocaleDateString() : "N/A"}</span>
                </div>
                <div>
                  Description: <span className="font-medium">{selectedForest.description}</span>
                </div>
                <div className="pt-2">
                  <div className="font-semibold mb-1">Credits:</div>
                  <ul className="list-disc pl-5 text-sm">
                    {(Array.isArray(selectedForest.credits) ? selectedForest.credits : []).map((credit: any) => (
                      <li key={credit.id}>
                        {credit.vintage} - {credit.certification}: {credit.totalCredits} total, {credit.availableCredits} available, ${credit.pricePerCredit}/credit
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
