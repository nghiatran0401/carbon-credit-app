"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Leaf, MapPin, Shield, CreditCard, Gift, Users } from "lucide-react";

interface CarbonCredit {
  id: number;
  title: string;
  location: string;
  forestType: string;
  credits: number;
  pricePerCredit: number;
  totalPrice: number;
  vintage: string;
  certification: string;
  description: string;
  features: string[];
  available: number;
  image: string;
  avatar: string;
}

interface CartItem extends CarbonCredit {
  quantity: number;
  subtotal: number;
}

// Mock marketplace data
const carbonCredits = [
  {
    id: 1,
    title: "Cần Giờ Mangrove Forest Credits",
    location: "Cần Giờ, Ho Chi Minh City, Vietnam",
    forestType: "Mangrove",
    credits: 4250,
    pricePerCredit: 3.0,
    totalPrice: 12750,
    vintage: "2024",
    certification: "VCS (Verified Carbon Standard)",
    description: "Primary mangrove conservation area with high biodiversity.",
    features: ["Biodiversity Protection", "Coastal Defense", "Community Benefits"],
    available: 4250,
    image: "/placeholder.svg?height=200&width=300",
    avatar: "🏝️",
  },
  {
    id: 2,
    title: "Xuân Thủy National Park Credits",
    location: "Nam Định, Vietnam",
    forestType: "Wetland",
    credits: 3750,
    pricePerCredit: 3.0,
    totalPrice: 11250,
    vintage: "2024",
    certification: "VCS",
    description: "Vietnam's first Ramsar site, important for migratory birds.",
    features: ["Wetland Conservation", "Migratory Birds", "Community Benefits"],
    available: 3750,
    image: "/placeholder.svg?height=200&width=300",
    avatar: "🐦",
  },
  {
    id: 3,
    title: "Cúc Phương National Park Credits",
    location: "Ninh Bình, Vietnam",
    forestType: "Tropical",
    credits: 1110,
    pricePerCredit: 3.0,
    totalPrice: 3330,
    vintage: "2024",
    certification: "VCS",
    description: "Vietnam's oldest national park, rich in flora and fauna.",
    features: ["Biodiversity", "Research", "Tourism"],
    available: 1110,
    image: "/placeholder.svg?height=200&width=300",
    avatar: "🐒",
  },
  {
    id: 4,
    title: "Bạch Mã National Park Credits",
    location: "Thừa Thiên Huế, Vietnam",
    forestType: "Mountain",
    credits: 1850,
    pricePerCredit: 3.0,
    totalPrice: 5550,
    vintage: "2024",
    certification: "VCS",
    description: "Mountainous park with cloud forests and waterfalls.",
    features: ["Cloud Forest", "Waterfalls", "Wildlife"],
    available: 1850,
    image: "/placeholder.svg?height=200&width=300",
    avatar: "🏔️",
  },
  {
    id: 5,
    title: "Yok Đôn National Park Credits",
    location: "Đắk Lắk, Vietnam",
    forestType: "Dry Forest",
    credits: 5775,
    pricePerCredit: 3.0,
    totalPrice: 17325,
    vintage: "2024",
    certification: "VCS",
    description: "Largest national park in Vietnam, home to elephants and rare birds.",
    features: ["Elephants", "Birds", "Conservation"],
    available: 5775,
    image: "/placeholder.svg?height=200&width=300",
    avatar: "🐘",
  },
  {
    id: 6,
    title: "Tràm Chim National Park Credits",
    location: "Đồng Tháp, Vietnam",
    forestType: "Wetland",
    credits: 3790,
    pricePerCredit: 3.0,
    totalPrice: 11370,
    vintage: "2024",
    certification: "VCS",
    description: "Wetland reserve, famous for Sarus cranes and aquatic biodiversity.",
    features: ["Wetland", "Cranes", "Aquatic Biodiversity"],
    available: 3790,
    image: "/placeholder.svg?height=200&width=300",
    avatar: "🦩",
  },
  {
    id: 7,
    title: "Ba Vì National Park Credits",
    location: "Hà Nội, Vietnam",
    forestType: "Mountain",
    credits: 540,
    pricePerCredit: 3.0,
    totalPrice: 1620,
    vintage: "2024",
    certification: "VCS",
    description: "Mountainous park near Hanoi, known for diverse plant species.",
    features: ["Plant Diversity", "Tourism", "Conservation"],
    available: 540,
    image: "/placeholder.svg?height=200&width=300",
    avatar: "🏞️",
  },
  {
    id: 8,
    title: "Phú Quốc National Park Credits",
    location: "Phú Quốc, Vietnam",
    forestType: "Island",
    credits: 1570,
    pricePerCredit: 3.0,
    totalPrice: 4710,
    vintage: "2024",
    certification: "VCS",
    description: "Island park with tropical forests and rich marine life.",
    features: ["Marine Life", "Tropical Forest", "Tourism"],
    available: 1570,
    image: "/placeholder.svg?height=200&width=300",
    avatar: "🌴",
  },
  {
    id: 9,
    title: "Tam Đảo National Park Credits",
    location: "Vĩnh Phúc, Vietnam",
    forestType: "Mountain",
    credits: 1800,
    pricePerCredit: 3.0,
    totalPrice: 5400,
    vintage: "2024",
    certification: "VCS",
    description: "Mountainous park with cool climate and rare animal species.",
    features: ["Cool Climate", "Rare Species", "Tourism"],
    available: 1800,
    image: "/placeholder.svg?height=200&width=300",
    avatar: "🏔️",
  },
  {
    id: 10,
    title: "Đà Lạt Pine Forests Credits",
    location: "Lâm Đồng, Vietnam",
    forestType: "Pine",
    credits: 2700,
    pricePerCredit: 3.0,
    totalPrice: 8100,
    vintage: "2024",
    certification: "VCS",
    description: "Highland pine forests, famous for scenic beauty and cool climate.",
    features: ["Pine Forest", "Scenic Beauty", "Cool Climate"],
    available: 2700,
    image: "/placeholder.svg?height=200&width=300",
    avatar: "🌲",
  },
];

