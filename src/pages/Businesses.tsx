import { useEffect, useMemo, useState } from "react";
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
import { supabase } from "@/lib/supabaseClient";

interface VendorRow { id: string; store_name: string; description?: string | null; address?: string | null; barangay?: string | null; created_at?: string; logo_url?: string | null; contact_phone?: string | null }
interface ProductRow { id: string; vendor_id: string }

const Businesses = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null);
      const { data: vRows, error: vErr } = await supabase
        .from('vendors')
        .select('id,store_name,description,address,created_at,logo_url,contact_phone')
        .limit(200);
      if (vErr) { setError(vErr.message); setLoading(false); return; }
      setVendors(vRows as VendorRow[]);
      // Fetch product counts
      const { data: pRows, error: pErr } = await supabase
        .from('products')
        .select('id,vendor_id')
        .limit(1000);
      if (!pErr && pRows) {
        const counts: Record<string, number> = {};
        (pRows as ProductRow[]).forEach(p => {
          counts[p.vendor_id] = (counts[p.vendor_id] || 0) + 1;
        });
        setProductCounts(counts);
      }
      setLoading(false);
    };
    load();
  }, []);

  const derivedBusinesses = useMemo(() => {
    return vendors.map(v => {
      // Placeholder values for fields not yet modeled
      return {
        id: v.id,
        name: v.store_name,
        category: 'General',
        rating: 0,
        reviews: 0,
        location: v.address || 'Tangub City',
        image: v.logo_url || '',
        description: v.description || 'Local business in Tangub City',
        products: productCounts[v.id] || 0,
        followers: 0,
        isVerified: true,
        subscriptionPlan: 'Standard',
        openTime: '—',
        phone: v.contact_phone || '',
        email: '',
        featured: false,
      };
    });
  }, [vendors, productCounts]);

  const filteredBusinesses = useMemo(() => derivedBusinesses.filter(business =>
    business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    business.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    business.location.toLowerCase().includes(searchQuery.toLowerCase())
  ), [derivedBusinesses, searchQuery]);

  const featuredBusinesses = filteredBusinesses.filter(b => b.featured);
  const allBusinesses = filteredBusinesses;

  const BusinessCard = ({ business }: { business: any }) => {
    const [showFallback, setShowFallback] = useState(!business.image);
    const initials = (business.name || 'Shop').split(' ').slice(0, 2).map((p: string) => p[0]).join('').toUpperCase();
    const sanitizedPhone = business.phone ? String(business.phone).replace(/[^\d+]/g, '') : '';
    const telHref = sanitizedPhone ? `tel:${sanitizedPhone}` : '';

    return (
      <Card className="overflow-hidden hover:shadow-elegant transition-all duration-300 group">
        <div className="relative h-40 bg-muted">
          {!showFallback && (
            <img
              src={business.image}
              alt={business.name}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setShowFallback(true)}
            />
          )}
          {showFallback && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
              <div className="h-14 w-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xl font-semibold tracking-tight">
                {initials}
              </div>
              <span className="mt-3 text-xs uppercase tracking-[0.15em] text-white/70">Awaiting Brand</span>
            </div>
          )}
          {!showFallback && <div className="absolute inset-0 bg-gradient-to-b from-black/15 to-black/45" />}
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
            {telHref ? (
              <Button variant="outline" className="flex-1" asChild>
                <a href={telHref}>
                  <Phone className="h-4 w-4 mr-2" />
                  Contact
                </a>
              </Button>
            ) : (
              <Button variant="outline" className="flex-1" disabled>
                <Phone className="h-4 w-4 mr-2" />
                Contact
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

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
            <TabsTrigger value="all">All Businesses</TabsTrigger>
            <TabsTrigger value="featured">Featured</TabsTrigger>
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

      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">Loading businesses...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto p-4 border border-destructive/40 rounded-md bg-destructive/5 text-destructive text-sm">Failed to load vendors: {error}</div>
        </div>
      </div>
    );
  }
};

export default Businesses;