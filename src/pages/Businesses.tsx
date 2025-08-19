import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Store, 
  Star, 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  Users,
  Package,
  TrendingUp,
  Search
} from "lucide-react";
import { Link } from "react-router-dom";

const Businesses = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const businesses = [
    {
      id: 1,
      name: "Tangub Delicacies",
      category: "Food & Beverage",
      rating: 4.8,
      reviews: 325,
      location: "Poblacion",
      image: "/placeholder-business.jpg",
      description: "Authentic Tangub delicacies and local specialties",
      products: 45,
      followers: 1250,
      isVerified: true,
      subscriptionPlan: "Premium",
      openTime: "6:00 AM - 8:00 PM",
      phone: "+63 912 345 6789",
      email: "contact@tangubdelicacies.com",
      featured: true
    },
    {
      id: 2,
      name: "Local Crafts Co.",
      category: "Home & Garden",
      rating: 4.9,
      reviews: 187,
      location: "Maloro",
      image: "/placeholder-crafts.jpg",
      description: "Handmade crafts and traditional Filipino home decor",
      products: 23,
      followers: 890,
      isVerified: true,
      subscriptionPlan: "Standard",
      openTime: "8:00 AM - 6:00 PM",
      phone: "+63 923 456 7890",
      email: "info@localcrafts.ph",
      featured: false
    },
    {
      id: 3,
      name: "Mountain Coffee",
      category: "Food & Beverage",
      rating: 4.7,
      reviews: 403,
      location: "Katipunan",
      image: "/placeholder-coffee.jpg",
      description: "Premium coffee beans from Tangub's mountain regions",
      products: 12,
      followers: 2100,
      isVerified: true,
      subscriptionPlan: "Premium",
      openTime: "5:00 AM - 9:00 PM",
      phone: "+63 934 567 8901",
      email: "hello@mountaincoffee.ph",
      featured: true
    },
    {
      id: 4,
      name: "Bee Happy Farm",
      category: "Food & Beverage",
      rating: 4.6,
      reviews: 156,
      location: "Silabay",
      image: "/placeholder-farm.jpg",
      description: "Pure honey and organic farm products",
      products: 18,
      followers: 675,
      isVerified: false,
      subscriptionPlan: "Basic",
      openTime: "7:00 AM - 5:00 PM",
      phone: "+63 945 678 9012",
      email: "beehappy@gmail.com",
      featured: false
    },
    {
      id: 5,
      name: "Eco Crafts",
      category: "Electronics",
      rating: 4.5,
      reviews: 98,
      location: "Bonga",
      image: "/placeholder-eco.jpg",
      description: "Sustainable and eco-friendly tech accessories",
      products: 35,
      followers: 420,
      isVerified: true,
      subscriptionPlan: "Standard",
      openTime: "9:00 AM - 7:00 PM",
      phone: "+63 956 789 0123",
      email: "contact@ecocrafts.ph",
      featured: false
    },
    {
      id: 6,
      name: "City Pride Apparel",
      category: "Fashion",
      rating: 4.4,
      reviews: 289,
      location: "Poblacion",
      image: "/placeholder-apparel.jpg",
      description: "Tangub-themed clothing and accessories",
      products: 67,
      followers: 1580,
      isVerified: true,
      subscriptionPlan: "Premium",
      openTime: "10:00 AM - 9:00 PM",
      phone: "+63 967 890 1234",
      email: "shop@citypride.ph",
      featured: true
    }
  ];

  const filteredBusinesses = businesses.filter(business =>
    business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    business.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    business.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const featuredBusinesses = filteredBusinesses.filter(b => b.featured);
  const allBusinesses = filteredBusinesses;

  const BusinessCard = ({ business }: { business: any }) => (
    <Card className="overflow-hidden hover:shadow-elegant transition-all duration-300 group">
      <div className="relative">
        <div className="h-48 bg-gradient-primary opacity-20"></div>
        <div className="absolute top-4 left-4">
          {business.isVerified && (
            <Badge className="bg-primary text-primary-foreground">
              ✓ Verified
            </Badge>
          )}
        </div>
        <div className="absolute top-4 right-4">
          <Badge variant="outline" className="bg-background">
            {business.subscriptionPlan}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{business.name}</CardTitle>
            <p className="text-muted-foreground text-sm mb-3">{business.description}</p>
            
            <div className="flex items-center mb-2">
              <div className="flex items-center">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="ml-1 font-medium">{business.rating}</span>
                <span className="text-muted-foreground ml-1">({business.reviews})</span>
              </div>
            </div>

            <div className="flex items-center text-sm text-muted-foreground mb-2">
              <MapPin className="h-4 w-4 mr-2" />
              {business.location}, Tangub City
            </div>

            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-2" />
              {business.openTime}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <Package className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-sm font-medium">{business.products}</p>
            <p className="text-xs text-muted-foreground">Products</p>
          </div>
          <div className="text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-sm font-medium">{business.followers.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-sm font-medium">{business.category}</p>
            <p className="text-xs text-muted-foreground">Category</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button className="flex-1" asChild>
            <Link to={`/business/${business.id}`}>
              <Store className="h-4 w-4 mr-2" />
              Visit Store
            </Link>
          </Button>
          <Button variant="outline" className="flex-1">
            <Phone className="h-4 w-4 mr-2" />
            Contact
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Local Businesses in Tangub City
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover and support local entrepreneurs and businesses in our community
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Search businesses, categories, or locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-3 text-base"
            />
          </div>
        </div>

        {/* Business Tabs */}
        <Tabs defaultValue="featured" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
            <TabsTrigger value="featured">Featured</TabsTrigger>
            <TabsTrigger value="all">All Businesses</TabsTrigger>
          </TabsList>

          <TabsContent value="featured">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredBusinesses.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
            {featuredBusinesses.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No featured businesses found.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allBusinesses.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
            {allBusinesses.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No businesses found matching your search.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <Card className="max-w-2xl mx-auto p-8 bg-gradient-subtle">
            <CardContent className="text-center">
              <Store className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-2xl font-bold mb-4">Start Your Business</h3>
              <p className="text-muted-foreground mb-6">
                Join our growing community of local entrepreneurs and reach customers in Tangub City.
              </p>
              <Button size="lg" asChild>
                <Link to="/register-business">
                  Register Your Business
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Businesses;