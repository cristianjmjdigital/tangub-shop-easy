import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles, Search, MapPin, Store, Users, Package, TrendingUp, ShoppingCart, Shirt, Utensils, Home, Gift, Smartphone, Heart, Camera } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "@/components/ui/ProductCard";

const Index = () => {
  const [scanSuggestions, setScanSuggestions] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);

  // Scan handler
  const handleScanClick = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files && target.files[0];
      if (file) {
        setScanning(true);
        await recognizeImage(file);
        setScanning(false);
      }
    };
    input.click();
  };

  // Google Vision API integration (replace with your backend endpoint for security)
  async function recognizeImage(file: File) {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const result = reader.result;
      const base64 = typeof result === 'string' ? result.split(',')[1] : '';
      try {
        const response = await fetch(
          'https://vision.googleapis.com/v1/images:annotate?key=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',
          {
            method: 'POST',
            body: JSON.stringify({
              requests: [
                {
                  image: { content: base64 },
                  features: [{ type: 'LABEL_DETECTION', maxResults: 5 }]
                }
              ]
            }),
            headers: { 'Content-Type': 'application/json' }
          }
        );
        const result = await response.json();
        const labels = result.responses?.[0]?.labelAnnotations?.map((l: any) => l.description) || [];
        suggestProducts(labels);
      } catch (err) {
        setScanSuggestions(["Scan failed. Please try again."]);
      }
    };
    reader.readAsDataURL(file);
  }

  // Suggest products based on detected labels
  function suggestProducts(labels: string[]) {
    // Dummy product list for matching (use your real product list in production)
    const allProducts = [
      { name: "Fresh Buko Pie", category: "Food & Beverage" },
      { name: "Tangub Coffee Beans", category: "Food & Beverage" },
      { name: "Handwoven Banig Mat", category: "Home & Living" },
      { name: "Coffee Beans", category: "Food & Beverage" },
      { name: "Banig Mat", category: "Home & Living" },
      { name: "T-Shirt", category: "Fashion" },
      // ...add more as needed
    ];
    const matches = allProducts.filter(p =>
      labels.some(label =>
        p.name.toLowerCase().includes(label.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(label.toLowerCase()))
      )
    );
    setScanSuggestions(matches.length ? matches.map(m => m.name) : ["No related products found."]);
  }
  const featuredProducts = [
    {
      id: 1,
      name: "Fresh Buko Pie",
      price: 250,
      originalPrice: 300,
      rating: 4.8,
      business: "Tangub Delicacies",
      location: "Poblacion",
      discount: 17,
      image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 2,
      name: "Tangub Coffee Beans",
      price: 380,
      rating: 4.7,
      business: "Mountain Coffee",
      location: "Katipunan",
      image: "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 3,
      name: "Handwoven Banig Mat",
      price: 450,
      rating: 4.9,
      business: "Local Crafts Co.",
      location: "Maloro",
      image: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80"
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

  // Categories for Shopee-like section
  const categories = [
    { name: "Fashion", icon: Shirt },
    { name: "Food & Drinks", icon: Utensils },
    { name: "Home & Living", icon: Home },
    { name: "Gifts & Crafts", icon: Gift },
    { name: "Electronics", icon: Smartphone },
    { name: "Health & Beauty", icon: Heart },
  ];

  return (
  <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white">
        <div className="container mx-auto px-6 py-12 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <Badge className="bg-orange-100 text-orange-600 font-medium px-4 py-2">
                <MapPin className="h-4 w-4 mr-2" />
                Tangub City Local Marketplace
              </Badge>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-orange-500 leading-tight">
              Tangub Shop Easy
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 mb-8 max-w-2xl mx-auto leading-relaxed">
              Support local businesses and discover amazing products right here in Tangub City. From fresh delicacies to handmade crafts.
            </p>
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-orange-400 h-5 w-5" />
                <Input
                  placeholder="Search for products, businesses..."
                  className="pl-12 py-4 text-base rounded-full border-2 border-orange-200 focus:border-orange-400"
                />
                <Button className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full bg-orange-500 hover:bg-orange-600 text-white px-6">
                  Search
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleScanClick}
                disabled={scanning}
              >
                <Camera className="mr-2 h-5 w-5" />
                {scanning ? 'Scanning...' : 'Scan Item'}
              </Button>
            {/* Scan Suggestions */}
            {scanSuggestions.length > 0 && (
              <div className="mt-6 max-w-md mx-auto bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="font-semibold mb-2 text-orange-600">Scan Suggestions:</div>
                <ul className="list-disc pl-5 text-gray-700">
                  {scanSuggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
              <Button size="lg" className="text-lg px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white shadow transition-all" asChild>
                <Link to="/products">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Shop Now
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4 border-orange-500 text-orange-500 hover:bg-orange-50" asChild>
                <Link to="/businesses">
                  <Store className="mr-2 h-5 w-5" />
                  Browse Businesses
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-6 px-6">
        <div className="container mx-auto">
          <div className="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto">
            {categories.map((cat) => (
              <div key={cat.name} className="flex flex-col items-center bg-orange-50 rounded-xl shadow p-4 w-32 hover:bg-orange-100 hover:text-orange-600 transition-all cursor-pointer">
                <cat.icon className="h-8 w-8 mb-2 text-orange-400" />
                <span className="font-medium text-sm text-center">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-orange-500">Featured Products</h2>
            <p className="text-xl text-gray-500">
              Discover the best products from local businesses in Tangub City
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-8">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
          <div className="text-center">
            <Button variant="outline" size="lg" className="border-orange-500 text-orange-500 hover:bg-orange-50" asChild>
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
          <Card className="border-0 shadow-elegant bg-orange-50 text-center max-w-4xl mx-auto">
            <CardContent className="p-12">
              <Sparkles className="h-12 w-12 mx-auto mb-6 text-orange-500" />
              <h3 className="text-3xl md:text-4xl font-bold mb-6 text-orange-500">
                Join the Tangub Shop Easy Community
              </h3>
              <p className="text-xl text-gray-500 mb-8 max-w-2xl mx-auto">
                Whether you're a customer looking for local products or a business owner ready to grow, 
                we're here to connect our community.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="text-lg px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white shadow transition-all" asChild>
                  <Link to="/products">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Start Shopping
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="text-lg px-8 py-4 border-orange-500 text-orange-500 hover:bg-orange-100" asChild>
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