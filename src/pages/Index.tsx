import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles, Search, MapPin, Store, ShoppingCart, Shirt, Utensils, Home as HomeIcon, Gift, Smartphone, Heart, Camera, SlidersHorizontal } from "lucide-react";
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

  // simple promos like the mock
  const promos = [
    {
      title: "Buy 1 Pizza, Get 1 Free!",
      subtitle: "Limited time only.",
      cta: "Order Now",
      image: "/promo-1.svg"
    },
    {
      title: "Free Delivery over ₱500",
      subtitle: "This weekend only",
      cta: "See Deals",
      image: "/promo-2.svg"
    },
    {
      title: "New Local Deals",
      subtitle: "Support Tangub businesses",
      cta: "Shop Now",
      image: "/promo-3.svg"
    }
  ];

  // Categories for Shopee-like section
  const categories = [
    { name: "Fashion", icon: Shirt },
    { name: "Food & Drinks", icon: Utensils },
  { name: "Home & Living", icon: HomeIcon },
    { name: "Gifts & Crafts", icon: Gift },
    { name: "Electronics", icon: Smartphone },
    { name: "Health & Beauty", icon: Heart },
  ];

  return (
  <div className="min-h-screen bg-white">
      {/* Header removed (Navbar now carries the green background) */}

      {/* Promo Carousel */}
      <section className="px-6 mt-4">
        <div className="max-w-6xl mx-auto flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth">
          {promos.map((p, i) => (
            <div key={i} className="snap-start min-w-[85%] sm:min-w-[480px]">
              <div className="relative rounded-2xl overflow-hidden shadow-sm bg-secondary">
                <img
                  src={p.image}
                  alt={p.title}
                  className="h-40 w-full object-cover"
                  onError={(e) => { e.currentTarget.src = "/promo-1.svg"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
                <div className="absolute left-4 top-4 text-white max-w-[60%]">
                  <h3 className="font-bold text-lg leading-snug">{p.title}</h3>
                  <p className="text-sm opacity-90">{p.subtitle}</p>
                  <Button size="sm" className="mt-3 rounded-full bg-accent text-accent-foreground hover:bg-accent/90">{p.cta}</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-4 px-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Categories</h3>
            <Link to="/products" className="text-primary text-sm">See All</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button key={cat.name} className="shrink-0 w-24 bg-secondary rounded-xl p-3 text-center hover:bg-secondary/80">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center mb-2">
                  <cat.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Now (horizontal) */}
      <section className="px-6 py-2">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Popular Now</h3>
            <Link to="/products" className="text-primary text-sm">See All</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
            {featuredProducts.map((p) => (
              <div key={p.id} className="min-w-[260px]">
                <ProductCard {...p} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products (grid) */}
      <section className="py-10 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">Featured Products</h2>
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
            <Button variant="outline" size="lg" className="border-primary text-primary hover:bg-secondary" asChild>
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
          <Card className="border-0 shadow-elegant bg-secondary text-center max-w-4xl mx-auto">
            <CardContent className="p-12">
              <Sparkles className="h-12 w-12 mx-auto mb-6 text-primary" />
              <h3 className="text-3xl md:text-4xl font-bold mb-6 text-primary">
                Join the Tangub Shop Easy Community
              </h3>
              <p className="text-xl text-gray-500 mb-8 max-w-2xl mx-auto">
                Whether you're a customer looking for local products or a business owner ready to grow, 
                we're here to connect our community.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="text-lg px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow transition-all" asChild>
                  <Link to="/products">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Start Shopping
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="text-lg px-8 py-4 border-primary text-primary hover:bg-secondary" asChild>
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