"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Leaf, TrendingUp, DollarSign, Bookmark, Eye } from "lucide-react";
import InteractiveMap from "@/components/interactive-map";

// Mock data for Vietnamese mangrove forests
const forestData = [
  {
    id: "zoneA",
    name: "Cần Giờ Mangrove Forest",
    location: "Cần Giờ District, Ho Chi Minh City",
    coordinates: { lat: 10.4167, lng: 106.95 },
    area: 850,
    carbonCredits: 4250,
    creditValue: 12750,
    forestType: "Mangrove",
    status: "Active",
    lastUpdated: "2024-01-15",
    description: "Primary mangrove conservation area with high biodiversity.",
  },
  {
    id: "zoneB",
    name: "Xuân Thủy National Park",
    location: "Giao Thủy District, Nam Định Province",
    coordinates: { lat: 20.2167, lng: 106.5833 },
    area: 750,
    carbonCredits: 3750,
    creditValue: 11250,
    forestType: "Wetland",
    status: "Active",
    lastUpdated: "2024-01-12",
    description: "Vietnam's first Ramsar site, important for migratory birds.",
  },
  {
    id: "zoneC",
    name: "Cúc Phương National Park",
    location: "Nho Quan District, Ninh Bình Province",
    coordinates: { lat: 20.3167, lng: 105.6067 },
    area: 222,
    carbonCredits: 1110,
    creditValue: 3330,
    forestType: "Tropical Evergreen",
    status: "Monitoring",
    lastUpdated: "2024-01-10",
    description: "Vietnam's oldest national park, rich in flora and fauna.",
  },
  {
    id: "zoneD",
    name: "Bạch Mã National Park",
    location: "Phú Lộc District, Thừa Thiên Huế Province",
    coordinates: { lat: 16.2, lng: 107.86 },
    area: 370,
    carbonCredits: 1850,
    creditValue: 5550,
    forestType: "Tropical Montane",
    status: "Active",
    lastUpdated: "2024-01-09",
    description: "Mountainous park with cloud forests and waterfalls.",
  },
  {
    id: "zoneE",
    name: "Yok Đôn National Park",
    location: "Buôn Đôn District, Đắk Lắk Province",
    coordinates: { lat: 12.8, lng: 107.6833 },
    area: 1155,
    carbonCredits: 5775,
    creditValue: 17325,
    forestType: "Dry Dipterocarp",
    status: "Active",
    lastUpdated: "2024-01-08",
    description: "Largest national park in Vietnam, home to elephants and rare birds.",
  },
  {
    id: "zoneF",
    name: "Tràm Chim National Park",
    location: "Tam Nông District, Đồng Tháp Province",
    coordinates: { lat: 10.7, lng: 105.5 },
    area: 758,
    carbonCredits: 3790,
    creditValue: 11370,
    forestType: "Wetland",
    status: "Monitoring",
    lastUpdated: "2024-01-07",
    description: "Wetland reserve, famous for Sarus cranes and aquatic biodiversity.",
  },
  {
    id: "zoneG",
    name: "Ba Vì National Park",
    location: "Ba Vì District, Hanoi",
    coordinates: { lat: 21.07, lng: 105.37 },
    area: 108,
    carbonCredits: 540,
    creditValue: 1620,
    forestType: "Tropical Evergreen",
    status: "Active",
    lastUpdated: "2024-01-06",
    description: "Mountainous park near Hanoi, known for diverse plant species.",
  },
  {
    id: "zoneH",
    name: "Phú Quốc National Park",
    location: "Phú Quốc Island, Kiên Giang Province",
    coordinates: { lat: 10.3, lng: 103.9833 },
    area: 314,
    carbonCredits: 1570,
    creditValue: 4710,
    forestType: "Tropical Evergreen",
    status: "Active",
    lastUpdated: "2024-01-05",
    description: "Island park with tropical forests and rich marine life.",
  },
  {
    id: "zoneI",
    name: "Tam Đảo National Park",
    location: "Tam Đảo District, Vĩnh Phúc Province",
    coordinates: { lat: 21.5, lng: 105.5833 },
    area: 360,
    carbonCredits: 1800,
    creditValue: 5400,
    forestType: "Tropical Montane",
    status: "Active",
    lastUpdated: "2024-01-04",
    description: "Mountainous park with cool climate and rare animal species.",
  },
  {
    id: "zoneJ",
    name: "Đà Lạt Pine Forests",
    location: "Đà Lạt City, Lâm Đồng Province",
    coordinates: { lat: 11.9404, lng: 108.4583 },
    area: 540,
    carbonCredits: 2700,
    creditValue: 8100,
    forestType: "Pine",
    status: "Active",
    lastUpdated: "2024-01-03",
    description: "Highland pine forests, famous for scenic beauty and cool climate.",
  },
];

export default function DashboardPage() {
  const [selectedForest, setSelectedForest] = useState(forestData[0]);

  const totalCredits = forestData.reduce((sum, forest) => sum + forest.carbonCredits, 0);
  const totalValue = forestData.reduce((sum, forest) => sum + forest.creditValue, 0);
  const totalArea = forestData.reduce((sum, forest) => sum + forest.area, 0);

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
              <div className="text-2xl font-bold">{forestData.length}</div>
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
              <CardDescription>{selectedForest.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant={selectedForest.status === "Active" ? "default" : "secondary"}>{selectedForest.status}</Badge>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Area</span>
                  <span className="text-sm">{selectedForest.area} hectares</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Carbon Credits</span>
                  <span className="text-sm font-bold text-green-600">{selectedForest.carbonCredits} tons</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium">Credit Value</span>
                  <span className="text-sm font-bold">${selectedForest.creditValue}</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-4">{selectedForest.description}</p>
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
