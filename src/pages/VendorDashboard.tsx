import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ShoppingCart, Settings, Store, DollarSign, Edit, Trash2, RefreshCw, CheckCircle2, Hourglass, XCircle, MessageSquare, Send, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";

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
  const [vendorOrders, setVendorOrders] = useState<any[]>([]);
  const [vendorOrderItems, setVendorOrderItems] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ salesToday: 0, ordersToday: 0, totalSales: 0, totalOrders: 0 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
  const { toast } = useToast();
  const [msgOrderId, setMsgOrderId] = useState<string | null>(null);
  const [msgText, setMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  async function loadVendorOrders(vendorId: string) {
    setOrdersLoading(true); setOrdersError(null);
    try {
      const { data: rows, error } = await supabase
        .from('orders')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVendorOrders(rows || []);
      if (rows?.length) {
        const ids = rows.map(r => r.id);
        const { data: itemRows } = await supabase
          .from('order_items')
          .select('*, product:products(name)')
          .in('order_id', ids);
        setVendorOrderItems(itemRows || []);
      } else {
        setVendorOrderItems([]);
      }
    } catch (e: any) {
      setOrdersError(e.message || 'Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  }

  async function loadVendorData(background = false) {
    // background=true keeps the UI visible while refetching
    if (!profile?.id) { if (!background) setLoading(false); return; }
    if (background) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('id,store_name,address,created_at,owner_user_id,contact_phone,accepting_orders,base_delivery_fee,logo_url,hero_image_url,description')
        .eq('owner_user_id', profile.id)
        .maybeSingle();
      if (vendorError) throw vendorError;
      setVendor(vendorData as VendorRecord);
      if (vendorData?.id) {
        const { data: productRows } = await supabase
          .from('products')
          .select('id,name,price,stock,description,main_image_url')
          .eq('vendor_id', vendorData.id)
          .order('created_at', { ascending: false });
        setProducts((productRows as ProductRecord[]) || []);
        await loadVendorOrders(vendorData.id);
      } else {
        setProducts([]);
        setVendorOrders([]);
        setVendorOrderItems([]);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load vendor');
    } finally {
      if (background) setRefreshing(false); else setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await loadVendorData(false);
    };
    run();
    return () => { cancelled = true; };
  }, [profile?.id]);

  // Realtime subscription for orders when vendor is known
  useEffect(() => {
    if (!vendor?.id) return;
    const channel = supabase
      .channel('vendor-orders-' + vendor.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `vendor_id=eq.${vendor.id}` }, (payload: any) => {
        setVendorOrders(prev => {
          const next = [...prev];
          const idx = next.findIndex(o => o.id === payload.new.id);
          if (idx >= 0) next[idx] = payload.new; else next.unshift(payload.new);
          return next;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [vendor?.id]);

  // Recompute metrics whenever orders list changes
  useEffect(() => {
    if (!vendorOrders.length) {
      setMetrics({ salesToday: 0, ordersToday: 0, totalSales: 0, totalOrders: 0 });
      return;
    }
    const today = new Date();
    today.setHours(0,0,0,0);
    const salesToday = vendorOrders
      .filter(o => { const d = new Date(o.created_at); return d >= today; })
      .reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
    const ordersToday = vendorOrders.filter(o => { const d = new Date(o.created_at); return d >= today; }).length;
    const totalSales = vendorOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
    const totalOrders = vendorOrders.length;
    setMetrics({ salesToday, ordersToday, totalSales, totalOrders });
  }, [vendorOrders]);

  const [updatingOrderIds, setUpdatingOrderIds] = useState<string[]>([]);
  // Map internal keys -> DB enum labels (as defined in Postgres).
  // DB accepts lowercase values per check constraint; labels are handled in UI
  const DB_STATUS: Record<string,string> = {
    pending: 'pending',
    preparing: 'preparing',
    for_delivery: 'for_delivery',
    delivered: 'delivered',
    cancelled: 'cancelled'
  };
  const normalizeStatus = (s: string) => (s || '').toLowerCase().replace(/\s+/g,'_');
  const changeOrderStatus = async (orderId: string, internalNext: keyof typeof DB_STATUS) => {
    if (updatingOrderIds.includes(orderId)) return;
    const dbNext = DB_STATUS[internalNext];
    if (!dbNext) return;
    setUpdatingOrderIds(ids => [...ids, orderId]);
    const prev = vendorOrders.find(o => o.id === orderId)?.status;
    // Optimistic update with DB label
    setVendorOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, status: dbNext } : o));
    const { error } = await supabase
      .from('orders')
      .update({ status: dbNext })
      .eq('id', orderId);
    if (error) {
      setVendorOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, status: prev } : o));
      toast({ title: 'Status update failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Order updated', description: `Order #${orderId} is now ${dbNext}.` });
    }
    setUpdatingOrderIds(ids => ids.filter(id => id !== orderId));
  };

  const openMessage = (orderId: string) => {
    setMsgOrderId(orderId);
    setMsgText('');
  };

  const sendVendorMessage = async () => {
    if (!msgOrderId || !profile?.id || !vendor?.id || !msgText.trim()) return;
    try {
      setSendingMsg(true);
      // fetch order to get user_id to receive message
      const { data: orderRow, error: ordErr } = await supabase.from('orders').select('id,user_id').eq('id', msgOrderId).single();
      if (ordErr) throw ordErr;
      const content = msgText.trim();
      await supabase.from('messages').insert({ vendor_id: vendor.id, sender_user_id: profile.id, receiver_user_id: orderRow.user_id, content });
      toast({ title: 'Message sent', description: 'Customer notified.' });
      setMsgOrderId(null);
    } catch (e: any) {
      toast({ title: 'Send failed', description: e.message || 'Please retry', variant: 'destructive' });
    } finally {
      setSendingMsg(false);
    }
  };

  // Returns a badge element for a (possibly mixed-case) status.
  const vendorStatusBadge = (rawStatus: string) => {
    const norm = normalizeStatus(rawStatus);
    switch (norm) {
      case 'pending':
        return <Badge variant="outline" className="text-xs">Pending</Badge>;
      case 'new':
      case 'created':
        return <Badge variant="secondary" className="text-xs">New</Badge>;
      case 'preparing':
        return <Badge className="bg-amber-500 hover:bg-amber-500 text-xs">Preparing</Badge>;
      case 'for_delivery':
        return <Badge className="bg-orange-500 hover:bg-orange-500 text-xs">For Delivery</Badge>;
      case 'delivered':
        return <Badge className="bg-green-600 hover:bg-green-600 text-xs">Delivered</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="text-xs">Cancelled</Badge>;
      case 'ready': // legacy visual support
        return <Badge className="bg-orange-500 hover:bg-orange-500 text-xs">For Delivery</Badge>;
      case 'completed':
        return <Badge className="bg-green-600 hover:bg-green-600 text-xs">Delivered</Badge>;
      default:
        return <Badge variant="outline" className="text-xs capitalize">{rawStatus}</Badge>;
    }
  };

  // All orders now follow a single flow: new|created -> preparing -> for_delivery -> delivered


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

  if (!loading && !profile?.id) {
    return <div className="p-6 text-sm text-muted-foreground">User profile not loaded yet. Try refreshing or re-login.</div>;
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
                <Button size="sm" variant="outline" disabled={refreshing || loading} onClick={() => loadVendorData(true)}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                </Button>
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
                <div className="mt-1 text-lg font-semibold">₱{metrics.salesToday.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Today's Orders</span>
                  <ShoppingCart className="h-3 w-3" />
                </div>
                <div className="mt-1 text-lg font-semibold">{metrics.ordersToday}</div>
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total Sales</span>
                  <DollarSign className="h-3 w-3" />
                </div>
                <div className="mt-1 text-lg font-semibold">₱{metrics.totalSales.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total Orders</span>
                  <ShoppingCart className="h-3 w-3" />
                </div>
                <div className="mt-1 text-lg font-semibold">{metrics.totalOrders}</div>
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Orders</CardTitle>
              <Button size="sm" variant="outline" disabled={ordersLoading} onClick={() => vendor && loadVendorOrders(vendor.id)}>
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
              </CardHeader>
              <CardContent className="space-y-4">
              {ordersError && <div className="text-xs text-destructive border border-destructive/40 p-2 rounded bg-destructive/5">{ordersError}</div>}
              {ordersLoading && <div className="text-xs text-muted-foreground">Loading orders...</div>}
              {!ordersLoading && vendorOrders.length === 0 && <div className="text-xs text-muted-foreground">No orders yet.</div>}
              <div className="space-y-4">
                {vendorOrders.map(o => {
                const its = vendorOrderItems.filter(i => i.order_id === o.id);
                const totalQty = its.reduce((s,i)=>s+i.quantity,0);
                const normalized = normalizeStatus(o.status || '');
                return (
                  <div key={o.id} className="border rounded-md p-3 space-y-3 bg-muted/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                    <div className="text-xs font-medium">Order #{o.id}</div>
                    <div className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">Items: {its.length} • Qty: {totalQty}</div>
                    </div>
                    {vendorStatusBadge(o.status)}
                  </div>
                  <div className="space-y-2 text-xs">
                    {its.map(it => (
                    <div key={it.id} className="flex justify-between">
                      <span className="truncate mr-2">{it.product?.name || it.product_id} × {it.quantity}</span>
                      <span>₱{(it.unit_price * it.quantity).toLocaleString()}</span>
                    </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t mt-2">
                    <span>Total</span>
                    <span>₱{o.total.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {/* Action buttons with dual-flow + case-insensitive logic */}
                    {(normalized === 'pending' || normalized === 'new' || normalized === 'created') && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7"
                        disabled={updatingOrderIds.includes(o.id)}
                        onClick={()=>changeOrderStatus(o.id,'preparing')}
                      >
                        {updatingOrderIds.includes(o.id) ? (
                          <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Hourglass className="h-3.5 w-3.5 mr-1" />
                        )}
                        Prep
                      </Button>
                    )}
                    {normalized === 'preparing' && (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 bg-orange-500 hover:bg-orange-500"
                        disabled={updatingOrderIds.includes(o.id)}
                        onClick={()=>changeOrderStatus(o.id,'for_delivery')}
                      >
                        {updatingOrderIds.includes(o.id) ? (
                          <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        )}
                        For Delivery
                      </Button>
                    )}
                    {normalized === 'for_delivery' && (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 bg-green-600 hover:bg-green-600"
                        disabled={updatingOrderIds.includes(o.id)}
                        onClick={()=>changeOrderStatus(o.id,'delivered')}
                      >
                        {updatingOrderIds.includes(o.id) ? (
                          <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        )}
                        Delivered
                      </Button>
                    )}
                    {normalized !== 'cancelled' && normalized !== 'delivered' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-destructive border-destructive/40"
                        disabled={updatingOrderIds.includes(o.id)}
                        onClick={()=>changeOrderStatus(o.id,'cancelled')}
                      >
                        {updatingOrderIds.includes(o.id) ? (
                          <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                        )}
                        Cancel
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" className="h-7" onClick={()=>openMessage(o.id)}>
                      <MessageSquare className="h-3.5 w-3.5 mr-1" /> Message
                    </Button>
                  </div>
                  </div>
                );
                })}
              </div>
              </CardContent>
            </Card>
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
    {/* Order Messaging Dialog */}
    <Dialog open={!!msgOrderId} onOpenChange={(o)=>{ if(!o) setMsgOrderId(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">Message Customer
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>setMsgOrderId(null)}><X className="h-4 w-4" /></Button>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Textarea value={msgText} onChange={e=>setMsgText(e.target.value)} placeholder="Type a message about this order (e.g., clarification, delay notice)..." rows={4} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={()=>setMsgOrderId(null)}>Cancel</Button>
            <Button size="sm" disabled={!msgText.trim() || sendingMsg} onClick={sendVendorMessage}>
              {sendingMsg ? 'Sending...' : (<span className="inline-flex items-center gap-1"><Send className="h-3.5 w-3.5" /> Send</span>)}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Message will appear in both your Messages and the customer's inbox.</p>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
