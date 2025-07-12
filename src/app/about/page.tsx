import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Leaf, Globe, Users, Target, Heart, Lightbulb } from "lucide-react";
import Link from "next/link";

const teamMembers = [
  {
    name: "Dr. Nguyen Minh Duc",
    role: "Founder & CEO",
    expertise: "Environmental Science, Carbon Markets",
    description: "15+ years in environmental conservation and carbon credit development",
  },
  {
    name: "Sarah Chen",
    role: "CTO",
    expertise: "Software Engineering, GIS Technology",
    description: "Former Google engineer specializing in environmental tech solutions",
  },
  {
    name: "Dr. Tran Van Hai",
    role: "Chief Science Officer",
    expertise: "Marine Biology, Mangrove Ecosystems",
    description: "Leading researcher in Southeast Asian mangrove conservation",
  },
  {
    name: "Maria Rodriguez",
    role: "Head of Partnerships",
    expertise: "Corporate Sustainability, International Relations",
    description: "Expert in connecting corporations with environmental impact projects",
  },
];

const milestones = [
  {
    year: "2023",
    title: "Project Inception",
    description: "Founded with focus on Cần Giờ mangrove forests",
  },
  {
    year: "2024",
    title: "First Credits Issued",
    description: "Successfully issued first 10,000 verified carbon credits",
  },
  {
    year: "2024",
    title: "Platform Launch",
    description: "Launched digital marketplace for carbon credit trading",
  },
  {
    year: "2025",
    title: "Regional Expansion",
    description: "Expanding to other Vietnamese coastal regions",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-green-100 text-green-800">About EcoCredit</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Connecting Forests with the Future</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We&apos;re pioneering the digital transformation of carbon credit trading, starting with Vietnam&apos;s precious mangrove forests and scaling globally to combat climate change.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <Card>
            <CardHeader>
              <Target className="h-10 w-10 text-green-600 mb-4" />
              <CardTitle>Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                To democratize access to verified carbon credits while supporting forest conservation and local communities. We bridge the gap between environmental impact and economic opportunity through innovative
                technology.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Lightbulb className="h-10 w-10 text-blue-600 mb-4" />
              <CardTitle>Our Vision</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                A world where every forest, from Vietnam&apos;s mangroves to global woodlands, contributes to climate action through transparent, accessible carbon credit markets that benefit both planet and people.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Core Values */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Leaf className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Environmental Integrity</h3>
              <p className="text-gray-600">Every credit represents real, verified carbon sequestration with measurable environmental impact.</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Global Accessibility</h3>
              <p className="text-gray-600">Making carbon credits accessible to companies worldwide through digital innovation.</p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Community Impact</h3>
              <p className="text-gray-600">Supporting local communities and creating sustainable livelihoods through conservation.</p>
            </div>
          </div>
        </div>

        {/* Our Story */}
        <Card className="mb-16">
          <CardHeader>
            <CardTitle className="text-2xl">Our Story</CardTitle>
            <CardDescription>From Cần Giờ to Global Impact</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              EcoCredit was born from a simple observation: Vietnam&apos;s mangrove forests in Cần Giờ were capturing massive amounts of carbon, but there was no efficient way to monetize this environmental service. Our
              founders, combining expertise in environmental science and technology, saw an opportunity to create a digital platform that could accurately calculate, verify, and trade carbon credits from these vital
              ecosystems.
            </p>
            <p className="text-gray-600">
              Starting with detailed mapping and monitoring of Cần Giờ&apos;s 2,450 hectares of mangrove forests, we developed proprietary algorithms to calculate carbon sequestration rates. Our platform now enables
              companies worldwide to purchase verified carbon credits, directly supporting forest conservation and local communities.
            </p>
            <p className="text-gray-600">
              What began as a local initiative has evolved into a scalable platform designed for global expansion. We&apos;re not just trading carbon credits – we&apos;re building a sustainable future where environmental
              conservation becomes economically viable for communities worldwide.
            </p>
          </CardContent>
        </Card>

        {/* Timeline */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Our Journey</h2>
          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold">{milestone.year.slice(-2)}</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{milestone.title}</h3>
                  <p className="text-gray-600">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Meet Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {teamMembers.map((member, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start space-x-4">
                    <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle>{member.name}</CardTitle>
                      <CardDescription>{member.role}</CardDescription>
                      <Badge variant="outline" className="mt-2">
                        {member.expertise}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{member.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Impact Stats */}
        <Card className="mb-16 bg-green-600 text-white">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">Our Impact So Far</CardTitle>
            <CardDescription className="text-green-100">Making a difference in Vietnam and beyond</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold mb-2">2,450</div>
                <div className="text-green-100">Hectares Protected</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">15,680</div>
                <div className="text-green-100">Tons CO₂ Captured</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">23</div>
                <div className="text-green-100">Partner Companies</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">156</div>
                <div className="text-green-100">Local Jobs Created</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Join Our Mission</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Whether you&apos;re a company looking to offset your carbon footprint or an investor interested in environmental impact, we&apos;d love to work with you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="outline" asChild>
              <Link href="/marketplace">Start Trading Credits</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
