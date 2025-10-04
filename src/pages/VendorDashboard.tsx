import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ShoppingCart, Settings, TrendingUp, Store, DollarSign, Users, Edit, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";

interface VendorRecord { id: string; store_name: string; address: string | null; created_at?: string; owner_user_id?: string; contact_phone?: string | null; accepting_orders?: boolean; base_delivery_fee?: number | null; logo_url?: string | null; hero_image_url?: string | null; description?: string | null }
interface ProductRecord { id: string; name: string; price: number; stock: number; description?: string | null; main_image_url?: string | null }

export default function VendorDashboard() {
  const { profile, signOut } = useAuth();
  const [vendor, setVendor] = useState<VendorRecord | null>(null);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', stock: '', description: '', main_image_url: '' });
  const [editOpen, setEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!profile?.id) return;
      setLoading(true);
      setError(null);
      // Fetch vendor row
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
  .select('id,store_name,address,created_at,owner_user_id,contact_phone,accepting_orders,base_delivery_fee,logo_url,hero_image_url,description')
        .eq('owner_user_id', profile.id)
        .maybeSingle();
      if (vendorError) { setError(vendorError.message); setLoading(false); return; }
      setVendor(vendorData as VendorRecord);
      if (vendorData?.id) {
        const { data: productRows } = await supabase
          .from('products')
          .select('id,name,price,stock,description,main_image_url')
          .eq('vendor_id', vendorData.id)
          .order('created_at', { ascending: false });
        setProducts((productRows as ProductRecord[]) || []);
        // Load simple order / sales metrics
        const { data: salesRows } = await supabase
          .from('order_items')
          .select('quantity,price_at_purchase')
          .eq('vendor_id', vendorData.id);
        let totalSales = 0; let totalOrders = 0;
        if (salesRows) {
          totalSales = salesRows.reduce((sum: number, r: any) => sum + (r.quantity * Number(r.price_at_purchase)), 0);
          totalOrders = salesRows.length; // simplistic: each row counts; could distinct on order_id
        }
        setMetrics(m => ({ ...m, salesToday: totalSales, orders: totalOrders }));
      }
      setLoading(false);
    };
    load();
  }, [profile?.id]);

  const [metrics, setMetrics] = useState({ salesToday: 0, orders: 0, visitors: 0, trend: 12 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] = useState({
    store_name: '',
    contact_phone: '',
    address: '',
    accepting_orders: true,
    base_delivery_fee: '',
    description: '',
    logo_url: '',
    hero_image_url: ''
  });

  useEffect(() => {
    if (vendor) {
      setSettings({
        store_name: vendor.store_name || '',
        contact_phone: vendor.contact_phone || '',
        address: vendor.address || '',
        accepting_orders: vendor.accepting_orders ?? true,
        base_delivery_fee: vendor.base_delivery_fee?.toString() || '',
        description: vendor.description || '',
        logo_url: vendor.logo_url || '',
        hero_image_url: vendor.hero_image_url || ''
      });
    }
  }, [vendor]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading vendor data...</div>;
  }

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }

  if (!vendor) {
    return <div className="p-6 text-sm">No vendor record found. <Link to="/vendor/setup" className="text-primary underline">Create one</Link>.</div>;
  }

  return (
    <>
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow">
                  <Store className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold leading-tight">{vendor.store_name}</h1>
                  <p className="text-xs text-muted-foreground">Since {new Date(vendor.created_at || Date.now()).getFullYear()} • <span className="text-green-600 font-medium">Online</span></p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild><Link to="/home">User View</Link></Button>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" /> New Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Product</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-1">
                        <Label htmlFor="prod-name">Name</Label>
                        <Input id="prod-name" value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="prod-price">Price (₱)</Label>
                          <Input id="prod-price" type="number" value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="prod-stock">Stock</Label>
                          <Input id="prod-stock" type="number" value={newProduct.stock} onChange={e => setNewProduct(p => ({ ...p, stock: e.target.value }))} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="prod-image">Main Image URL</Label>
                        <Input id="prod-image" value={newProduct.main_image_url} onChange={e => setNewProduct(p => ({ ...p, main_image_url: e.target.value }))} placeholder="https://.../image.jpg" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="prod-desc">Description</Label>
                        <Textarea id="prod-desc" value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))} placeholder="Short product description" />
                      </div>
                      {creating && <p className="text-xs text-muted-foreground">Saving...</p>}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpen(false)} type="button">Cancel</Button>
                      <Button disabled={creating || !newProduct.name.trim()} onClick={async () => {
                        if (!vendor?.id) return;
                        setCreating(true);
                        const priceNum = Number(newProduct.price);
                        const stockNum = Number(newProduct.stock);
                        const { data: inserted, error: insertErr } = await supabase
                          .from('products')
                          .insert({
                            vendor_id: vendor.id,
                            name: newProduct.name.trim(),
                            price: isNaN(priceNum) ? 0 : priceNum,
                            stock: isNaN(stockNum) ? 0 : stockNum,
                            description: newProduct.description.trim() ? newProduct.description.trim() : null,
                            main_image_url: newProduct.main_image_url.trim() ? newProduct.main_image_url.trim() : null,
                          })
                          .select('id,name,price,stock,description,main_image_url')
                          .single();
                        if (!insertErr && inserted) {
                          setProducts(prev => [inserted as any, ...prev]);
                          setOpen(false);
                          setNewProduct({ name: '', price: '', stock: '', description: '', main_image_url: '' });
                        }
                        setCreating(false);
                      }} type="button">Save</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button size="sm" variant="outline" onClick={() => signOut()}>Logout</Button>
              </div>
            </div>
            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Today's Sales</span>
                  <DollarSign className="h-3 w-3" />
                </div>
                <div className="mt-1 text-lg font-semibold">₱{metrics.salesToday.toFixed(2)}</div>
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Orders</span>
                  <ShoppingCart className="h-3 w-3" />
                </div>
                <div className="mt-1 text-lg font-semibold">{metrics.orders}</div>
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Visitors</span>
                  <Users className="h-3 w-3" />
                </div>
                <div className="mt-1 text-lg font-semibold">0</div>
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Trend</span>
                  <TrendingUp className="h-3 w-3" />
                </div>
                <div className="mt-1 text-lg font-semibold text-green-600">+12%</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Tabs defaultValue="products" className="space-y-5">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="products">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-medium text-muted-foreground">Total Products: {products.length}</h2>
              <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Add Product</Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {products.map(p => {
                const statusBadge = p.stock === 0 ? (
                  <Badge variant="destructive">Out of Stock</Badge>
                ) : p.stock < 10 ? (
                  <Badge className="bg-amber-500 hover:bg-amber-500">Low Stock</Badge>
                ) : (
                  <Badge className="bg-green-600 hover:bg-green-600">In Stock</Badge>
                );
                return (
                  <Card key={p.id} className="relative group">
                    <CardContent className="pt-4 space-y-3">
                      {p.main_image_url && (
                        <div className="aspect-video w-full overflow-hidden rounded-md border bg-muted">
                          <img src={p.main_image_url} alt={p.name} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground">#{p.id}</div>
                          <h3 className="font-medium leading-snug">{p.name}</h3>
                          {p.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description}</p>}
                        </div>
                        {statusBadge}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">₱{p.price}</span>
                        <span className={`text-xs px-2 py-1 rounded-full border ${p.stock === 0 ? 'text-destructive border-destructive/40' : p.stock < 10 ? 'text-amber-600 border-amber-400/50' : 'text-muted-foreground border-border'}`}>{p.stock} in stock</span>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="secondary" className="h-7 px-2" onClick={() => { setEditingProduct(p); setEditOpen(true); }}><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-destructive border-destructive/40" onClick={async () => {
                          if (!confirm('Delete this product?')) return;
                          const { error: delErr } = await supabase
                            .from('products')
                            .delete()
                            .eq('id', p.id);
                          if (!delErr) setProducts(prev => prev.filter(pr => pr.id !== p.id));
                        }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          <TabsContent value="orders">
            <div className="text-sm text-muted-foreground p-4">Order integration pending.</div>
          </TabsContent>
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Settings className="h-5 w-5 mr-2" /> Store Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="storeName">Store Name</Label>
                        <Input id="storeName" value={settings.store_name} onChange={e => setSettings(s => ({ ...s, store_name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contactNumber">Contact Number</Label>
                        <Input id="contactNumber" value={settings.contact_phone} onChange={e => setSettings(s => ({ ...s, contact_phone: e.target.value }))} placeholder="e.g. 09xx-xxx-xxxx" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea id="address" value={settings.address} onChange={e => setSettings(s => ({ ...s, address: e.target.value }))} placeholder="Full business address" />
                    </div>
                      <div className="space-y-2">
                        <Label htmlFor="logo">Logo URL</Label>
                        <Input id="logo" value={settings.logo_url} onChange={e => setSettings(s => ({ ...s, logo_url: e.target.value }))} placeholder="https://.../logo.png" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hero">Hero Image URL</Label>
                        <Input id="hero" value={settings.hero_image_url} onChange={e => setSettings(s => ({ ...s, hero_image_url: e.target.value }))} placeholder="https://.../cover.jpg" />
                      </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Accepting Orders</Label>
                      <div className="flex items-center gap-3 rounded-lg border p-3">
                          <Switch id="accepting" checked={settings.accepting_orders} onCheckedChange={(v) => setSettings(s => ({ ...s, accepting_orders: !!v }))} />
                        <Label htmlFor="accepting" className="font-normal text-sm text-muted-foreground">Toggle to pause or resume incoming orders.</Label>
                      </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="deliveryFee">Base Delivery Fee (₱)</Label>
                        <Input id="deliveryFee" type="number" value={settings.base_delivery_fee} onChange={e => setSettings(s => ({ ...s, base_delivery_fee: e.target.value }))} placeholder="e.g. 20" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="about">About Store</Label>
                        <Textarea id="about" value={settings.description} onChange={e => setSettings(s => ({ ...s, description: e.target.value }))} placeholder="Short description for customers" />
                    </div>
                      {settings.logo_url && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <img src={settings.logo_url} alt="logo preview" className="h-10 w-10 rounded object-cover border" onError={(e) => { e.currentTarget.style.display='none'; }} />
                          <span>Preview</span>
                        </div>
                      )}
                  </div>
                </div>
                <div className="flex justify-end mt-6 gap-2">
                    <Button variant="outline" size="sm" disabled={savingSettings} onClick={() => vendor && setSettings({
                      store_name: vendor.store_name || '',
                      contact_phone: vendor.contact_phone || '',
                      address: vendor.address || '',
                      accepting_orders: vendor.accepting_orders ?? true,
                      base_delivery_fee: vendor.base_delivery_fee?.toString() || '',
                      description: vendor.description || '',
                      logo_url: vendor.logo_url || '',
                      hero_image_url: vendor.hero_image_url || ''
                    })}>Reset</Button>
                    <Button size="sm" disabled={savingSettings} onClick={async () => {
                      if (!vendor) return;
                      setSavingSettings(true);
                      const updatePayload: any = {
                        store_name: settings.store_name.trim() || vendor.store_name,
                        contact_phone: settings.contact_phone.trim() || null,
                        address: settings.address.trim() || null,
                        accepting_orders: settings.accepting_orders,
                        base_delivery_fee: settings.base_delivery_fee === '' ? 0 : Number(settings.base_delivery_fee),
                        description: settings.description.trim() || null,
                        logo_url: settings.logo_url.trim() || null,
                        hero_image_url: settings.hero_image_url.trim() || null
                      };
                      const { error: updErr, data: updRow } = await supabase
                        .from('vendors')
                        .update(updatePayload)
                        .eq('id', vendor.id)
                        .select('id,store_name,address,created_at,owner_user_id,contact_phone,accepting_orders,base_delivery_fee,logo_url,hero_image_url,description')
                        .single();
                      if (!updErr && updRow) {
                        setVendor(updRow as VendorRecord);
                      }
                      setSavingSettings(false);
                    }}>{savingSettings ? 'Saving...' : 'Save Changes'}</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    {/* Edit Product Dialog */}
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        {editingProduct && (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={editingProduct.name} onChange={e => setEditingProduct(prev => prev ? { ...prev, name: e.target.value } : prev)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-price">Price (₱)</Label>
                <Input id="edit-price" type="number" value={editingProduct.price} onChange={e => setEditingProduct(prev => prev ? { ...prev, price: Number(e.target.value) } : prev)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-stock">Stock</Label>
                <Input id="edit-stock" type="number" value={editingProduct.stock} onChange={e => setEditingProduct(prev => prev ? { ...prev, stock: Number(e.target.value) } : prev)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-image">Main Image URL</Label>
              <Input id="edit-image" value={editingProduct.main_image_url || ''} onChange={e => setEditingProduct(prev => prev ? { ...prev, main_image_url: e.target.value } : prev)} placeholder="https://.../image.jpg" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea id="edit-desc" value={editingProduct.description || ''} onChange={e => setEditingProduct(prev => prev ? { ...prev, description: e.target.value } : prev)} placeholder="Short product description" />
            </div>
            {savingEdit && <p className="text-xs text-muted-foreground">Saving...</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button type="button" disabled={savingEdit || !editingProduct?.name.trim()} onClick={async () => {
            if (!editingProduct) return;
            setSavingEdit(true);
            const { error: updErr, data } = await supabase
              .from('products')
              .update({ 
                name: editingProduct.name.trim(), 
                price: editingProduct.price, 
                stock: editingProduct.stock, 
                description: editingProduct.description?.trim() || null, 
                main_image_url: editingProduct.main_image_url?.trim() || null 
              })
              .eq('id', editingProduct.id)
              .select('id,name,price,stock,description,main_image_url')
              .single();
            if (!updErr && data) {
              setProducts(prev => prev.map(p => p.id === data.id ? (data as any) : p));
              setEditOpen(false);
            }
            setSavingEdit(false);
          }}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
