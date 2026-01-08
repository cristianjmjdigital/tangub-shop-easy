import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ProductCard from '@/components/ui/ProductCard';
import { ArrowLeft, Store, MapPin } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';

interface VendorInfo { id: string; store_name: string; description?: string | null; address?: string | null; logo_url?: string | null; created_at?: string }
interface ProductRow { id: string; name: string; price: number; main_image_url?: string | null; description?: string | null; stock?: number | null; created_at?: string; size_options?: string[] | null }

export default function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<VendorInfo | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem, loading: cartLoading } = useCart({ vendorId: id ?? null });
  const [addingId, setAddingId] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) return;
      setLoading(true); setError(null);
      const { data: v, error: vErr } = await supabase
        .from('vendors')
        .select('id,store_name,description,address,logo_url,created_at')
        .eq('id', id)
        .single();
      if (vErr) { if (!cancelled) { setError(vErr.message); setLoading(false); } return; }
      if (!cancelled) setVendor(v as VendorInfo);
      const { data: pRows, error: pErr } = await supabase
        .from('products')
        .select('id,name,price,main_image_url,description,stock,created_at,size_options')
        .eq('vendor_id', id)
        .order('created_at', { ascending: false });
      if (!cancelled) {
        if (pErr) setError(pErr.message); else setProducts(pRows as ProductRow[]);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  const handleAddToCart = async (product: ProductRow) => {
    const sizeOptions = product.size_options || [];
    const selectedSize = selectedSizes[product.id];

    if (typeof product.stock === 'number' && product.stock <= 0) {
      toast({ title: 'Out of stock', description: 'This item is currently unavailable.', variant: 'destructive' });
      return false;
    }

    if (sizeOptions.length > 0 && !selectedSize) {
      toast({ title: 'Choose a size', description: 'Select a size before adding to cart.', variant: 'destructive' });
      return false;
    }

    try {
      setAddingId(product.id);
      await addItem(product.id, 1, product.name, selectedSize);
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to add to cart', variant: 'destructive' });
      return false;
    } finally {
      setAddingId((current) => (current === product.id ? null : current));
    }
  };

  const handleBuyNow = async (product: ProductRow) => {
    const success = await handleAddToCart(product);
    if (success) navigate('/cart');
  };

  if (!id) return <div className="container mx-auto px-4 py-12">Missing vendor id.</div>;

  if (loading) return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-40 bg-muted rounded-xl" />
          <div className="h-6 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {Array.from({length:6}).map((_,i)=>(<div key={i} className="h-72 bg-muted rounded-xl" />))}
          </div>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-lg mx-auto p-4 border border-destructive/40 rounded-md bg-destructive/5 text-destructive text-sm mb-6">{error}</div>
        <Button variant="outline" asChild>
          <Link to="/businesses">Back to Businesses</Link>
        </Button>
      </div>
    </div>
  );

  if (!vendor) return (
    <div className="container mx-auto px-4 py-12">Vendor not found.</div>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" asChild className="-ml-2">
            <Link to="/businesses"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
        </div>
        <div className="relative rounded-2xl overflow-hidden bg-muted h-48 md:h-56 flex items-center p-6 mb-8">
          {vendor.logo_url && (
            <img src={vendor.logo_url} alt={vendor.store_name} className="h-24 w-24 rounded-full object-cover border shadow-md" />
          )}
          {!vendor.logo_url && (
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
              {vendor.store_name.substring(0,2).toUpperCase()}
            </div>
          )}
          <div className="ml-6 text-white drop-shadow max-w-2xl">
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <Store className="h-6 w-6" /> {vendor.store_name}
            </h1>
            <p className="text-muted-foreground mb-2 line-clamp-2">{vendor.description || 'Local business in Tangub City'}</p>
            <div className="flex items-center text-sm text-muted-foreground"><MapPin className="h-4 w-4 mr-1" /> {vendor.address || 'Tangub City'}</div>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-4">Products</h2>
        {products.length === 0 && (
          <div className="text-sm text-muted-foreground mb-8">No products listed yet.</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {products.map(p => (
            <ProductCard
              key={p.id}
              id={p.id}
              name={p.name}
              price={p.price}
              rating={4.9}
              business={vendor.store_name}
              vendorId={vendor.id}
              storePath={`/business/${vendor.id}`}
              location={vendor.address || 'Tangub'}
              imageUrl={p.main_image_url || undefined}
              description={p.description || 'Detailed description provided below.'}
              stock={p.stock || 0}
              created_at={p.created_at}
              sizeOptions={p.size_options || []}
              selectedSize={selectedSizes[p.id]}
              onSelectSize={(size) => setSelectedSizes(prev => ({ ...prev, [p.id]: size }))}
              onAdd={() => handleAddToCart(p)}
              onBuyNow={() => handleBuyNow(p)}
              adding={addingId === p.id || cartLoading}
            />
          ))}
        </div>

        <div className="space-y-4 mb-10">
          <h3 className="text-xl font-semibold">Product Details</h3>
          {products.map((p) => (
            <Card key={`${p.id}-details`}>
              <CardContent className="p-5 space-y-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground">{vendor.store_name}</div>
                    <div className="text-lg font-semibold">{p.name}</div>
                    <div className="text-sm text-muted-foreground">₱{p.price.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})} • Stock: {p.stock ?? 0}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Added {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'recently'}</div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.description || 'No description provided yet. Contact the vendor for more details about this item.'}</p>
                <div className="pt-3 border-t">
                  <div className="font-semibold text-sm mb-1">Order Deals</div>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li>Direct store checkout for accurate pricing and availability.</li>
                    <li>Bundle items from {vendor.store_name} to save on delivery runs.</li>
                    <li>Ask the vendor about repeat-customer or bulk-order discounts.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-16">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">About {vendor.store_name}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{vendor.description || 'This vendor has not added a description yet.'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