export default function MarketplacePage() {
  const [selectedCredit, setSelectedCredit] = useState<CarbonCredit | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  // Add filter state
  const [forestType, setForestType] = useState("all");
  const [certification, setCertification] = useState("all");
  const [sortBy, setSortBy] = useState("price-low");
  // Dialog open state
  const [dialogOpen, setDialogOpen] = useState(false);

  const addToCart = (credit: CarbonCredit, quantity: number) => {
    const cartItem: CartItem = {
      ...credit,
      quantity,
      subtotal: credit.pricePerCredit * quantity,
    };
    setCart([...cart, cartItem]);
  };

  const getTotalCartValue = () => {
    return cart.reduce((total, item) => total + item.subtotal, 0);
  };

  // Filter and sort logic
  let filteredCredits = carbonCredits.filter((credit) => {
    // Forest type filter
    const forestMatch = forestType === "all" || credit.forestType.toLowerCase().replace(" ", "").includes(forestType);
    // Certification filter (handle both "VCS" and "VCS (Verified Carbon Standard)")
    const certMatch = certification === "all" || credit.certification.toLowerCase().includes(certification.replace("-", " "));
    return forestMatch && certMatch;
  });

  if (sortBy === "price-low") {
    filteredCredits.sort((a, b) => a.pricePerCredit - b.pricePerCredit);
  } else if (sortBy === "price-high") {
    filteredCredits.sort((a, b) => b.pricePerCredit - a.pricePerCredit);
  } else if (sortBy === "quantity") {
    filteredCredits.sort((a, b) => b.available - a.available);
  } else if (sortBy === "vintage") {
    filteredCredits.sort((a, b) => b.vintage.localeCompare(a.vintage));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Carbon Credit Marketplace</h1>
          <p className="text-gray-600">Purchase verified carbon credits from Cần Giờ mangrove forests</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Select value={forestType} onValueChange={setForestType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Forest Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="mangrove">Mangrove</SelectItem>
              <SelectItem value="tropical">Tropical</SelectItem>
              <SelectItem value="temperate">Temperate</SelectItem>
              <SelectItem value="wetland">Wetland</SelectItem>
              <SelectItem value="mountain">Mountain</SelectItem>
              <SelectItem value="dry">Dry Forest</SelectItem>
              <SelectItem value="island">Island</SelectItem>
              <SelectItem value="pine">Pine</SelectItem>
            </SelectContent>
          </Select>

          <Select value={certification} onValueChange={setCertification}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Certification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Certifications</SelectItem>
              <SelectItem value="vcs">VCS</SelectItem>
              <SelectItem value="gold">Gold Standard</SelectItem>
              <SelectItem value="ccb">CCB</SelectItem>
              <SelectItem value="vcs (verified carbon standard)">VCS (Verified Carbon Standard)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="quantity">Available Quantity</SelectItem>
              <SelectItem value="vintage">Vintage Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Credit Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredCredits.map((credit) => (
            <Card key={credit.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-green-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-8xl">{credit.avatar}</div>
                </div>
              </div>

              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{credit.title}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {credit.location}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{credit.vintage}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Price per credit</span>
                  <span className="text-lg font-bold text-green-600">${credit.pricePerCredit}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Available</span>
                  <span className="text-sm font-medium">{credit.available.toLocaleString()} credits</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-600">{credit.certification}</span>
                </div>

                <div className="space-y-2">
                  {credit.features.map((feature, index) => (
                    <Badge key={index} variant="outline" className="mr-2 mb-1">
                      {feature}
                    </Badge>
                  ))}
                </div>

                <Separator />

                <Dialog
                  open={dialogOpen}
                  onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) {
                      setSelectedCredit(null);
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedCredit(credit);
                        setPurchaseQuantity(1);
                        setDialogOpen(true);
                      }}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Purchase Credits
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Purchase Carbon Credits</DialogTitle>
                      <DialogDescription>{selectedCredit?.title}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="quantity">Quantity (credits)</Label>
                        <Input id="quantity" type="number" value={purchaseQuantity} onChange={(e) => setPurchaseQuantity(Number.parseInt(e.target.value) || 1)} min="1" max={selectedCredit?.available} />
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span>Price per credit:</span>
                          <span>${selectedCredit?.pricePerCredit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Quantity:</span>
                          <span>{purchaseQuantity} credits</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span>${((selectedCredit?.pricePerCredit || 0) * purchaseQuantity).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600">
                        <p className="mb-2">✓ Verified carbon credits</p>
                        <p className="mb-2">✓ Certificate of purchase included</p>
                        <p>✓ Funds support forest conservation</p>
                      </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        disabled={!selectedCredit || purchaseQuantity < 1 || purchaseQuantity > (selectedCredit?.available || 0)}
                        onClick={() => {
                          if (selectedCredit && purchaseQuantity > 0 && purchaseQuantity <= (selectedCredit.available || 0)) {
                            addToCart(selectedCredit, purchaseQuantity);
                            setDialogOpen(false);
                            setSelectedCredit(null);
                          }
                        }}
                      >
                        Add to Cart
                      </Button>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Buy Now
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Shopping Cart Summary */}
        {cart.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Shopping Cart ({cart.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cart.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity} credits × ${item.pricePerCredit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${item.subtotal.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>${getTotalCartValue().toFixed(2)}</span>
                </div>
                <Button variant="outline" className="w-full" size="lg">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Proceed to Checkout
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>Why Choose Our Carbon Credits?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Verified & Certified</h3>
                <p className="text-sm text-gray-600">All credits are verified by international standards (VCS, Gold Standard)</p>
              </div>
              <div className="text-center">
                <Leaf className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Real Impact</h3>
                <p className="text-sm text-gray-600">Direct support for mangrove conservation and biodiversity protection</p>
              </div>
              <div className="text-center">
                <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Community Benefits</h3>
                <p className="text-sm text-gray-600">Supporting local communities and sustainable livelihoods</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
