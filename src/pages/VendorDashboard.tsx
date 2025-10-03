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

interface VendorRecord { id: string; store_name: string; address: string | null; created_at?: string; owner_user_id?: string }
interface ProductRecord { id: string; name: string; price: number; stock: number; status?: string }

export default function VendorDashboard() {
  const { profile, signOut } = useAuth();
  const [vendor, setVendor] = useState<VendorRecord | null>(null);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', stock: '' });
  const [editOpen, setEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!profile?.auth_user_id) return;
      setLoading(true);
      setError(null);
      // Fetch vendor row
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('id,store_name,address,created_at,owner_user_id')
        .eq('owner_user_id', profile.auth_user_id)
        .maybeSingle();
      if (vendorError) { setError(vendorError.message); setLoading(false); return; }
      setVendor(vendorData as VendorRecord);
      if (vendorData?.id) {
        const { data: productRows } = await supabase
          .from('products')
          .select('id,name,price,stock,status')
          .eq('vendor_id', vendorData.id)
          .order('created_at', { ascending: false });
        setProducts((productRows as ProductRecord[]) || []);
      }
      setLoading(false);
    };
    load();
  }, [profile?.auth_user_id]);

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
                          })
                          .select('id,name,price,stock,status')
                          .single();
                        if (!insertErr && inserted) {
                          setProducts(prev => [inserted as any, ...prev]);
                          setOpen(false);
                          setNewProduct({ name: '', price: '', stock: '' });
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
                <div className="mt-1 text-lg font-semibold">₱0.00</div>
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Orders</span>
                  <ShoppingCart className="h-3 w-3" />
                </div>
                <div className="mt-1 text-lg font-semibold">0</div>
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
                const statusBadge = p.status === "Active" ? (
                  <Badge className="bg-green-600 hover:bg-green-600">Active</Badge>
                ) : p.status === "Low Stock" ? (
                  <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-500">Low Stock</Badge>
                ) : (
                  <Badge variant="destructive">Out of Stock</Badge>
                );
                return (
                  <Card key={p.id} className="relative group">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground">#{p.id}</div>
                          <h3 className="font-medium leading-snug">{p.name}</h3>
                        </div>
                        {statusBadge}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">₱{p.price}</span>
                        <span className={`text-xs px-2 py-1 rounded-full border ${p.stock === 0 ? 'text-destructive border-destructive/40' : p.stock < 10 ? 'text-amber-600 border-amber-400/50' : 'text-muted-foreground border-border'}`}>{p.stock} in stock</span>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="secondary" className="h-7 px-2" onClick={() => { setEditingProduct(p); setEditOpen(true); }}><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-destructive border-destructive/40"><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
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
                      <Input id="storeName" defaultValue={vendor.store_name} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input id="contactNumber" placeholder="e.g. 09xx-xxx-xxxx" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea id="address" placeholder="Full business address" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Accepting Orders</Label>
                      <div className="flex items-center gap-3 rounded-lg border p-3">
                        <Switch id="accepting" defaultChecked />
                        <Label htmlFor="accepting" className="font-normal text-sm text-muted-foreground">Toggle to pause or resume incoming orders.</Label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deliveryFee">Base Delivery Fee (₱)</Label>
                      <Input id="deliveryFee" type="number" placeholder="e.g. 20" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="about">About Store</Label>
                      <Textarea id="about" placeholder="Short description for customers" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-6 gap-2">
                  <Button variant="outline" size="sm">Reset</Button>
                  <Button size="sm">Save Changes</Button>
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
              .update({ name: editingProduct.name.trim(), price: editingProduct.price, stock: editingProduct.stock })
              .eq('id', editingProduct.id)
              .select('id,name,price,stock,status')
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
