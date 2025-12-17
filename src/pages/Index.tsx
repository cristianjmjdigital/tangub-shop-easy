import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ui/ProductCard';
import { ArrowRight, Shirt, Utensils, Home as HomeIcon, Gift, Smartphone, Heart, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';

const promos = [
  { title: 'Buy 1 Pizza, Get 1 Free!', subtitle: 'Limited time only.', cta: 'Order Now', image: '/promo-1.svg' },
  { title: 'Free Delivery over ₱500', subtitle: 'This weekend only', cta: 'See Deals', image: '/promo-2.svg' },
  { title: 'New Local Deals', subtitle: 'Support Tangub businesses', cta: 'Shop Now', image: '/promo-3.svg' }
];

const categories = [
  { name: 'Fashion', icon: Shirt },
  { name: 'Food & Drinks', icon: Utensils },
  { name: 'Home & Living', icon: HomeIcon },
  { name: 'Gifts & Crafts', icon: Gift },
  { name: 'Electronics', icon: Smartphone },
  { name: 'Health & Beauty', icon: Heart }
];

export default function Index() {
  const [scanSuggestions, setScanSuggestions] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem, loading: cartLoading } = useCart();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorsError, setVendorsError] = useState<string|null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null);
      const { data, error } = await supabase
        .from('products')
        .select('id,name,price,stock,main_image_url,description,created_at,vendor_id,size_options,vendors(store_name,address)')
        .order('created_at', { ascending: false })
        .limit(60);
      if (!cancelled) {
        if (error) setError(error.message); else {
          setProducts((data||[]).map((p:any)=>({
            id: p.id,
            name: p.name,
            price: p.price,
            rating: 4.9,
            business: p.vendors?.store_name || 'Vendor',
            vendorId: p.vendor_id,
            location: p.vendors?.address || 'Tangub',
            imageUrl: p.main_image_url || undefined,
            description: p.description,
            stock: p.stock,
            sizeOptions: p.size_options || [],
            created_at: p.created_at
          })));
        }
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Fetch featured shops (top vendors by product count)
  useEffect(() => {
    let cancelled = false;
    const loadVendors = async () => {
      setVendorsLoading(true); setVendorsError(null);
      // Aggregate: product counts per vendor
      const { data, error } = await supabase
        .from('products')
        .select('vendor_id, vendors(store_name,address,logo_url), id');
      if (cancelled) return;
      if (error) { setVendorsError(error.message); setVendorsLoading(false); return; }
      const grouped: Record<string, { id: string; name: string; address?: string; logo_url?: string; product_count: number; }>= {};
      (data||[]).forEach((row: any) => {
        if (!row.vendor_id) return;
        if (!grouped[row.vendor_id]) {
          grouped[row.vendor_id] = {
            id: row.vendor_id,
            name: row.vendors?.store_name || 'Vendor',
            address: row.vendors?.address,
            logo_url: row.vendors?.logo_url,
            product_count: 0
          };
        }
        grouped[row.vendor_id].product_count += 1;
      });
      const list = Object.values(grouped)
        .sort((a,b)=> b.product_count - a.product_count)
        .slice(0,9);
      setVendors(list);
      setVendorsLoading(false);
    };
    loadVendors();
    return () => { cancelled = true; };
  }, []);

  const popularProducts = products.slice(0, 12);
  const featuredProducts = products.slice(0, 9);
  const featuredVendors = vendors;

  const handleScanClick = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setScanning(true);
        await recognizeImage(file);
        setScanning(false);
      }
    };
    input.click();
  };

  async function recognizeImage(file: File) {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const result = reader.result;
      const base64 = typeof result === 'string' ? result.split(',')[1] : '';
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_VISION_KEY;
        if (!apiKey) { setScanSuggestions(['Vision API key not configured.']); return; }
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
          method: 'POST',
          body: JSON.stringify({
            requests: [{ image: { content: base64 }, features: [{ type: 'LABEL_DETECTION', maxResults: 5 }] }]
          }),
          headers: { 'Content-Type': 'application/json' }
        });
        const json = await response.json();
        const labels = json.responses?.[0]?.labelAnnotations?.map((l: any) => l.description) || [];
        suggestProducts(labels);
      } catch (err) {
        setScanSuggestions(['Scan failed. Please try again.']);
      }
    };
    reader.readAsDataURL(file);
  }

  function suggestProducts(labels: string[]) {
    if (!products.length) { setScanSuggestions(['No products loaded yet']); return; }
    const matches = products.filter(p => labels.some(l => p.name.toLowerCase().includes(l.toLowerCase()) || p.business.toLowerCase().includes(l.toLowerCase())));
    setScanSuggestions(matches.length ? matches.map(m => m.name) : ['No related products found.']);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Promo Carousel */}
      <section className="px-6 mt-4">
        <div className="max-w-6xl mx-auto flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth">
          {promos.map((p,i)=>(
            <div key={i} className="snap-start min-w-[85%] sm:min-w-[480px]">
              <div className="relative rounded-2xl overflow-hidden shadow-sm bg-secondary">
              <img src={p.image} alt={p.title} className="h-40 w-full object-cover" onError={(e)=>{e.currentTarget.src='/promo-1.svg';}} />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
              <div className="absolute inset-0 p-4 flex flex-col">
                <div className="text-white max-w-[60%]">
                <h3 className="font-bold text-lg leading-snug">{p.title}</h3>
                <p className="text-sm opacity-90">{p.subtitle}</p>
                </div>
                <Button size="sm" className="mt-auto rounded-full bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                  <Link to="/vendors">{p.cta}</Link>
                </Button>
              </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-4 px-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Categories</h3>
            <Link to="/products" className="text-primary text-sm">See All</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
            {categories.map(cat => (
              <Link
                key={cat.name}
                to={`/products?category=${encodeURIComponent(cat.name)}`}
                className="shrink-0 w-24 bg-secondary rounded-xl p-3 text-center hover:bg-secondary/80"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center mb-2"><cat.icon className="h-5 w-5" /></div>
                <span className="text-xs font-medium">{cat.name}</span>
              </Link>
            ))}
          </div>
          {scanSuggestions.length > 0 && (
            <div className="mt-3 text-[11px] text-muted-foreground flex flex-wrap gap-2">
              {scanSuggestions.map((s,i)=>(<span key={i} className="px-2 py-1 bg-muted rounded-full">{s}</span>))}
            </div>
          )}
        </div>
      </section>

      {/* Popular Now */}
      <section className="px-6 py-2">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Popular Now</h3>
            <Link to="/products" className="text-primary text-sm">See All</Link>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          {loading && <div className="flex gap-4 pb-1">{Array.from({length:5}).map((_,i)=>(<div key={i} className="min-w-[260px] h-72 bg-muted rounded-xl animate-pulse" />))}</div>}
          {!loading && !error && (
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
              {popularProducts.map(p => (
                <div key={p.id} className="min-w-[260px]">
                  <ProductCard
                    {...p}
                    description={p.description || 'View store for full product details.'}
                    vendorId={p.vendorId}
                    storePath={p.vendorId ? `/business/${p.vendorId}` : undefined}
                    sizeOptions={p.sizeOptions}
                    selectedSize={selectedSizes[p.id]}
                    onSelectSize={(size) => setSelectedSizes(prev => ({ ...prev, [p.id]: size }))}
                    onAdd={async () => {
                      if (p.sizeOptions && p.sizeOptions.length > 0 && !selectedSizes[p.id]) {
                        toast({ title: 'Choose a size', description: 'Please select a size before adding to cart.' });
                        return;
                      }
                      setAddingId(p.id);
                      await addItem(p.id, 1, p.name, selectedSizes[p.id]);
                      setAddingId(id => (id === p.id ? null : id));
                    }}
                    adding={addingId === p.id || cartLoading}
                  />
                </div>
              ))}
              {popularProducts.length === 0 && <div className="text-xs text-muted-foreground">No products available.</div>}
            </div>
          )}
        </div>
      </section>

      {/* Featured Shops (replaces Featured Products) */}
      <section className="py-10 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary flex items-center justify-center gap-2"> Shops <Building2 className="h-8 w-8 text-primary" /></h2>
            <p className="text-xl text-gray-500">Discover top local vendors and their offerings</p>
          </div>
          {vendorsLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-8">
              {Array.from({length:6}).map((_,i)=>(<div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />))}
            </div>
          )}
          {vendorsError && (
            <div className="text-center mb-6">
              <div className="text-sm text-red-600 mb-3">{vendorsError}</div>
              <Button variant="outline" size="sm" onClick={() => {
                // retry
                setVendorsError(null);
                setVendorsLoading(true);
                // trigger effect by calling loader directly
                (async ()=>{
                  const { data, error } = await supabase
                    .from('products')
                    .select('vendor_id, vendors(store_name,address,logo_url), id');
                  if (error) { setVendorsError(error.message); setVendorsLoading(false); return; }
                  const grouped: Record<string, any> = {};
                  (data||[]).forEach((row: any) => {
                    if (!row.vendor_id) return;
                    if (!grouped[row.vendor_id]) grouped[row.vendor_id] = { id: row.vendor_id, name: row.vendors?.store_name || 'Vendor', address: row.vendors?.address, logo_url: row.vendors?.logo_url, product_count: 0 };
                    grouped[row.vendor_id].product_count += 1;
                  });
                  const list = Object.values(grouped).sort((a:any,b:any)=> b.product_count - a.product_count).slice(0,9);
                  setVendors(list);
                  setVendorsLoading(false);
                })();
              }}>Retry</Button>
            </div>
          )}
          {!vendorsLoading && !vendorsError && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-8">
              {featuredVendors.map(v => (
                <div key={v.id} className="group rounded-xl border bg-card hover:shadow-md transition p-6 flex flex-col justify-between">
                  <div className="flex items-start gap-4">
                    {v.logo_url ? (
                      <img src={v.logo_url} alt={v.name} className="h-14 w-14 rounded-full object-cover border" />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-lg">{v.name.substring(0,2).toUpperCase()}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{v.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{v.address || 'Tangub City'}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{v.product_count} {v.product_count === 1 ? 'product' : 'products'}</span>
                    <Button size="sm" variant="secondary" className="group-hover:bg-primary group-hover:text-primary-foreground" asChild>
                      <Link to={`/business/${v.id}`}>View Shop</Link>
                    </Button>
                  </div>
                </div>
              ))}
              {featuredVendors.length === 0 && <div className="col-span-full text-sm text-muted-foreground">No vendors available.</div>}
            </div>
          )}
          <div className="text-center">
            <Button variant="outline" size="lg" className="border-primary text-primary hover:bg-secondary" asChild>
              <Link to="/vendors">View All Shops<ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}