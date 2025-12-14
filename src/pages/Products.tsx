import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Star, MapPin, ShoppingCart, Filter, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/hooks/use-cart";
import { Link } from "react-router-dom";

interface RawProductRow {
  id: string;
  name: string;
  price: number | null;
  stock?: number | null;
  vendor_id?: string | null;
  // Optional columns that might exist
  category?: string | null;
  image_url?: string | null;
  main_image_url?: string | null;
  location?: string | null; // if product stores its own location
  created_at?: string;
  description?: string | null;
}

interface VendorRow { id: string; store_name: string; address?: string | null; barangay?: string | null }

interface UIProduct {
  id: string;
  name: string;
  price: number;
  rating: number; // placeholder (no ratings table yet)
  reviews: number; // placeholder
  image: string;
  business: string;
  vendorId?: string;
  storePath?: string;
  location: string;
  category: string;
  discount?: number;
  featured?: boolean;
  description?: string;
}

const Products = () => {
  const { toast } = useToast();
  const { addItem } = useCart();
  // store as generic number[] to satisfy Slider's (number[]) signature, but enforce length 2 logically
  const [priceRange, setPriceRange] = useState<number[]>([0, 10000]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [rawProducts, setRawProducts] = useState<RawProductRow[]>([]);
  const [vendors, setVendors] = useState<Record<string, VendorRow>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState("featured");

  // Fetch products + vendors (two queries to avoid depending on relationship naming)
  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null);
      const { data: pData, error: pErr } = await supabase
        .from('products')
        .select('id,name,price,stock,vendor_id,main_image_url,image_url,description,created_at')
        .limit(200);
      if (pErr) { setError(pErr.message); setLoading(false); return; }
      setRawProducts(pData as RawProductRow[]);
      // Collect vendor_ids
      const vendorIds = Array.from(new Set((pData || []).map(r => r.vendor_id).filter(Boolean))) as string[];
      if (vendorIds.length) {
        const { data: vRows, error: vErr } = await supabase
          .from('vendors')
          .select('id,store_name,address,barangay')
          .in('id', vendorIds);
        if (!vErr && vRows) {
          const map: Record<string, VendorRow> = {};
          vRows.forEach(v => { map[v.id] = v as VendorRow; });
          setVendors(map);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  // Derive dynamic category & location sets from loaded data
  const uiProducts: UIProduct[] = useMemo(() => {
    return rawProducts.map(p => {
      const vendor = p.vendor_id ? vendors[p.vendor_id] : undefined;
      const vendorId = p.vendor_id ? String(p.vendor_id) : undefined;
      // Fallback heuristics
      const category = 'General';
      const location = p.location || vendor?.barangay || vendor?.address || 'Unknown';
      const description = (p as any).description || 'Detailed product information is provided by the vendor.';
      return {
        id: p.id,
        name: p.name,
        price: typeof p.price === 'number' ? p.price : 0,
        rating: 0,
        reviews: 0,
        image: (p as any).main_image_url || (p as any).image_url || '/placeholder.svg',
        business: vendor?.store_name || 'Unknown Vendor',
        vendorId,
        storePath: vendorId ? `/business/${vendorId}` : undefined,
        location,
        category,
        featured: false,
        description,
      };
    });
  }, [rawProducts, vendors]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    uiProducts.forEach(p => set.add(p.category));
    return Array.from(set).sort();
  }, [uiProducts]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    uiProducts.forEach(p => set.add(p.location));
    return Array.from(set).sort();
  }, [uiProducts]);

  const addToCart = async (product: UIProduct) => {
    try {
      await addItem(product.id, 1);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to add to cart', variant: 'destructive' });
    }
  };

  const filteredProducts = useMemo(() => {
    let list = uiProducts.filter(product => {
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      const matchesLocation = selectedLocation === "all" || product.location === selectedLocation;
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      return matchesCategory && matchesLocation && matchesPrice;
    });
    switch (sortKey) {
      case 'price-low': list = [...list].sort((a,b)=>a.price-b.price); break;
      case 'price-high': list = [...list].sort((a,b)=>b.price-a.price); break;
      case 'newest': list = [...list]; /* could sort by created_at when available */ break;
      case 'rating': list = [...list].sort((a,b)=>b.rating-a.rating); break;
      default: break; // featured logic not yet implemented
    }
    return list;
  }, [uiProducts, selectedCategory, selectedLocation, priceRange, sortKey]);

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
                      onValueChange={(vals: number[]) => setPriceRange([vals[0] ?? 0, vals[1] ?? priceRange[1]])}
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
                  {loading ? 'Loading...' : `(${filteredProducts.length} items)`}
                </span>
              </h2>
              <Select value={sortKey} onValueChange={setSortKey}>
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
            {error && (
              <div className="p-4 mb-4 border border-destructive/40 text-sm text-destructive rounded-md bg-destructive/5">
                Failed to load products: {error}
              </div>
            )}
            {!error && loading && (
              <div className="py-16 text-center text-muted-foreground">Loading products...</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {!loading && !error && filteredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden hover:shadow-elegant transition-all duration-300 group">
                  {product.storePath ? (
                    <Link
                      to={product.storePath}
                      className="relative block"
                    >
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
                        <Badge className="absolute top-2 left-2 bg-gradient-primary text-primary-foreground">Featured</Badge>
                      )}
                      <Badge className="absolute bottom-2 left-2 bg-primary/90 text-primary-foreground">Visit Store</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <div className="relative">
                      <div className="aspect-square bg-white relative overflow-hidden rounded-xl shadow-sm">
                        <img
                          src={product.image || "/placeholder.svg"}
                          alt={product.name}
                          className="object-cover w-full h-full"
                          loading="lazy"
                          onError={(e) => {
                            if (e.currentTarget.src.endsWith("/placeholder.svg")) return;
                            e.currentTarget.src = "/placeholder.svg";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-80"></div>
                      </div>
                      {product.featured && (
                        <Badge className="absolute top-2 left-2 bg-gradient-primary text-primary-foreground">Featured</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <CardContent className="p-4 flex flex-col gap-2">
                    <div className="flex items-center text-sm text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3 mr-1" />
                      {product.location}
                    </div>
                    <h3 className="font-semibold text-base md:text-lg mb-1 line-clamp-2">
                      {product.storePath ? (
                        <Link to={product.storePath} className="hover:text-primary transition-colors">
                          {product.name}
                        </Link>
                      ) : (
                        product.name
                      )}
                    </h3>
                    <div className="text-sm text-primary mb-2 font-medium">
                      {product.storePath ? (
                        <Link to={product.storePath} className="hover:underline">{product.business}</Link>
                      ) : (
                        product.business
                      )}
                    </div>
                    
                    <div className="flex items-center mb-1">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="ml-1 text-sm font-medium">{product.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-sm text-muted-foreground ml-2">({product.reviews})</span>
                    </div>

                    <div className="flex items-center mb-2">
                      <span className="text-xl font-bold text-primary">
                        ₱{product.price.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">{product.description || 'Detailed description provided by the vendor.'}</p>
                    <div className="mt-3 border-t pt-3 text-xs space-y-1 text-muted-foreground">
                      <div className="font-semibold text-foreground text-sm">Order Deals</div>
                      <p>Direct store order: redirect to the vendor for accurate pricing.</p>
                      <p>Combine items from {product.business} for a single delivery fee where available.</p>
                      <p>Message the store for bulk or repeat-order discounts.</p>
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                    {product.storePath ? (
                      <Button asChild variant="outline" className="w-full">
                        <Link to={product.storePath}>Go to {product.business}</Link>
                      </Button>
                    ) : (
                      <div className="text-sm text-muted-foreground">Store link unavailable</div>
                    )}
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
            {!loading && !error && filteredProducts.length === 0 && (
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