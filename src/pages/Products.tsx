import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Star, MapPin, ShoppingCart, Filter, Heart, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/hooks/use-cart";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

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
  size_options?: string[] | null;
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
  sizeOptions?: string[];
  stock?: number;
  soldCount?: number;
}

const Products = () => {
  const { toast } = useToast();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const DEFAULT_CATEGORIES = [
    "Electronics",
    "Fashion",
    "Food & Drinks",
    "Home & Living",
    "Gifts & Crafts",
    "Health & Beauty",
    "Sports",
    "Books",
    "Automotive",
  ];
  const DEFAULT_BARANGAYS = [
    "Aquino",
    "Barangay I - City Hall",
    "Barangay II - Marilou Annex",
    "Barangay III- Market Kalubian",
    "Barangay IV - St. Michael",
    "Barangay V - Malubog",
    "Barangay VI - Lower Polao",
    "Barangay VII - Upper Polao",
    "Balatacan",
    "Baluc",
    "Banglay",
    "Bintana",
    "Bocator",
    "Bongabong",
    "Caniangan",
    "Capalaran",
    "Catagan",
    "Hoyohoy",
    "Isidro D. Tan (Dimalooc)",
    "Garang",
    "Guinabot",
    "Guinalaban",
    "Kausawagan",
    "Kimat",
    "Labuyo",
    "Lorenzo Tan",
    "Lumban",
    "Maloro",
    "Manga",
    "Mantic",
    "Maquilao",
    "Matugnao",
    "Migcanaway",
    "Minsubong",
    "Owayan",
    "Paiton",
    "Panalsalan",
    "Pangabuan",
    "Prenza",
    "Salimpuno",
    "San Antonio",
    "San Apolinario",
    "San Vicente",
    "Santa Cruz",
    "Santa Maria (Baga)",
    "Santo Niño",
    "Sicot",
    "Silanga",
    "Silangit",
    "Simasay",
    "Sumirap",
    "Taguite",
    "Tituron",
    "Tugas",
    "Villaba",
  ];
  const [searchParams, setSearchParams] = useSearchParams();
  // store as generic number[] to satisfy Slider's (number[]) signature, but enforce length 2 logically
  const [priceRange, setPriceRange] = useState<number[]>([0, 10000]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [rawProducts, setRawProducts] = useState<RawProductRow[]>([]);
  const [vendors, setVendors] = useState<Record<string, VendorRow>>({});
  const [vendorRatings, setVendorRatings] = useState<Record<string, { avg: number; count: number }>>({});
    const [salesCounts, setSalesCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState("featured");

  // Fetch products + vendors (vendors all so barangay list is complete even without products)
  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const [{ data: pData, error: pErr }, { data: vRows, error: vErr }, { data: ratingRows, error: rErr }, { data: salesRows, error: sErr }] = await Promise.all([
          supabase
            .from('products')
            .select('id,name,price,stock,vendor_id,main_image_url,image_url,description,created_at,category,size_options')
            .limit(200),
          supabase
            .from('vendors')
            .select('id,store_name,address,barangay')
            .limit(500),
          supabase
            .from('order_ratings')
            .select('vendor_id,rating')
            .limit(2000),
          supabase
            .from('order_items')
            .select('product_id,quantity')
            .limit(5000)
        ]);
        if (pErr) throw pErr;
        if (vErr) throw vErr;
        if (rErr) throw rErr;
        if (sErr) throw sErr;
        setRawProducts((pData || []) as RawProductRow[]);
        if (vRows) {
          const map: Record<string, VendorRow> = {};
          vRows.forEach(v => { map[v.id] = v as VendorRow; });
          setVendors(map);
        }
        if (ratingRows) {
          const sums: Record<string, { sum: number; count: number }> = {};
          (ratingRows as any[]).forEach((r) => {
            const vId = r.vendor_id ? String(r.vendor_id) : null;
            const val = Number(r.rating);
            if (!vId || !Number.isFinite(val)) return;
            if (!sums[vId]) sums[vId] = { sum: 0, count: 0 };
            sums[vId].sum += val;
            sums[vId].count += 1;
          });
          const normalized: Record<string, { avg: number; count: number }> = {};
          Object.entries(sums).forEach(([k, v]) => {
            normalized[k] = { avg: Math.round((v.sum / v.count) * 10) / 10, count: v.count };
          });
          setVendorRatings(normalized);
        }
        if (salesRows) {
          const counts: Record<string, number> = {};
          (salesRows as any[]).forEach((row) => {
            const pid = row.product_id;
            const qty = Number(row.quantity) || 0;
            if (!pid) return;
            counts[pid] = (counts[pid] || 0) + qty;
          });
          setSalesCounts(counts);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Derive dynamic category & location sets from loaded data
  const uiProducts: UIProduct[] = useMemo(() => {
    return rawProducts.map(p => {
      const vendor = p.vendor_id ? vendors[p.vendor_id] : undefined;
      const vendorId = p.vendor_id ? String(p.vendor_id) : undefined;
      // Fallback heuristics
      const category = (p as any).category || 'General';
      const location = p.location || vendor?.barangay || vendor?.address || 'Unknown';
      const description = (p as any).description || 'Detailed product information is provided by the vendor.';
      const sizeOptions = (p as any).size_options || [];
      const stock = typeof p.stock === 'number' ? p.stock : 0;
      const ratingInfo = vendorId ? vendorRatings[vendorId] : undefined;
      const soldCount = salesCounts[p.id] || 0;
      return {
        id: p.id,
        name: p.name,
        price: typeof p.price === 'number' ? p.price : 0,
        rating: ratingInfo?.avg ?? 0,
        reviews: ratingInfo?.count ?? 0,
        image: (p as any).main_image_url || (p as any).image_url || '/placeholder.svg',
        business: vendor?.store_name || 'Unknown Vendor',
        vendorId,
        storePath: vendorId ? `/business/${vendorId}` : undefined,
        location,
        category,
        featured: false,
        description,
        sizeOptions,
        stock,
        soldCount,
      };
    });
  }, [rawProducts, vendors, vendorRatings, salesCounts]);

  const categories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    uiProducts.forEach(p => set.add(p.category));
    return Array.from(set).sort();
  }, [uiProducts]);

  const locations = useMemo(() => {
    const set = new Set<string>(DEFAULT_BARANGAYS);
    // Add barangays from all vendors even if they currently have no products loaded
    Object.values(vendors).forEach(v => {
      if (v.barangay) set.add(v.barangay);
      if (v.address) set.add(v.address);
    });
    uiProducts.forEach(p => set.add(p.location));
    return Array.from(set).sort();
  }, [uiProducts, vendors]);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    const cat = searchParams.get('category') || 'all';
    setSearchTerm(q);
    setSelectedCategory(cat);
  }, [searchParams]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value.trim()) {
        next.set('q', value);
      } else {
        next.delete('q');
      }
      return next;
    });
  };

  const addToCart = async (product: UIProduct) => {
    try {
      if (typeof product.stock === 'number' && product.stock <= 0) {
        toast({ title: 'Out of stock', description: 'This item is currently unavailable.', variant: 'destructive' });
        return false;
      }
      if (product.sizeOptions && product.sizeOptions.length) {
        const chosen = selectedSizes[product.id];
        if (!chosen) {
          toast({ title: 'Choose a size', description: 'Select a size before adding to cart.', variant: 'destructive' });
          return false;
        }
        await addItem(product.id, 1, product.name, chosen);
        return true;
      }
      await addItem(product.id, 1, product.name);
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to add to cart', variant: 'destructive' });
      return false;
    }
  };

  const buyNow = async (product: UIProduct) => {
    const success = await addToCart(product);
    if (success) navigate('/cart');
  };

  const filteredProducts = useMemo(() => {
    let list = uiProducts.filter(product => {
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      const matchesLocation = selectedLocation === "all" || product.location === selectedLocation;
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      return matchesCategory && matchesLocation && matchesPrice;
    });
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.business.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)
      );
    }
    switch (sortKey) {
      case 'price-low': list = [...list].sort((a,b)=>a.price-b.price); break;
      case 'price-high': list = [...list].sort((a,b)=>b.price-a.price); break;
      case 'newest': list = [...list]; /* could sort by created_at when available */ break;
      case 'rating': list = [...list].sort((a,b)=>b.rating-a.rating); break;
      default: break; // featured logic not yet implemented
    }
    return list;
  }, [uiProducts, selectedCategory, selectedLocation, priceRange, sortKey, searchTerm]);

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val && val !== 'all') next.set('category', val); else next.delete('category');
      if (searchTerm.trim()) next.set('q', searchTerm.trim());
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Products Grid */}
          <div className="lg:w-full">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center justify-between gap-4">
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search products, shops, or categories..."
                  className="pl-10"
                />
              </div>
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
              {!loading && !error && filteredProducts.map((product) => {
                const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;
                return (
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

                    <div className="flex items-center text-xs text-muted-foreground gap-3">
                      <span>Stock: {product.stock ?? 0}</span>
                      <span>Sold: {product.soldCount ?? 0}</span>
                      {product.category && <span>Category: {product.category}</span>}
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
                    {product.sizeOptions && product.sizeOptions.length > 0 && (
                      <div className="space-y-2 mb-2">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Available Sizes</div>
                        <div className="flex flex-wrap gap-2">
                          {product.sizeOptions.map((size) => {
                            const selected = selectedSizes[product.id] === size;
                            return (
                              <Button
                                key={size}
                                type="button"
                                size="sm"
                                variant={selected ? 'secondary' : 'outline'}
                                className="h-8 px-3"
                                onClick={() => setSelectedSizes(prev => ({ ...prev, [product.id]: size }))}
                              >
                                {size}
                              </Button>
                            );
                          })}
                        </div>
                        {!selectedSizes[product.id] && (
                          <div className="text-[11px] text-muted-foreground">Select a size before adding to cart.</div>
                        )}
                      </div>
                    )}
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
                      disabled={isOutOfStock}
                      onClick={() => addToCart(product)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </Button>
                    <Button 
                      variant="secondary"
                      className="w-full text-base py-2"
                      disabled={isOutOfStock}
                      onClick={() => buyNow(product)}
                    >
                      {isOutOfStock ? 'Unavailable' : 'Buy Now'}
                    </Button>
                  </CardFooter>
                </Card>
                );
              })}
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