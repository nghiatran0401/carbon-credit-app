"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Leaf, DollarSign, Users, Globe, Download, Calendar } from "lucide-react";

const analyticsData = {
  overview: {
    totalCredits: 15680,
    totalValue: 47040,
    activeProjects: 3,
    partnersCount: 23,
    monthlyGrowth: 12.5,
    revenueGrowth: 18.3,
  },
  monthlyData: [
    { month: "Jan", credits: 1200, revenue: 3600, partners: 18 },
    { month: "Feb", credits: 1450, revenue: 4350, partners: 19 },
    { month: "Mar", credits: 1680, revenue: 5040, partners: 20 },
    { month: "Apr", credits: 1920, revenue: 5760, partners: 21 },
    { month: "May", credits: 2100, revenue: 6300, partners: 22 },
    { month: "Jun", credits: 2380, revenue: 7140, partners: 23 },
  ],
  topPartners: [
    { name: "Green Energy Corp", credits: 2500, value: 7500, country: "Singapore" },
    { name: "Sustainable Solutions Ltd", credits: 1800, value: 5400, country: "Malaysia" },
    { name: "EcoTech Industries", credits: 1200, value: 3600, country: "Thailand" },
    { name: "Carbon Neutral Co", credits: 950, value: 2850, country: "Philippines" },
    { name: "Climate Action Group", credits: 800, value: 2400, country: "Indonesia" },
  ],
};

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive insights into carbon credit performance and market trends</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Credits Sold</CardTitle>
              <Leaf className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.overview.totalCredits.toLocaleString()}</div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />+{analyticsData.overview.monthlyGrowth}% from last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analyticsData.overview.totalValue.toLocaleString()}</div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />+{analyticsData.overview.revenueGrowth}% from last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Partners</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.overview.partnersCount}</div>
              <div className="flex items-center text-xs text-blue-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                +5 new this month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Globe className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.overview.activeProjects}</div>
              <div className="flex items-center text-xs text-gray-500">Cần Giờ Zones A, B, C</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales">Sales Performance</TabsTrigger>
            <TabsTrigger value="partners">Partner Analysis</TabsTrigger>
            <TabsTrigger value="environmental">Environmental Impact</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Performance</CardTitle>
                  <CardDescription>Credits sold and revenue over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 text-green-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">Performance Chart</p>
                      <p className="text-sm text-gray-500 mt-2">Monthly credits and revenue trends</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Geographic Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Geographic Distribution</CardTitle>
                  <CardDescription>Partner companies by region</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Southeast Asia</span>
                      </div>
                      <div className="text-sm font-medium">65%</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm">East Asia</span>
                      </div>
                      <div className="text-sm font-medium">20%</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-sm">Europe</span>
                      </div>
                      <div className="text-sm font-medium">10%</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-sm">North America</span>
                      </div>
                      <div className="text-sm font-medium">5%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest transactions and milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg">
                    <div className="bg-green-100 p-2 rounded-full">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Large Purchase Completed</p>
                      <p className="text-sm text-gray-600">Green Energy Corp purchased 500 credits - $1,500</p>
                    </div>
                    <Badge variant="secondary">2 hours ago</Badge>
                  </div>

                  <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">New Partner Onboarded</p>
                      <p className="text-sm text-gray-600">Climate Action Group joined the platform</p>
                    </div>
                    <Badge variant="secondary">1 day ago</Badge>
                  </div>

                  <div className="flex items-center space-x-4 p-4 bg-purple-50 rounded-lg">
                    <div className="bg-purple-100 p-2 rounded-full">
                      <Leaf className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">New Credits Generated</p>
                      <p className="text-sm text-gray-600">Zone C generated 150 new carbon credits</p>
                    </div>
                    <Badge variant="secondary">3 days ago</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="partners" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Partners</CardTitle>
                <CardDescription>Companies with highest carbon credit purchases</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.topPartners.map((partner, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="bg-green-100 w-10 h-10 rounded-full flex items-center justify-center">
                          <span className="font-bold text-green-600">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{partner.name}</p>
                          <p className="text-sm text-gray-600">{partner.country}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{partner.credits} credits</p>
                        <p className="text-sm text-gray-600">${partner.value.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="environmental" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Environmental Impact</CardTitle>
                  <CardDescription>CO₂ sequestration and forest health metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total CO₂ Sequestered</span>
                    <span className="font-bold text-green-600">15,680 tons</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Forest Area Protected</span>
                    <span className="font-bold">2,450 hectares</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Biodiversity Index</span>
                    <span className="font-bold text-blue-600">87%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Water Quality Score</span>
                    <span className="font-bold text-cyan-600">91%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Community Impact</CardTitle>
                  <CardDescription>Local community benefits and engagement</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Local Jobs Created</span>
                    <span className="font-bold text-purple-600">156 jobs</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Families Supported</span>
                    <span className="font-bold">89 families</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Community Investment</span>
                    <span className="font-bold text-orange-600">$23,500</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Education Programs</span>
                    <span className="font-bold">12 programs</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
