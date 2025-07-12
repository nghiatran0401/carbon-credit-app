import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, Globe, TrendingUp, Shield, Users, MapPin } from "lucide-react";
import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge className="mb-4 bg-green-100 text-green-800 hover:bg-green-200">Starting with Cần Giờ Mangrove Forests, Vietnam</Badge>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Trade Forest-Generated
          <span className="text-green-600 block">Carbon Credits</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Connect companies with verified forest carbon credits from mangrove forests in Vietnam. Scale your environmental impact while supporting global reforestation efforts.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" variant="outline" asChild>
            <Link href="/marketplace">Explore Credits</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/dashboard">View Dashboard</Link>
          </Button>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-green-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold mb-2">2,450</div>
              <div className="text-green-100">Hectares Protected</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">15,680</div>
              <div className="text-green-100">Tons CO₂ Captured</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">$47,040</div>
              <div className="text-green-100">Credits Value</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">23</div>
              <div className="text-green-100">Partner Companies</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Comprehensive Carbon Credit Platform</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">From forest monitoring to credit trading, we provide end-to-end solutions for carbon credit management.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <MapPin className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Interactive Forest Mapping</CardTitle>
              <CardDescription>Real-time visualization of forest locations with carbon credit data and metrics</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <TrendingUp className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Real-time Credit Calculation</CardTitle>
              <CardDescription>Advanced algorithms calculate carbon credits based on forest type, age, and health</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Verified Transactions</CardTitle>
              <CardDescription>Secure payment processing with certificate issuance for all purchases</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Globe className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Global Scalability</CardTitle>
              <CardDescription>Platform designed to expand from Vietnam to Southeast Asia and globally</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Users className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>P2P Trading</CardTitle>
              <CardDescription>Future peer-to-peer carbon credit exchange with governance mechanisms</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Leaf className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Impact Transparency</CardTitle>
              <CardDescription>Track how funds are reinvested in conservation and eco-tourism projects</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Ready to Make an Impact?</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">Join companies worldwide in supporting forest conservation through verified carbon credit trading.</p>
          <Button size="lg" variant="outline" asChild>
            <Link href="/auth">Start Trading Credits</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
