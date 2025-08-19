import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles, Search, Star, MapPin, Store, Users, Package, TrendingUp, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const featuredProducts = [
    {
      id: 1,
      name: "Fresh Buko Pie",
      price: 250,
      originalPrice: 300,
      rating: 4.8,
      business: "Tangub Delicacies",
      location: "Poblacion",
      discount: 17
    },
    {
      id: 2,
      name: "Tangub Coffee Beans",
      price: 380,
      rating: 4.7,
      business: "Mountain Coffee",
      location: "Katipunan"
    },
    {
      id: 3,
      name: "Handwoven Banig Mat",
      price: 450,
      rating: 4.9,
      business: "Local Crafts Co.",
      location: "Maloro"
    }
  ];

  const featuredBusinesses = [
    {
      name: "Tangub Delicacies",
      category: "Food & Beverage",
      rating: 4.8,
      products: 45,
      location: "Poblacion"
    },
    {
      name: "Mountain Coffee", 
      category: "Food & Beverage",
      rating: 4.7,
      products: 12,
      location: "Katipunan"
    },
    {
      name: "Local Crafts Co.",
      category: "Home & Garden",
      rating: 4.9,
      products: 23,
      location: "Maloro"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="container mx-auto px-6 py-16 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <Badge variant="secondary" className="text-primary font-medium px-4 py-2">
                <MapPin className="h-4 w-4 mr-2" />
                Tangub City Local Marketplace
              </Badge>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent leading-tight">
              Tangub Shop Easy
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Support local businesses and discover amazing products right here in Tangub City. From fresh delicacies to handmade crafts.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  placeholder="Search for products, businesses..."
                  className="pl-12 py-4 text-base rounded-full"
                />
                <Button className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full">
                  Search
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 py-4 shadow-elegant hover:shadow-glow transition-all" asChild>
                <Link to="/products">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Shop Now
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4" asChild>
                <Link to="/businesses">
                  <Store className="mr-2 h-5 w-5" />
                  Browse Businesses
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Products</h2>
            <p className="text-xl text-muted-foreground">
              Discover the best products from local businesses in Tangub City
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-8">
            {featuredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-elegant transition-all duration-300 group">
                <div className="relative">
                  <div className="aspect-square bg-gradient-primary opacity-20 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-medium text-primary">{product.name}</span>
                    </div>
                  </div>
                  {product.discount && (
                    <Badge variant="destructive" className="absolute top-2 right-2">
                      -{product.discount}%
                    </Badge>
                  )}
                </div>

                <CardHeader className="pb-4">
                  <div className="flex items-center text-sm text-muted-foreground mb-2">
                    <MapPin className="h-3 w-3 mr-1" />
                    {product.location}
                  </div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription>by {product.business}</CardDescription>
                  
                  <div className="flex items-center mb-3">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="ml-1 text-sm font-medium">{product.rating}</span>
                  </div>

                  <div className="flex items-center">
                    <span className="text-xl font-bold text-primary">₱{product.price.toLocaleString()}</span>
                    {product.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through ml-2">
                        ₱{product.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <Button variant="outline" size="lg" asChild>
              <Link to="/products">
                View All Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <Card className="border-0 shadow-elegant bg-gradient-subtle text-center max-w-4xl mx-auto">
            <CardContent className="p-12">
              <Sparkles className="h-12 w-12 mx-auto mb-6 text-primary" />
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                Join the Tangub Shop Easy Community
              </h3>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Whether you're a customer looking for local products or a business owner ready to grow, 
                we're here to connect our community.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="text-lg px-8 py-4 shadow-elegant hover:shadow-glow transition-all" asChild>
                  <Link to="/products">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Start Shopping
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="text-lg px-8 py-4" asChild>
                  <Link to="/register-business">
                    <Store className="mr-2 h-5 w-5" />
                    Register Business
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;