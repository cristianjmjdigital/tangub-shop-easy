import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Star, MapPin, ShoppingCart, Filter, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Products = () => {
  const { toast } = useToast();
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");

  const categories = [
    "Electronics", "Fashion", "Food & Beverage", "Home & Garden", 
    "Health & Beauty", "Sports", "Books", "Automotive"
  ];

  const locations = [
    "Poblacion", "Maloro", "Katipunan", "Silabay", "Bonga", 
    "San Miguel", "Bagumbayan", "New Tangub"
  ];

  const products = [
    {
      id: 1,
      name: "Fresh Buko Pie",
      price: 250,
      originalPrice: 300,
      rating: 4.8,
      reviews: 125,
      image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80",
      business: "Tangub Delicacies",
      location: "Poblacion",
      category: "Food & Beverage",
      discount: 17,
      featured: true
    },
    {
      id: 2,
      name: "Handwoven Banig Mat",
      price: 450,
      rating: 4.9,
      reviews: 87,
      image: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80",
      business: "Local Crafts Co.",
      location: "Maloro",
      category: "Home & Garden",
      featured: false
    },
    {
      id: 3,
      name: "Tangub Coffee Beans",
      price: 380,
      rating: 4.7,
      reviews: 203,
      image: "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=400&q=80",
      business: "Mountain Coffee",
      location: "Katipunan",
      category: "Food & Beverage",
      featured: true
    },
    {
      id: 4,
      name: "Local Honey",
      price: 320,
      rating: 4.6,
      reviews: 94,
      image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
      business: "Bee Happy Farm",
      location: "Silabay",
      category: "Food & Beverage",
      featured: false
    },
    {
      id: 5,
      name: "Bamboo Phone Stand",
      price: 150,
      originalPrice: 200,
      rating: 4.5,
      reviews: 67,
      image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80",
      business: "Eco Crafts",
      location: "Bonga",
      category: "Electronics",
      discount: 25,
      featured: false
    },
    {
      id: 6,
      name: "Tangub T-Shirt",
      price: 280,
      rating: 4.4,
      reviews: 156,
      image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=80",
      business: "City Pride Apparel",
      location: "Poblacion",
      category: "Fashion",
      featured: true
    }
  ];

  const addToCart = (product: any) => {
    toast({
      title: "Added to Cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchesLocation = selectedLocation === "all" || product.location === selectedLocation;
    const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
    return matchesCategory && matchesLocation && matchesPrice;
  });

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <Card className="p-6 sticky top-24">
              <div className="flex items-center mb-4">
                <Filter className="h-5 w-5 mr-2" />
                <h3 className="font-semibold">Filters</h3>
              </div>

              <div className="space-y-6">
                {/* Category Filter */}
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location Filter */}
                <div>
                  <Label className="text-sm font-medium">Barangay</Label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations.map(location => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div>
                  <Label className="text-sm font-medium">Price Range</Label>
                  <div className="mt-4">
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      max={10000}
                      min={0}
                      step={50}
                      className="mb-4"
                    />
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                        className="w-20"
                      />
                      <span>-</span>
                      <Input
                        type="number"
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 10000])}
                        className="w-20"
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedLocation("all");
                    setPriceRange([0, 10000]);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </Card>
          </div>

          {/* Products Grid */}
          <div className="lg:w-3/4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                Products in Tangub City
                <span className="text-muted-foreground text-base ml-2">
                  ({filteredProducts.length} items)
                </span>
              </h2>
              <Select defaultValue="featured">
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden hover:shadow-elegant transition-all duration-300 group">
                  <div className="relative">
                    <div className="aspect-square bg-white relative overflow-hidden rounded-xl shadow-sm">
                      <img
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          if (e.currentTarget.src.endsWith("/placeholder.svg")) return;
                          e.currentTarget.src = "/placeholder.svg";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-80"></div>
                    </div>
                    {product.featured && (
                      <Badge className="absolute top-2 left-2 bg-gradient-primary text-primary-foreground">
                        Featured
                      </Badge>
                    )}
                    {product.discount && (
                      <Badge variant="destructive" className="absolute top-2 right-2">
                        -{product.discount}%
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>

                  <CardContent className="p-4 flex flex-col gap-2">
                    <div className="flex items-center text-sm text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3 mr-1" />
                      {product.location}
                    </div>
                    <h3 className="font-semibold text-base md:text-lg mb-1 line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      by {product.business}
                    </p>
                    
                    <div className="flex items-center mb-1">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="ml-1 text-sm font-medium">{product.rating}</span>
                      </div>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({product.reviews} reviews)
                      </span>
                    </div>

                    <div className="flex items-center mb-2">
                      <span className="text-xl font-bold text-primary">
                        ₱{product.price.toLocaleString()}
                      </span>
                      {product.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through ml-2">
                          ₱{product.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                    <Button 
                      className="w-full text-base py-2"
                      onClick={() => addToCart(product)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  No products found matching your filters.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedLocation("all");
                    setPriceRange([0, 10000]);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;