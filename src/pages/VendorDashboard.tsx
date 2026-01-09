import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ShoppingCart, Settings, Store, DollarSign, Edit, Trash2, RefreshCw, CheckCircle2, Hourglass, XCircle, MessageSquare, Send, X, Package, LogOut, FileDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

interface VendorRecord { id: string; store_name: string; address: string | null; created_at?: string; owner_user_id?: string; contact_phone?: string | null; accepting_orders?: boolean; base_delivery_fee?: number | null; logo_url?: string | null; hero_image_url?: string | null; description?: string | null }
interface ProductRecord { id: string; name: string; price: number; stock: number; description?: string | null; main_image_url?: string | null; category?: string | null; address?: string | null; size_options?: string[] | null; updated_at?: string | null; created_at?: string | null }

export default function VendorDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<VendorRecord | null>(null);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', stock: '', description: '', main_image_url: '', category: '', address: '', size_options: [] as string[] });
  const [newCategoryMode, setNewCategoryMode] = useState<string>('');
  const [newProductFile, setNewProductFile] = useState<File | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [editCategoryMode, setEditCategoryMode] = useState<string>('');
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [stockFilter, setStockFilter] = useState<'all' | 'out' | 'low' | 'in'>('all');
  const lowThreshold = 10;
  const [vendorOrders, setVendorOrders] = useState<any[]>([]);
  const [vendorOrderItems, setVendorOrderItems] = useState<any[]>([]);
  const [orderRatings, setOrderRatings] = useState<Record<string, { rating: number; review?: string }>>({});
  const [customerProfiles, setCustomerProfiles] = useState<Record<string, { name: string; email?: string; username?: string }>>({});
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
  const SIZE_OPTIONS = ['XS','S','M','L','XL','XXL'];
  const [msgOrderId, setMsgOrderId] = useState<string | null>(null);
  const [msgText, setMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const vendorTabKey = 'vendor-dashboard-tab';
  const allowedVendorTabs: Array<"overview" | "products" | "orders" | "reports" | "settings"> = ["overview","products","orders","reports","settings"];
  const [tab, setTab] = useState<"overview" | "products" | "orders" | "reports" | "settings">(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(vendorTabKey) : null;
    return allowedVendorTabs.includes(stored as any) ? stored as any : "overview";
  });

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(vendorTabKey, tab);
    }
  }, [tab]);
  const vendorAddress = vendor?.address?.trim() || '';

  const sales7d = useMemo(() => {
    const map = new Map<string, number>();
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0,10);
      map.set(key, 0);
    }
    vendorOrders.forEach(o => {
      const key = o.created_at ? new Date(o.created_at).toISOString().slice(0,10) : '';
      if (map.has(key)) map.set(key, (map.get(key) || 0) + Number(o.total || 0));
    });
    return Array.from(map.entries()).map(([date, total]) => ({ date: date.slice(5), total }));
  }, [vendorOrders]);

  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    vendorOrders.forEach(o => {
      const key = (o.status || 'pending').toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([status, value]) => ({ status, value }));
  }, [vendorOrders]);

  const userLabel = useCallback((userId?: string | number | null, userObj?: any) => {
    const key = userId ? String(userId) : '';
    return userObj?.full_name
      || userObj?.email
      || (key && (customerProfiles[key]?.name || customerProfiles[key]?.username || customerProfiles[key]?.email))
      || 'Customer';
  }, [customerProfiles]);

  const topCustomers = useMemo(() => {
    const map: Record<string, { orders: number; total: number; user?: any }> = {};
    vendorOrders.forEach(o => {
      const key = o.user_id ? String(o.user_id) : '';
      if (!key) return;
      if (!map[key]) map[key] = { orders: 0, total: 0, user: o.user };
      map[key].orders += 1;
      map[key].total += Number(o.total || 0);
      if (o.user) map[key].user = o.user;
    });
    return Object.entries(map)
      .map(([userId, stats]) => ({
        userId,
        ...stats,
        label: userLabel(userId, stats.user)
      }))
      .sort((a, b) => b.orders === a.orders ? b.total - a.total : b.orders - a.orders)
      .slice(0, 5);
  }, [vendorOrders, customerProfiles, userLabel]);

  const recentOrders = useMemo(() => {
    return [...vendorOrders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [vendorOrders]);

  // Block pending/rejected vendors from using dashboard
  useEffect(() => {
    if (!profile) return;
    const isVendor = profile.role === 'vendor';
    const status = profile.vendor_status || 'pending';
    if (isVendor && status !== 'approved') {
      const description = status === 'rejected'
        ? 'Your vendor account was rejected. Contact support for details.'
        : 'Your vendor account is pending approval. Please wait for an admin to approve.';
      toast({
        title: status === 'rejected' ? 'Vendor access blocked' : 'Vendor pending approval',
        description,
        variant: status === 'rejected' ? 'destructive' : 'default'
      });
      signOut();
      navigate('/login/vendor');
    }
  }, [profile, toast, signOut, navigate]);

    const PRODUCT_BUCKET = import.meta.env.VITE_PRODUCT_BUCKET || 'product-images';
    const CATEGORY_OPTIONS = ['Fashion','Food & Drinks','Home & Living','Gifts & Crafts','Electronics','Health & Beauty'];
    const CUSTOM_CATEGORY_VALUE = '__custom__';

    const uploadProductImage = async (file: File, vendorId: string) => {
      const ext = file.name.split('.').pop() || 'jpg';
      const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      const path = `${vendorId}/${id}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from(PRODUCT_BUCKET).upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) {
        toast({ title: 'Image upload failed', description: uploadErr.message, variant: 'destructive' });
        return null;
      }
      const { data: publicData } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path);
      return publicData?.publicUrl || null;
    };

  async function loadVendorOrders(vendorId: string) {
    setOrdersLoading(true); setOrdersError(null);
    try {
      const { data: rows, error } = await supabase
        .from('orders')
        .select('*, user:users(id, full_name, email)')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVendorOrders(rows || []);
      if (rows?.length) {
        const ids = rows.map(r => r.id);
        const [{ data: itemRows }, { data: ratingRows }] = await Promise.all([
          supabase
            .from('order_items')
            .select('*, product:products(name)')
            .in('order_id', ids),
          supabase
            .from('order_ratings')
            .select('order_id,rating,review')
            .in('order_id', ids),
        ]);
        setVendorOrderItems(itemRows || []);
        setOrderRatings(() => {
          const map: Record<string, { rating: number; review?: string }> = {};
          (ratingRows || []).forEach((r: any) => {
            map[String(r.order_id)] = { rating: Number(r.rating) || 0, review: r.review };
          });
          return map;
        });
      } else {
        setVendorOrderItems([]);
        setOrderRatings({});
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
      const vendorSelect = 'id,store_name,name,address,owner_user_id,logo_url,created_at';

      // Resolve the numeric/uuid user id from the users table to avoid casting issues
      const userIds: string[] = [];
      if (profile.id) userIds.push(profile.id);
      if (profile.auth_user_id) {
        const { data: userRows } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', profile.auth_user_id);
        (userRows || []).forEach((u: any) => { if (u?.id && !userIds.includes(String(u.id))) userIds.push(String(u.id)); });
      }

      let resolvedVendor: VendorRecord | null = null;
      let vendorError: any = null;
      if (userIds.length) {
        const { data, error } = await supabase
          .from('vendors')
          .select(vendorSelect)
          .in('owner_user_id', userIds)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        resolvedVendor = data as VendorRecord | null;
        vendorError = error;
      }

      if (vendorError && !resolvedVendor) throw vendorError;

      setVendor(resolvedVendor);
      if (resolvedVendor?.id) {
        const { data: productRows } = await supabase
          .from('products')
          .select('id,name,price,stock,description,main_image_url,created_at')
          .eq('vendor_id', resolvedVendor.id)
          .order('created_at', { ascending: false });
        setProducts(((productRows as ProductRecord[]) || []).map(p => ({
          ...p,
          size_options: (p as any).size_options || [],
          category: (p as any).category || null,
          address: (p as any).address || null,
          updated_at: (p as any).updated_at || (p as any).created_at || null,
          created_at: (p as any).created_at || null
        })));
        await loadVendorOrders(String(resolvedVendor.id));
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

  const filteredProducts = useMemo(() => {
    const priority = (p: ProductRecord) => {
      const stock = p.stock ?? 0;
      if (stock <= 0) return 0; // out of stock first
      if (stock < lowThreshold) return 1; // then low stock
      return 2; // then the rest
    };

    return products
      .filter(p => {
        if (stockFilter === 'out') return (p.stock ?? 0) <= 0;
        if (stockFilter === 'low') return (p.stock ?? 0) > 0 && (p.stock ?? 0) < lowThreshold;
        if (stockFilter === 'in') return (p.stock ?? 0) >= lowThreshold;
        return true;
      })
      .slice()
      .sort((a, b) => {
        const pa = priority(a);
        const pb = priority(b);
        if (pa !== pb) return pa - pb;
        // Secondary: recently updated/created first
        const aDate = new Date((a as any).updated_at || a.created_at || 0).getTime();
        const bDate = new Date((b as any).updated_at || b.created_at || 0).getTime();
        return bDate - aDate;
      });
  }, [products, stockFilter, lowThreshold]);

  const lowStockToastRef = useRef(false);
  useEffect(() => {
    if (!products.length || lowStockToastRef.current) return;
    const lows = products.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) < lowThreshold);
    const outs = products.filter(p => (p.stock ?? 0) <= 0);
    if (lows.length || outs.length) {
      toast({ title: 'Inventory alert', description: `${outs.length} out of stock, ${lows.length} low stock items.` });
      lowStockToastRef.current = true;
    }
  }, [products, toast]);

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

  // Pull customer profile info for labeling customers in overview cards (best-effort)
  useEffect(() => {
    const ids = Array.from(new Set((vendorOrders || []).map(o => o.user_id).filter(Boolean))).map(String);
    const missing = ids.filter(id => !customerProfiles[id]);
    if (!missing.length) return;
    let cancelled = false;
    const fetchProfiles = async () => {
      const { data: userRows, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', missing);

      if (cancelled) return;
      if (error) return;

      setCustomerProfiles(prev => {
        const next = { ...prev } as Record<string, { name: string; email?: string; username?: string }>;
        (userRows || []).forEach((row: any) => {
          const key = String(row.id);
          next[key] = {
            name: next[key]?.name || row.full_name || row.email || 'Customer',
            email: next[key]?.email || row.email,
          };
        });
        return next;
      });
    };
    fetchProfiles();
    return () => { cancelled = true; };
  }, [vendorOrders, customerProfiles]);

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

  const downloadStyledReport = useCallback((filename: string, title: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) => {
    if (!rows.length) return;
    const escapeHtml = (val: unknown) => String(val ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const headRow = headers.map(h => `<th style="padding:8px 10px;border:1px solid #e5e7eb;background:#111827;color:#f9fafb;text-align:left;">${escapeHtml(h)}</th>`).join('');
    const bodyRows = rows.map(r => `<tr>${r.map(cell => `<td style="padding:7px 10px;border:1px solid #e5e7eb;">${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>
      body{font-family:Arial,Helvetica,sans-serif;background:#f8fafc;color:#0f172a;}
      h2{margin-bottom:12px;}
      table{border-collapse:collapse;width:100%;background:#fff;box-shadow:0 10px 30px rgba(15,23,42,0.08);border-radius:10px;overflow:hidden;}
      thead tr th:first-child{border-top-left-radius:10px;} thead tr th:last-child{border-top-right-radius:10px;}
      tbody tr:nth-child(even){background:#f8fafc;}
    </style></head><body>
      <h2>${escapeHtml(title)}</h2>
      <table><thead><tr>${headRow}</tr></thead><tbody>${bodyRows}</tbody></table>
    </body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadOrdersReport = useCallback(() => {
    const headers = ['Order ID', 'Created At', 'Status', 'Customer', 'Total Quantity', 'Total Amount'];
    const rows = vendorOrders.map(o => {
      const its = vendorOrderItems.filter(i => i.order_id === o.id);
      const totalQty = its.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0);
      const customer = userLabel(o.user_id, o.user);
      return [o.id, o.created_at, o.status, customer, totalQty, o.total];
    });
    downloadStyledReport('vendor-orders.xls', 'Orders', headers, rows);
  }, [vendorOrders, vendorOrderItems, userLabel, downloadStyledReport]);

  const downloadProductsReport = useCallback(() => {
    const headers = ['Product ID', 'Name', 'Price', 'Stock', 'Updated At'];
    const rows = products.map(p => [p.id, p.name, p.price, p.stock, (p as any).updated_at || p.created_at || '']);
    downloadStyledReport('vendor-products.xls', 'Products', headers, rows);
  }, [products, downloadStyledReport]);

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

  // Default product address to vendor address when present
  useEffect(() => {
    if (vendorAddress) {
      setNewProduct(p => ({ ...p, address: vendorAddress }));
    }
  }, [vendorAddress]);

  useEffect(() => {
    if (!open) {
      setNewCategoryMode('');
    }
  }, [open]);

  useEffect(() => {
    if (!editOpen) {
      setEditCategoryMode('');
    }
  }, [editOpen]);

  useEffect(() => {
    if (!editingProduct) {
      setEditCategoryMode('');
      return;
    }
    const derived = CATEGORY_OPTIONS.includes(editingProduct.category || '')
      ? (editingProduct.category || '')
      : ((editingProduct.category || '') ? CUSTOM_CATEGORY_VALUE : '');
    setEditCategoryMode(derived);
  }, [editingProduct, CATEGORY_OPTIONS]);

  const navItems = [
    { key: "overview", label: "Overview", icon: Store },
    { key: "products", label: "Products", icon: Package },
    { key: "orders", label: "Orders", icon: ShoppingCart },
    { key: "reports", label: "Reports", icon: FileDown },
    { key: "settings", label: "Settings", icon: Settings },
    { key: "messages", label: "Messages", icon: MessageSquare },
  ];

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

  const newCategorySelectValue = newCategoryMode
    ? newCategoryMode
    : (CATEGORY_OPTIONS.includes(newProduct.category)
      ? newProduct.category
      : (newProduct.category ? CUSTOM_CATEGORY_VALUE : ''));
  const newCategoryIsCustom = newCategorySelectValue === CUSTOM_CATEGORY_VALUE;
  const editCategorySelectValue = editCategoryMode
    ? editCategoryMode
    : (editingProduct
      ? (CATEGORY_OPTIONS.includes(editingProduct.category || '') ? (editingProduct.category || '') : ((editingProduct.category || '') ? CUSTOM_CATEGORY_VALUE : ''))
      : '');
  const editCategoryIsCustom = editCategorySelectValue === CUSTOM_CATEGORY_VALUE;

  return (
    <>
      <DashboardShell
        roleLabel="Vendor"
        title="Vendor Console"
        navItems={navItems}
        activeKey={tab}
        onSelect={(key) => {
          if (key === 'messages') { navigate('/vendor/messages'); return; }
          setTab(key as typeof tab);
        }}
        footerAction={<Button variant="outline" size="sm" className="w-full" onClick={async () => { await signOut(); navigate('/login/vendor'); }}><LogOut className="h-4 w-4 mr-1" /> Logout</Button>}
      >
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <div className="max-w-5xl mx-auto space-y-6">
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
                  
                      <Button size="sm" variant="outline" disabled={refreshing || loading} onClick={() => loadVendorData(true)}>
                        <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                      </Button>
                      <Button size="sm" onClick={() => setOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" /> New Product
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                    <div className="rounded-lg border p-3 bg-muted/30">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Today's Sales</span>
                        
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <Card className="border-none shadow-none bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Sales (Last 7 Days)</CardTitle>
                      </CardHeader>
                      <CardContent className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sales7d}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} width={50} />
                            <Tooltip formatter={(v:number)=>`₱${Number(v).toLocaleString(undefined,{minimumFractionDigits:2})}`} labelFormatter={(l)=>`Date: ${l}`} />
                            <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                    <Card className="border-none shadow-none bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Order Status Mix</CardTitle>
                      </CardHeader>
                      <CardContent className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={statusBreakdown} dataKey="value" nameKey="status" outerRadius={70} label>
                              {statusBreakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={["#2563eb", "#f59e0b", "#10b981", "#ef4444", "#6366f1"][index % 5]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v:number, _name, d:any)=>[v, (d?.payload?.status||'').replace(/_/g,' ')]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <Card className="border-none shadow-none bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Top Customers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!topCustomers.length && (
                          <div className="text-xs text-muted-foreground">No customer history yet.</div>
                        )}
                        {!!topCustomers.length && (
                          <div className="space-y-2">
                            {topCustomers.map(c => (
                              <div key={c.userId} className="flex items-center justify-between rounded-lg border bg-background/70 px-3 py-2">
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold">{c.label}</span>
                                  <span className="text-[11px] text-muted-foreground">Orders: {c.orders}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold">₱{c.total.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                                  <div className="text-[11px] text-muted-foreground">Lifetime spend</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    <Card className="border-none shadow-none bg-muted/40">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Recent Orders</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!recentOrders.length && (
                          <div className="text-xs text-muted-foreground">No orders yet.</div>
                        )}
                        {!!recentOrders.length && (
                          <div className="space-y-3">
                            {recentOrders.map(o => {
                              const label = userLabel(o.user_id, o.user);
                              const ratingRow = orderRatings[String(o.id)];
                              return (
                                <div key={o.id} className="rounded-lg border bg-background/70 px-3 py-2 space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold">Order #{o.id}</span>
                                    {vendorStatusBadge(o.status)}
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>{label}</span>
                                    <span>{new Date(o.created_at).toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span>Total</span>
                                    <span className="font-semibold">₱{Number(o.total || 0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                                  </div>
                                  {ratingRow && (
                                    <div className="text-[10px] text-amber-600 font-semibold">Rating: {ratingRow.rating}/5</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="products">
            <div className="max-w-5xl mx-auto space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <h2 className="text-sm font-medium text-muted-foreground">Total Products: {products.length}</h2>
                <div className="flex items-center gap-2">
                  <Select value={stockFilter} onValueChange={(v)=>setStockFilter(v as any)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Stock filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="out">Out of Stock</SelectItem>
                      <SelectItem value="low">Low Stock (&lt; {lowThreshold})</SelectItem>
                      <SelectItem value="in">In Stock</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Product</Button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {filteredProducts.map(p => {
                  const statusBadge = p.stock === 0 ? (
                    <Badge variant="destructive">Out of Stock</Badge>
                  ) : p.stock < lowThreshold ? (
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
                          <span className="font-semibold">₱{Number(p.price).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                          <span className={`text-xs px-2 py-1 rounded-full border ${p.stock === 0 ? 'text-destructive border-destructive/40' : p.stock < lowThreshold ? 'text-amber-600 border-amber-400/50' : 'text-muted-foreground border-border'}`}>{p.stock} in stock</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">Added: {p.created_at ? new Date(p.created_at).toLocaleString() : '-'}</div>
                        <div className="text-[11px] text-muted-foreground">Updated: {p.updated_at ? new Date(p.updated_at).toLocaleString() : '-'}</div>
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
            </div>
          </TabsContent>
          <TabsContent value="orders">
            <div className="max-w-5xl mx-auto">
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
                      const ratingRow = orderRatings[String(o.id)];
                      return (
                        <div key={o.id} className="border rounded-md p-3 space-y-3 bg-muted/20">
                            <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="text-xs font-semibold">
                              Order #{o.id}: {o.user?.full_name || userLabel(o.user_id, o.user)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                              <div className="text-[10px] text-muted-foreground">Items: {its.length} • Qty: {totalQty}</div>
                              {ratingRow && (
                              <div className="text-[10px] text-amber-600 font-semibold">Rating: {ratingRow.rating}/5</div>
                              )}
                            </div>
                            {vendorStatusBadge(o.status)}
                            </div>
                          <div className="space-y-2 text-xs">
                            {its.map(it => (
                              <div key={it.id} className="flex justify-between">
                                <span className="truncate mr-2">{it.product?.name || it.product_id} × {it.quantity}</span>
                                <span>₱{(it.unit_price * it.quantity).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t mt-2">
                            <span>Total</span>
                            <span>₱{o.total.toLocaleString()}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-2">
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
            </div>
          </TabsContent>
          <TabsContent value="reports">
            <div className="max-w-5xl mx-auto">
              <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-4">
                  <CardTitle className="text-base flex items-center gap-2"><FileDown className="h-4 w-4" /> Reports</CardTitle>
                  <div className="text-xs text-muted-foreground">Download CSV exports for your records.</div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="border rounded-md p-3 bg-muted/30 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Orders Report</div>
                        <Badge variant="secondary" className="text-[11px]">CSV</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Exports all vendor orders with status, totals, and customer label.</p>
                      <Button size="sm" className="w-fit" onClick={downloadOrdersReport} disabled={!vendorOrders.length}>
                        <FileDown className="h-4 w-4 mr-2" /> Download Orders
                      </Button>
                    </div>
                    <div className="border rounded-md p-3 bg-muted/30 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Products Report</div>
                        <Badge variant="secondary" className="text-[11px]">CSV</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Exports your product list with price, stock, and category.</p>
                      <Button size="sm" className="w-fit" onClick={downloadProductsReport} disabled={!products.length}>
                        <FileDown className="h-4 w-4 mr-2" /> Download Products
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="settings">
            <div className="max-w-5xl mx-auto">
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
            </div>
          </TabsContent>
        </Tabs>
      </DashboardShell>

      <Dialog open={open} onOpenChange={setOpen}>
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
              <Label htmlFor="prod-image">Main Image</Label>
              <Input
              id="prod-image"
              type="file"
              accept="image/*"
              onChange={(e) => setNewProductFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prod-image-file">Upload Image (optional)</Label>
              <Input id="prod-image-file" type="file" accept="image/*" onChange={(e) => setNewProductFile(e.target.files?.[0] || null)} />
              {newProductFile && <p className="text-[11px] text-muted-foreground">Selected: {newProductFile.name}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="prod-category">Category</Label>
              <Select
                value={newCategorySelectValue}
                onValueChange={(val) => {
                  setNewCategoryMode(val);
                  if (val === CUSTOM_CATEGORY_VALUE) {
                    setNewProduct(p => ({ ...p, category: CATEGORY_OPTIONS.includes(p.category) ? '' : p.category, size_options: [] }));
                    return;
                  }
                  setNewProduct(p => ({ ...p, category: val, size_options: val === 'Fashion' ? p.size_options : [] }));
                }}
              >
                <SelectTrigger id="prod-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_CATEGORY_VALUE}>Custom category</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newCategoryIsCustom && (
              <div className="space-y-1">
                <Label htmlFor="prod-category-custom">Custom Category</Label>
                <Input
                  id="prod-category-custom"
                  value={newProduct.category}
                  onChange={(e) => setNewProduct(p => ({ ...p, category: e.target.value }))}
                  placeholder="Enter a custom category"
                />
                <p className="text-[11px] text-muted-foreground">Used when the product does not fit existing categories.</p>
              </div>
            )}
            {newProduct.category === 'Fashion' && (
              <div className="space-y-2">
                <Label>Sizes</Label>
                <div className="flex flex-wrap gap-2">
                  {SIZE_OPTIONS.map(size => {
                    const selected = newProduct.size_options.includes(size);
                    return (
                      <Button
                        key={size}
                        type="button"
                        variant={selected ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setNewProduct(p => ({ ...p, size_options: selected ? p.size_options.filter(s => s !== size) : [...p.size_options, size] }))}
                        className="h-8 px-3"
                      >
                        {size}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">Only for Fashion products. Leave empty to allow one-size.</p>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="prod-desc">Description</Label>
              <Textarea id="prod-desc" value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))} placeholder="Short product description" />
            </div>
            <div className="space-y-1 hidden">
              <Label htmlFor="prod-address">Product Address</Label>
              <Textarea
                id="prod-address"
                value={vendorAddress || newProduct.address}
                onChange={e => setNewProduct(p => ({ ...p, address: e.target.value }))}
                placeholder="Uses your business address by default"
                disabled={!!vendorAddress}
              />
              <p className="text-[11px] text-muted-foreground">{vendorAddress ? 'Using your registered business address.' : 'No business address on file; add one here.'}</p>
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
              let imageUrl = newProduct.main_image_url.trim() ? newProduct.main_image_url.trim() : null;
              if (newProductFile) {
                const uploaded = await uploadProductImage(newProductFile, String(vendor.id));
                if (uploaded) imageUrl = uploaded;
              }
              // Address column not present in current schema; skip enforcing it
              const finalCategory = newProduct.category.trim();
              if (newCategoryIsCustom && !finalCategory) {
                toast({ title: 'Custom category required', description: 'Enter a category name or pick an existing one.', variant: 'destructive' });
                setCreating(false);
                return;
              }
              const insertPayload: any = {
                vendor_id: vendor.id,
                name: newProduct.name.trim(),
                price: isNaN(priceNum) ? 0 : priceNum,
                stock: isNaN(stockNum) ? 0 : stockNum,
                description: newProduct.description.trim() ? newProduct.description.trim() : null,
                main_image_url: imageUrl
              };
              const { data: inserted, error: insertErr } = await supabase
                .from('products')
                .insert(insertPayload)
                .select('id,name,price,stock,description,main_image_url,created_at')
                .single();
              if (!insertErr && inserted) {
                setProducts(prev => [{ ...(inserted as any), size_options: (inserted as any).size_options || [] }, ...prev]);
                setOpen(false);
                setNewProduct({ name: '', price: '', stock: '', description: '', main_image_url: '', category: '', address: vendorAddress || '', size_options: [] });
                setNewCategoryMode('');
                setNewProductFile(null);
              }
              setCreating(false);
            }} type="button">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Label htmlFor="edit-image-file">Upload Image (optional)</Label>
              <Input id="edit-image-file" type="file" accept="image/*" onChange={(e) => setEditingFile(e.target.files?.[0] || null)} />
              {editingFile && <p className="text-[11px] text-muted-foreground">Selected: {editingFile.name}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={editCategorySelectValue}
                onValueChange={(val) => {
                  setEditCategoryMode(val);
                  setEditingProduct(prev => {
                    if (!prev) return prev;
                    if (val === CUSTOM_CATEGORY_VALUE) {
                      return { ...prev, category: CATEGORY_OPTIONS.includes(prev.category || '') ? '' : (prev.category || ''), size_options: [] };
                    }
                    return { ...prev, category: val, size_options: val === 'Fashion' ? (prev.size_options || []) : [] };
                  });
                }}
              >
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_CATEGORY_VALUE}>Custom category</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editCategoryIsCustom && (
              <div className="space-y-1">
                <Label htmlFor="edit-category-custom">Custom Category</Label>
                <Input
                  id="edit-category-custom"
                  value={editingProduct.category || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, category: e.target.value } : prev)}
                  placeholder="Enter a custom category"
                />
                <p className="text-[11px] text-muted-foreground">Saved exactly as typed.</p>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea id="edit-desc" value={editingProduct.description || ''} onChange={e => setEditingProduct(prev => prev ? { ...prev, description: e.target.value } : prev)} placeholder="Short product description" />
            </div>
            {editingProduct.category === 'Fashion' && (
              <div className="space-y-2">
                <Label>Sizes</Label>
                <div className="flex flex-wrap gap-2">
                  {SIZE_OPTIONS.map(size => {
                    const selected = (editingProduct.size_options || []).includes(size);
                    return (
                      <Button
                        key={size}
                        type="button"
                        variant={selected ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setEditingProduct(prev => prev ? { ...prev, size_options: selected ? (prev.size_options || []).filter(s => s !== size) : [ ...(prev.size_options || []), size ] } : prev)}
                        className="h-8 px-3"
                      >
                        {size}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">Only for Fashion products. Leave empty to allow one-size.</p>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="edit-address">Product Address</Label>
              <Textarea
                id="edit-address"
                value={vendorAddress || editingProduct.address || ''}
                onChange={e => setEditingProduct(prev => prev ? { ...prev, address: e.target.value } : prev)}
                placeholder="Uses your business address by default"
                disabled={!!vendorAddress}
              />
              <p className="text-[11px] text-muted-foreground">{vendorAddress ? 'Locked to your business address.' : 'Add an address for this product.'}</p>
            </div>
            {savingEdit && <p className="text-xs text-muted-foreground">Saving...</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button type="button" disabled={savingEdit || !editingProduct?.name.trim()} onClick={async () => {
            if (!editingProduct) return;
            setSavingEdit(true);
            let imageUrl = editingProduct.main_image_url?.trim() || null;
            if (editingFile && vendor?.id) {
              const uploaded = await uploadProductImage(editingFile, String(vendor.id));
              if (uploaded) imageUrl = uploaded;
            }
            // Address column not present in current schema; skip enforcing it
            const finalCategory = (editingProduct.category || '').trim();
            if (editCategoryIsCustom && !finalCategory) {
              toast({ title: 'Custom category required', description: 'Enter a category name or pick an existing one.', variant: 'destructive' });
              setSavingEdit(false);
              return;
            }
            const updatePayload: any = {
              name: editingProduct.name.trim(),
              price: editingProduct.price,
              stock: editingProduct.stock,
              description: editingProduct.description?.trim() || null,
              main_image_url: imageUrl
            };
            const { error: updErr, data } = await supabase
              .from('products')
              .update(updatePayload)
              .eq('id', editingProduct.id)
              .select('id,name,price,stock,description,main_image_url,created_at')
              .single();
            if (!updErr && data) {
              setProducts(prev => prev.map(p => p.id === data.id ? ({ ...(data as any), size_options: (data as any).size_options || [] }) : p));
              setEditOpen(false);
            }
              setEditingFile(null);
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
