import { useEffect, useState, useMemo, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, Store, Package, ShoppingCart, BarChart2, LogOut, Wallet, Plus, Pencil, Trash2, Download, Eye } from "lucide-react";
import { supabase, supabaseAdmin } from "@/lib/supabaseClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { StatusTimeline } from "@/components/ui/status-timeline";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

interface UserRow { id: string; full_name: string; email: string; role: string; vendor_status?: string | null; barangay: string | null }
interface VendorRow { id: string; store_name: string; address: string | null; owner_user_id?: string | null }
interface ProductRow { id: string; name: string; price: number; vendor_id: string }
interface OrderRow { id: string | number; total: number; status: string | null; created_at?: string; user_id?: string | number | null }
interface ArchiveRow { id: string; entity_type: string; entity_id: string; payload: any; created_at?: string }
type TabKey = "dashboard"|"users"|"vendors"|"products"|"orders"|"reports"|"archives";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const adminTabKey = 'admin-dashboard-tab';
  const allowedTabs: Array<TabKey> = ["dashboard","users","vendors","products","orders","reports","archives"];
  const [tab, setTab] = useState<TabKey>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(adminTabKey) : null;
    return allowedTabs.includes(stored as any) ? stored as any : "dashboard";
  });
  const [filters, setFilters] = useState<Record<TabKey,string>>({
    dashboard: '',
    users: '',
    vendors: '',
    products: '',
    orders: '',
    reports: '',
    archives: '',
  });
  const setFilterFor = (key: TabKey, value: string) => setFilters(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(adminTabKey, tab);
    }
  }, [tab]);

  // Gate (still insecure placeholder) – keep localStorage role check
  useEffect(() => {
    if (localStorage.getItem("role") !== "admin") { navigate("/admin/login"); }
  }, [navigate]);

  const adminClient = supabaseAdmin || supabase;
  const adminClientNote = !supabaseAdmin ? 'Service role key missing; admin actions rely on anon key and may be blocked by RLS.' : null;

  const usersQuery = useQuery({
    queryKey: ['admin','users'],
    queryFn: async () => {
      const { data, error } = await adminClient.from('users').select('id,full_name,email,role,vendor_status,barangay').limit(500);
      if (error) throw error; return data as UserRow[];
    }
  });
  const vendorsQuery = useQuery({
    queryKey: ['admin','vendors'],
    queryFn: async () => {
      const { data, error } = await adminClient.from('vendors').select('id,store_name,address,owner_user_id').limit(500);
      if (error) throw error; return data as VendorRow[];
    }
  });
  const productsQuery = useQuery({
    queryKey: ['admin','products'],
    queryFn: async () => {
      const { data, error } = await adminClient.from('products').select('id,name,price,vendor_id').limit(500);
      if (error) throw error; return data as ProductRow[];
    }
  });

  const archivesQuery = useQuery({
    queryKey: ['admin','archives'],
    queryFn: async () => {
      const { data, error } = await adminClient.from('archives').select('id,entity_type,entity_id,payload,created_at').order('created_at',{ascending:false}).limit(200);
      if (error) throw error; return data as ArchiveRow[];
    },
    retry: 0,
  });

  const ordersQuery = useQuery({
    queryKey: ['admin','orders'],
    queryFn: async () => {
      const { data, error } = await adminClient
        .from('orders')
        .select('id,total,total_amount,status,created_at,user_id')
        .order('created_at',{ascending:false})
        .limit(500);
      if (error) throw error; return data as OrderRow[];
    }
  });

  // Mutations: USERS
  const createUser = useMutation({
    mutationFn: async (payload: Partial<UserRow> & { email: string }) => {
      const client = adminClient ?? supabase;
      const { data, error } = await client.from('users').insert(payload).select('*').single();
      if (error) throw error; return data as UserRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','users'] }),
  });
  const updateUser = useMutation({
    mutationFn: async ({ id, ...changes }: Partial<UserRow> & { id: string }) => {
      const client = adminClient ?? supabase;
      const { data, error } = await client.from('users').update(changes).eq('id', id).select('*').single();
      if (error) throw error; return data as UserRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','users'] }),
  });
  const archiveRecord = async (entity_type: string, entity_id: string, payload: any) => {
    try {
      await (adminClient ?? supabase)
        .from('archives')
        .insert({ entity_type, entity_id, payload });
    } catch (e) {
      console.warn('Archive insert failed', e);
    }
  };

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const client = adminClient ?? supabase;
      const { data: row } = await client.from('users').select('*').eq('id', id).single();
      if (row) await archiveRecord('user', String(id), row);
      const { error } = await client.from('users').delete().eq('id', id);
      if (error) throw error; return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','users'] }),
  });

  // Mutations: VENDORS
  const createVendor = useMutation({
    mutationFn: async (payload: Partial<VendorRow>) => {
      const client = adminClient ?? supabase;
      const { data, error } = await client.from('vendors').insert(payload).select('*').single();
      if (error) throw error; return data as VendorRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','vendors'] }),
  });
  const updateVendor = useMutation({
    mutationFn: async ({ id, ...changes }: Partial<VendorRow> & { id: string }) => {
      const client = adminClient ?? supabase;
      const { data, error } = await client.from('vendors').update(changes).eq('id', id).select('*').single();
      if (error) throw error; return data as VendorRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','vendors'] }),
  });
  const deleteVendor = useMutation({
    mutationFn: async (id: string) => {
      const client = adminClient ?? supabase;
      const { data: row } = await client.from('vendors').select('*').eq('id', id).single();
      if (row) await archiveRecord('vendor', String(id), row);
      const { error } = await client.from('vendors').delete().eq('id', id);
      if (error) throw error; return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin','vendors'] });
      qc.invalidateQueries({ queryKey: ['admin','products'] });
    },
  });

  // Mutations: PRODUCTS
  const createProduct = useMutation({
    mutationFn: async (payload: Partial<ProductRow> & { name: string; price: number; vendor_id: string }) => {
      const client = adminClient ?? supabase;
      const { data, error } = await client.from('products').insert(payload).select('*').single();
      if (error) throw error; return data as ProductRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','products'] }),
  });
  const updateProduct = useMutation({
    mutationFn: async ({ id, ...changes }: Partial<ProductRow> & { id: string }) => {
      const client = adminClient ?? supabase;
      const { data, error } = await client.from('products').update(changes).eq('id', id).select('*').single();
      if (error) throw error; return data as ProductRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','products'] }),
  });
  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const client = adminClient ?? supabase;
      const { data: row } = await client.from('products').select('*').eq('id', id).single();
      if (row) await archiveRecord('product', String(id), row);
      const { error } = await client.from('products').delete().eq('id', id);
      if (error) throw error; return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','products'] }),
  });

  const loading = usersQuery.isLoading || vendorsQuery.isLoading || productsQuery.isLoading || ordersQuery.isLoading;
  const errorMessage = useMemo(() => {
    const e = usersQuery.error ?? vendorsQuery.error ?? productsQuery.error ?? ordersQuery.error;
    if (!e) return null;
    if (e instanceof Error) return e.message;
    if (typeof e === 'object' && e && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
      return (e as { message: string }).message;
    }
    return 'Error loading data';
  }, [usersQuery.error, vendorsQuery.error, productsQuery.error, ordersQuery.error]);

  const usersData = usersQuery.data || [];
  const vendorsData = vendorsQuery.data || [];
  const productsData = productsQuery.data || [];
  const ordersData = ordersQuery.data || [];
  const archivesData = archivesQuery.data || [];

  const customerSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: { label: string; value: string; type: string }[] = [];
    usersData.filter(u => (u.role || '').toLowerCase() === 'user').forEach(u => {
      const label = u.full_name || u.email || String(u.id);
      if (!label || seen.has(label)) return;
      seen.add(label);
      out.push({ label, value: label, type: 'Customer' });
    });
    return out.slice(0, 200);
  }, [usersData]);

  const vendorSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: { label: string; value: string; type: string }[] = [];
    usersData.filter(u => (u.role || '').toLowerCase() === 'vendor').forEach(u => {
      const label = u.full_name || u.email || String(u.id);
      if (!label || seen.has(label)) return;
      seen.add(label);
      out.push({ label, value: label, type: 'Vendor' });
    });
    vendorsData.forEach(v => {
      const label = v.store_name || String(v.id);
      if (!label || seen.has(label)) return;
      seen.add(label);
      out.push({ label, value: label, type: 'Vendor' });
    });
    return out.slice(0, 200);
  }, [usersData, vendorsData]);

  const productSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: { label: string; value: string; type: string }[] = [];
    productsData.forEach(p => {
      const label = p.name || String(p.id);
      if (!label || seen.has(label)) return;
      seen.add(label);
      out.push({ label, value: label, type: 'Product' });
    });
    return out.slice(0, 200);
  }, [productsData]);

  const orderSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: { label: string; value: string; type: string }[] = [];
    ordersData.forEach(o => {
      const label = `Order #${o.id}`;
      if (!label || seen.has(label)) return;
      seen.add(label);
      out.push({ label, value: String(o.id), type: o.status || 'Order' });
    });
    return out.slice(0, 200);
  }, [ordersData]);

  const archiveSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: { label: string; value: string; type: string }[] = [];
    archivesData.forEach(a => {
      const label = `${friendlyEntityLabel(a.entity_type)} #${a.entity_id}`;
      if (!label || seen.has(label)) return;
      seen.add(label);
      out.push({ label, value: label, type: friendlyEntityLabel(a.entity_type) });
    });
    return out.slice(0, 200);
  }, [archivesData]);

  const vendorNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of vendorsData) {
      m.set(String(v.id), v.store_name || 'Vendor');
    }
    return m;
  }, [vendorsData]);

  const vendorByOwner = useMemo(() => {
    const m = new Map<string, VendorRow>();
    vendorsData.forEach(v => { if (v.owner_user_id) m.set(String(v.owner_user_id), v); });
    return m;
  }, [vendorsData]);

  // Lookup helpers
  const userNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of usersData) { m.set(String(u.id), u.full_name || 'Unknown'); }
    return m;
  }, [usersData]);
  const userBarangayById = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of usersData) { m.set(String(u.id), u.barangay || 'Unknown'); }
    return m;
  }, [usersData]);

  // Aggregations
  const totalSales = useMemo(() => ordersData.reduce((sum,o)=> sum + Number(o.total||0),0), [ordersData]);
  const activeToday = useMemo(() => {
    const start = new Date(); start.setHours(0,0,0,0);
    return ordersData.filter(o => o.created_at && new Date(o.created_at) >= start).length;
  }, [ordersData]);

  // Report datasets
  const salesByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of ordersData) {
      if (!o.created_at) continue;
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      map.set(key, (map.get(key) || 0) + (o.total || 0));
    }
    const arr = Array.from(map.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([k,v])=>({ month: k, sales: Number(v.toFixed(2)) }));
    return arr.slice(-12); // last 12 months
  }, [ordersData]);

  const orderStatusPie = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of ordersData) {
      const key = (o.status || 'pending');
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).map(([status, value])=>({ status, value }));
  }, [ordersData]);

  const ordersByUser = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const o of ordersData) {
      const key = o.user_id ? String(o.user_id) : 'unknown';
      const prev = map.get(key) || { count: 0, total: 0 };
      map.set(key, { count: prev.count + 1, total: prev.total + Number(o.total || 0) });
    }
    return Array.from(map.entries())
      .map(([userId, agg]) => ({ userId, name: userNameById.get(userId) || 'Unknown', ...agg }))
      .sort((a,b)=> b.count - a.count)
      .slice(0,8);
  }, [ordersData, userNameById]);

  const ordersByBarangay = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const o of ordersData) {
      const barangay = o.user_id ? (userBarangayById.get(String(o.user_id)) || 'Unknown') : 'Unknown';
      const prev = map.get(barangay) || { count: 0, total: 0 };
      map.set(barangay, { count: prev.count + 1, total: prev.total + Number(o.total || 0) });
    }
    return Array.from(map.entries())
      .map(([barangay, agg]) => ({ barangay, ...agg }))
      .sort((a,b)=> b.count - a.count)
      .slice(0,8);
  }, [ordersData, userBarangayById]);

  const usersByBarangay = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of usersData) {
      const key = (u.barangay || 'Unknown');
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).map(([barangay, count]) => ({ barangay, count })).sort((a,b)=> b.count - a.count).slice(0,8);
  }, [usersData]);

  // Filter logic per tab (simple text contains across main fields)
  const normalizeFilter = (v: string) => String(v || '').trim().toLowerCase();
  const filterMatch = (needle: string, val: unknown) => !needle || String(val ?? '').toLowerCase().includes(needle);

  const normalizedUsersFilter = normalizeFilter(filters.users);
  const filteredUsers = normalizedUsersFilter
    ? usersData.filter(u => filterMatch(normalizedUsersFilter, u.full_name) || filterMatch(normalizedUsersFilter, u.email) || filterMatch(normalizedUsersFilter, u.role) || filterMatch(normalizedUsersFilter, u.vendor_status) || filterMatch(normalizedUsersFilter, u.barangay))
    : usersData;
  const userCustomers = filteredUsers.filter(u => (u.role || '').toLowerCase() === 'user');

  const normalizedVendorsFilter = normalizeFilter(filters.vendors);
  const filteredUsersForVendors = normalizedVendorsFilter
    ? usersData.filter(u => filterMatch(normalizedVendorsFilter, u.full_name) || filterMatch(normalizedVendorsFilter, u.email) || filterMatch(normalizedVendorsFilter, u.role) || filterMatch(normalizedVendorsFilter, u.vendor_status) || filterMatch(normalizedVendorsFilter, u.barangay))
    : usersData;
  const userVendors = filteredUsersForVendors.filter(u => (u.role || '').toLowerCase() === 'vendor');
  const filteredVendors = normalizedVendorsFilter ? vendorsData.filter(v => filterMatch(normalizedVendorsFilter, v.store_name) || filterMatch(normalizedVendorsFilter, v.address)) : vendorsData;

  const normalizedProductsFilter = normalizeFilter(filters.products);
  const filteredProducts = normalizedProductsFilter ? productsData.filter(p => filterMatch(normalizedProductsFilter, p.name) || filterMatch(normalizedProductsFilter, p.vendor_id)) : productsData;

  const normalizedOrdersFilter = normalizeFilter(filters.orders);
  const filteredOrders = normalizedOrdersFilter ? ordersData.filter(o => filterMatch(normalizedOrdersFilter, o.id) || filterMatch(normalizedOrdersFilter, o.status)) : ordersData;

  const normalizedArchivesFilter = normalizeFilter(filters.archives);
  const filteredArchives = normalizedArchivesFilter ? archivesData.filter(a => filterMatch(normalizedArchivesFilter, a.entity_type) || filterMatch(normalizedArchivesFilter, a.entity_id) || filterMatch(normalizedArchivesFilter, JSON.stringify(a.payload||{}))) : archivesData;

  // (Effect removed—react-query handles fetching.)

  const logout = () => {
    localStorage.removeItem("role");
    navigate("/admin/login");
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: BarChart2 },
    { key: "users", label: "Customers", icon: Users },
    { key: "vendors", label: "Vendors", icon: Store },
    { key: "products", label: "Products", icon: Package },
    { key: "orders", label: "Orders", icon: ShoppingCart },
    { key: "reports", label: "Reports", icon: Wallet },
    { key: "archives", label: "Archives", icon: Trash2 },
  ];
  const tabTriggerClass = "rounded-full px-4 py-2 text-sm transition data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm hover:bg-muted/60";

  return (
    <DashboardShell
      roleLabel="Admin"
      title="Admin Console"
      navItems={navItems}
      activeKey={tab}
      onSelect={(key) => setTab(key as typeof tab)}
      
      note={(
        <>
          {adminClientNote && (
            <div className="p-3 border border-amber-300 bg-amber-50 text-amber-800 text-xs rounded">
              {adminClientNote}
            </div>
          )}
          {errorMessage && <div className="p-3 border border-destructive/40 bg-destructive/5 text-destructive text-xs rounded">{errorMessage}</div>}
        </>
      )}
      footerAction={<Button variant="outline" size="sm" className="w-full" onClick={logout}><LogOut className="h-4 w-4 mr-1"/> Logout</Button>}
    >
      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {loading ? (
          Array.from({ length: 6 }).map((_,i)=> (
            <Card key={i} className="p-4"><Skeleton className="h-4 w-16 mb-3" /><Skeleton className="h-6 w-20" /></Card>
          ))
        ) : (
          <>
            <MetricCard icon={Users} label="Customers" value={usersData.length} tone="sky" />
            <MetricCard icon={Store} label="Vendors" value={vendorsData.length} tone="violet" />
            <MetricCard icon={Package} label="Products" value={productsData.length} tone="amber" />
            <MetricCard icon={ShoppingCart} label="Orders" value={ordersData.length} tone="fuchsia" />
            <MetricCard icon={Wallet} label="Total Sales" value={`₱${totalSales.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`} tone="emerald" />
            
          </>
        )}
      </div>
      {/* Body */}
      <Tabs value={tab} onValueChange={(v)=>setTab(v as typeof tab)} className="space-y-5 mt-5">
        <TabsList className="overflow-x-auto rounded-full border bg-background/70 p-1 shadow-sm backdrop-blur hidden">
          <TabsTrigger value="dashboard" className={tabTriggerClass}>Dashboard</TabsTrigger>
          <TabsTrigger value="users" className={tabTriggerClass}>Customers</TabsTrigger>
          <TabsTrigger value="vendors" className={tabTriggerClass}>Vendors</TabsTrigger>
          <TabsTrigger value="products" className={tabTriggerClass}>Products</TabsTrigger>
          <TabsTrigger value="orders" className={tabTriggerClass}>Orders</TabsTrigger>
          <TabsTrigger value="reports" className={tabTriggerClass}>Reports</TabsTrigger>
          <TabsTrigger value="archives" className={tabTriggerClass}>Archives</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
              <SectionCard title="Overview" description="Quick glance at trends.">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Reuse existing charts */}
                  <Card className="relative overflow-hidden border border-border/70 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 p-4 shadow-md dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-900/55">
                    <h3 className="font-semibold mb-2">Sales by Month</h3>
                    <ChartContainer className="h-[260px]" config={{ sales: { label: 'Sales', color: 'hsl(var(--primary))' }}}>
                      <BarChart data={salesByMonth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" hide />
                        <YAxis width={45} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="sales" fill="var(--color-sales)" radius={[4,4,0,0]} />
                      </BarChart>
                    </ChartContainer>
                  </Card>
                  <Card className="relative overflow-hidden border border-border/70 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 p-4 shadow-md dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-900/55">
                    <h3 className="font-semibold mb-2">Order Status</h3>
                    <ChartContainer
                      className="h-[260px]"
                      config={{
                        Pending: { label: 'Pending', color: '#fbbf24' },
                        Preparing: { label: 'Preparing', color: '#d97706' },
                        'For Delivery': { label: 'For Delivery', color: '#60a5fa' },
                        Delivered: { label: 'Delivered', color: '#34d399' },
                        Cancelled: { label: 'Cancelled', color: '#f87171' },
                      }}
                    >
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                        <Pie data={orderStatusPie} dataKey="value" nameKey="status" outerRadius={80} label>
                          {orderStatusPie.map((d, i) => (
                            <Cell key={i} fill={["#60a5fa","#34d399","#fbbf24","#f87171","#a78bfa"][i % 5]} />
                          ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                      </PieChart>
                    </ChartContainer>
                  </Card>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <Card className="relative overflow-hidden border border-border/70 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 p-4 shadow-md dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-900/55">
                    <h3 className="font-semibold mb-2">Customers by Barangay</h3>
                    <ChartContainer className="h-[260px]" config={{ users: { label: 'Customers', color: 'hsl(var(--primary))' }}}>
                      <BarChart data={usersByBarangay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="barangay" hide />
                        <YAxis width={45} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="var(--color-users)" radius={[4,4,0,0]} />
                      </BarChart>
                    </ChartContainer>
                  </Card>
                  <Card className="relative overflow-hidden border border-border/70 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 p-4 shadow-md dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-900/55">
                    <h3 className="font-semibold mb-2">Orders by Barangay</h3>
                    <ChartContainer className="h-[260px]" config={{ orders: { label: 'Orders', color: 'hsl(var(--primary))' }}}>
                      <BarChart data={ordersByBarangay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="barangay" hide />
                        <YAxis width={45} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="var(--color-orders)" radius={[4,4,0,0]} />
                      </BarChart>
                    </ChartContainer>
                  </Card>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <Card className="relative overflow-hidden border border-border/70 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 p-4 shadow-md dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-900/55">
                    <h3 className="font-semibold mb-2">Top Customers (by orders)</h3>
                    <div className="space-y-2 text-sm">
                      {ordersByUser.map((row, idx) => (
                        <div key={row.userId + idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-5 text-right">{idx+1}.</span>
                            <span className="font-medium truncate max-w-[180px]">{row.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{row.count} orders • ₱{row.total.toLocaleString()}</div>
                        </div>
                      ))}
                      {ordersByUser.length === 0 && <div className="text-xs text-muted-foreground">No orders yet.</div>}
                    </div>
                  </Card>
                  <Card className="relative overflow-hidden border border-border/70 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 p-4 shadow-md dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-900/55">
                    <h3 className="font-semibold mb-2">Recent Orders</h3>
                    <div className="text-xs text-muted-foreground mb-2">Latest order IDs and totals</div>
                    <div className="space-y-2">
                      {ordersData.slice(0,10).map((o)=> (
                        <div key={String(o.id)} className="flex items-center justify-between gap-3 text-sm">
                          <div>
                            <div className="font-medium">Order #{o.id}</div>
                            <div className="text-xs text-muted-foreground">₱{(o.total||0).toLocaleString()}</div>
                          </div>
                          <Button size="sm" variant="outline" onClick={()=>setTab('orders')} className="whitespace-nowrap">
                            View Order #{o.id}
                          </Button>
                        </div>
                      ))}
                      {ordersData.length === 0 && <div className="text-xs text-muted-foreground">No recent orders yet.</div>}
                    </div>
                  </Card>
                </div>
              </SectionCard>
            </TabsContent>
          <TabsContent value="users">
            <SectionCard title="Customers" description="All registered accounts.">
              <div className="flex items-center justify-between gap-3">
                <SearchBar value={filters.users} onChange={(v)=>setFilterFor('users', v)} suggestions={customerSuggestions} />
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {userCustomers.map(u => (
                  <Card key={u.id} className="group relative flex flex-col gap-2 overflow-hidden border border-border/70 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-900/55">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{u.full_name || '(no name)'} </span>
                      <div className="flex gap-1">
                        <Badge variant={u.role === 'admin' ? 'default' : u.role === 'vendor' ? 'secondary' : 'outline'}>{u.role}</Badge>
                        {u.role === 'vendor' && (
                          <Badge variant={u.vendor_status === 'approved' ? 'default' : u.vendor_status === 'rejected' ? 'destructive' : 'outline'}>
                            {u.vendor_status || 'pending'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                    <div className="text-xs">Barangay: <span className="font-medium">{u.barangay || '—'}</span></div>
                    {u.role === 'vendor' && u.vendor_status !== 'approved' && (
                      <div className="flex gap-2 mt-1">
                        <Button size="sm" variant="secondary" className="h-7 px-2" onClick={()=>updateUser.mutate({ id: u.id, vendor_status: 'approved' })}>Approve</Button>
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={()=>updateUser.mutate({ id: u.id, vendor_status: 'rejected' })}>Reject</Button>
                      </div>
                    )}
                    <div className="flex gap-2 mt-1">
                      <ViewUserButton user={u} />
                      <EditUserButton user={u} onSave={(changes)=>updateUser.mutate({ id: u.id, ...changes })} />
                      <DeleteButton label="Archive" onConfirm={()=>deleteUser.mutate(u.id)} />
                    </div>
                  </Card>
                ))}
              </div>
            </SectionCard>
          </TabsContent>
          <TabsContent value="vendors">
            <SectionCard title="Vendors" description="Registered merchant accounts.">
              <div className="flex items-center justify-between gap-3">
                <SearchBar value={filters.vendors} onChange={(v)=>setFilterFor('vendors', v)} suggestions={vendorSuggestions} />
              </div>
              <div className="space-y-3">
                {userVendors.map(u => {
                  const owned = vendorByOwner.get(String(u.id));
                  return (
                    <Card key={u.id} className="group relative flex flex-col gap-2 overflow-hidden border border-border/70 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-900/55">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{u.full_name || u.email || '(no name)'} </span>
                        <Badge variant={u.vendor_status === 'approved' ? 'default' : u.vendor_status === 'rejected' ? 'destructive' : 'outline'}>{u.vendor_status || 'pending'}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                      <div className="text-xs">Barangay: <span className="font-medium">{u.barangay || '—'}</span></div>
                      <div className="text-xs">Business: <span className="font-medium">{owned?.store_name || 'Not set'}</span></div>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {owned && (
                          <Button size="sm" variant="secondary" className="h-7 px-2" asChild>
                            <a href={`/business/${owned.id}`} target="_blank" rel="noreferrer">View Shop</a>
                          </Button>
                        )}
                        <ViewUserButton user={u} />
                        <EditUserButton user={u} onSave={(changes)=>updateUser.mutate({ id: u.id, ...changes })} />
                        <DeleteButton label="Archive" onConfirm={()=>deleteUser.mutate(u.id)} />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </SectionCard>
          </TabsContent>
          <TabsContent value="products">
            <SectionCard title="Products" description="Read-only catalog. Vendors own their listings and manage updates.">
              <div className="flex items-center justify-between gap-3">
                <SearchBar value={filters.products} onChange={(v)=>setFilterFor('products', v)} suggestions={productSuggestions} />
                <Badge variant="outline">Vendor-managed</Badge>
              </div>
              <div className="space-y-3">
                {filteredProducts.map(p => (
                  <Card key={p.id} className="group relative flex flex-col gap-2 overflow-hidden border border-border/70 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-900/55">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{p.name}</span>
                      <Badge className="bg-green-600">Active</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">Vendor: {vendorNameById.get(p.vendor_id) || p.vendor_id || 'Unknown'}</div>
                    <div className="text-xs">₱{Number(p.price).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">Catalog changes are handled in each vendor dashboard.</div>
                  </Card>
                ))}
              </div>
            </SectionCard>
          </TabsContent>
          <TabsContent value="orders">
            <SectionCard title="Orders" description="Recent order activity.">
              <SearchBar value={filters.orders} onChange={(v)=>setFilterFor('orders', v)} suggestions={orderSuggestions} />
              <div className="space-y-3">
                {filteredOrders.map(o => (
                  <Card key={o.id} className="relative flex flex-col gap-2 overflow-hidden border border-border/70 bg-gradient-to-r from-primary/5 via-background to-background p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{borderLeftColor: o.status === 'Preparing'? '#d97706': o.status === 'For Delivery'? '#2563eb': o.status === 'Delivered'? '#15803d': '#dc2626', borderLeftWidth: 6}}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Order #{o.id}</span>
                      <Badge>{o.status || 'n/a'}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">Placed {o.created_at ? formatDistanceToNow(new Date(o.created_at), { addSuffix: true }) : ''} • Total: ₱{Number(o.total||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                    <div className="pt-1"><StatusTimeline status={o.status || 'pending'} /></div>
                    <div className="flex gap-2 mt-1">
                      <Button size="sm" variant="outline" className="h-7 px-2">Details</Button>
                      <Button size="sm" variant="secondary" className="h-7 px-2">Advance</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </SectionCard>
          </TabsContent>
          <TabsContent value="reports">
            <SectionCard title="Reports" description="High level insights.">
              <div className="flex flex-wrap gap-2 mb-3">
                <Button size="sm" variant="outline" onClick={()=>downloadCSV('orders-report.csv', ordersData)}><Download className="h-4 w-4 mr-1" /> Orders CSV</Button>
                <Button size="sm" variant="outline" onClick={()=>downloadCSV('vendors-report.csv', vendorsData)}><Download className="h-4 w-4 mr-1" /> Vendors CSV</Button>
                <Button size="sm" variant="outline" onClick={()=>downloadCSV('customers-report.csv', usersData.filter(u=>u.role!=='admin'))}><Download className="h-4 w-4 mr-1" /> Customers CSV</Button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="relative overflow-hidden border border-border/70 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 p-4 shadow-md dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-900/55">
                  <h3 className="font-semibold mb-2">Sales by Month</h3>
                  <ChartContainer className="h-[260px]" config={{ sales: { label: 'Sales', color: 'hsl(var(--primary))' }}}>
                    <BarChart data={salesByMonth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" hide />
                      <YAxis width={45} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="sales" fill="var(--color-sales)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ChartContainer>
                </Card>
                <Card className="relative overflow-hidden border border-border/70 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 p-4 shadow-md dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-900/55">
                  <h3 className="font-semibold mb-2">Order Status</h3>
                  <ChartContainer
                    className="h-[260px]"
                    config={{
                      Pending: { label: 'Pending', color: '#fbbf24' },
                      Preparing: { label: 'Preparing', color: '#d97706' },
                      'For Delivery': { label: 'For Delivery', color: '#60a5fa' },
                      Delivered: { label: 'Delivered', color: '#34d399' },
                      Cancelled: { label: 'Cancelled', color: '#f87171' },
                    }}
                  >
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                      <Pie data={orderStatusPie} dataKey="value" nameKey="status" outerRadius={80} label>
                        {orderStatusPie.map((d, i) => (
                          <Cell key={i} fill={["#60a5fa","#34d399","#fbbf24","#f87171","#a78bfa"][i % 5]} />
                        ))}
                      </Pie>
                      <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                    </PieChart>
                  </ChartContainer>
                </Card>
              </div>
            </SectionCard>
          </TabsContent>
          <TabsContent value="archives">
            <SectionCard title="Archives" description="Deleted records kept for recovery.">
              <SearchBar value={filters.archives} onChange={(v)=>setFilterFor('archives', v)} suggestions={archiveSuggestions} />
              {archivesQuery.isError && <div className="text-sm text-destructive">Archives table not reachable. Ensure table 'archives' exists with columns entity_type, entity_id, payload, created_at.</div>}
              <div className="space-y-3">
                {filteredArchives.map(a => {
                  const payload = a.payload || {};
                  const entries = typeof payload === 'object' && payload !== null ? Object.entries(payload) : [];
                  const displayed = entries.slice(0, 8);
                  const entityLabel = friendlyEntityLabel(a.entity_type);
                  return (
                    <Card key={a.id} className="relative overflow-hidden border border-border/70 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 p-4 shadow-sm dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-900/55">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium capitalize flex items-center gap-2">
                            {entityLabel}
                            <Badge variant="outline" className="text-[11px]">#{a.entity_id}</Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground">Archived {a.created_at ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true }) : ''}</div>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {displayed.length === 0 && (
                          <div className="text-xs text-muted-foreground">No fields captured in payload.</div>
                        )}
                        {displayed.map(([key, val]) => (
                          <div key={key} className="rounded-lg border border-border/60 bg-muted/40 p-2">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{key}</div>
                            <div className="text-sm break-words text-foreground">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</div>
                          </div>
                        ))}
                      </div>
                      {entries.length > displayed.length && (
                        <div className="mt-2 text-[11px] text-muted-foreground">+{entries.length - displayed.length} more fields</div>
                      )}
                    </Card>
                  );
                })}
                {filteredArchives.length === 0 && <div className="text-sm text-muted-foreground">No archived records.</div>}
              </div>
            </SectionCard>
          </TabsContent>
        </Tabs>
    </DashboardShell>
  );
}

type MetricTone = 'sky' | 'violet' | 'amber' | 'fuchsia' | 'emerald' | 'slate';
const metricPalette: Record<MetricTone, { card: string; icon: string; ring: string; accent: string }> = {
  sky: { card: 'from-sky-500/18 via-sky-500/5 to-white dark:to-slate-900', icon: 'bg-sky-500/15 text-sky-700 dark:text-sky-200', ring: 'ring-sky-200/60 dark:ring-sky-900/40', accent: 'bg-sky-500/20' },
  violet: { card: 'from-violet-500/18 via-violet-500/6 to-white dark:to-slate-900', icon: 'bg-violet-500/15 text-violet-700 dark:text-violet-200', ring: 'ring-violet-200/60 dark:ring-violet-900/40', accent: 'bg-violet-500/20' },
  amber: { card: 'from-amber-400/24 via-amber-300/12 to-white dark:to-slate-900', icon: 'bg-amber-400/20 text-amber-800 dark:text-amber-200', ring: 'ring-amber-200/70 dark:ring-amber-900/40', accent: 'bg-amber-400/25' },
  fuchsia: { card: 'from-fuchsia-500/18 via-fuchsia-500/6 to-white dark:to-slate-900', icon: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-200', ring: 'ring-fuchsia-200/60 dark:ring-fuchsia-900/40', accent: 'bg-fuchsia-500/20' },
  emerald: { card: 'from-emerald-500/18 via-emerald-500/6 to-white dark:to-slate-900', icon: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200', ring: 'ring-emerald-200/60 dark:ring-emerald-900/40', accent: 'bg-emerald-500/20' },
  slate: { card: 'from-slate-900/10 via-slate-200/50 to-white dark:from-slate-900/70 dark:via-slate-900/50 dark:to-slate-950', icon: 'bg-slate-900/10 text-slate-800 dark:text-slate-200', ring: 'ring-slate-200/70 dark:ring-slate-800/60', accent: 'bg-slate-500/15' },
};

function MetricCard({ icon: Icon, label, value, tone = 'sky' }: { icon: ComponentType<{ className?: string }>; label: string; value: number | string; tone?: MetricTone }) {
  const palette = metricPalette[tone] || metricPalette.sky;
  return (
    <Card className={`relative overflow-hidden border bg-gradient-to-br ${palette.card} p-4 shadow-lg ring-1 ${palette.ring}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.28),transparent_30%)]" />
      <div className="relative flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
          <div className="text-xl font-semibold leading-tight">{value}</div>
        </div>
        <div className={`rounded-full p-2 ${palette.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className={`relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/60`}>
        <span className={`absolute inset-y-0 left-0 w-1/2 rounded-full ${palette.accent}`} />
      </div>
    </Card>
  );
}

function downloadCSV(filename: string, rows: any[]) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="relative overflow-hidden border border-primary/10 bg-gradient-to-br from-background via-background/90 to-primary/5 shadow-lg">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(99,102,241,0.14),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(45,212,191,0.14),transparent_35%),linear-gradient(120deg,rgba(255,255,255,0.12),transparent)]" />
      <CardHeader className="relative border-b border-border/80 pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="inline-block h-1.5 w-6 rounded-full bg-primary/50" />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground font-normal -mt-1">{description}</p>
      </CardHeader>
      <CardContent className="relative space-y-4 pt-4">{children}</CardContent>
    </Card>
  );
}

function SearchBar({ value, onChange, placeholder, suggestions }: { value?: string; onChange?: (v: string) => void; placeholder?: string; suggestions?: { label: string; value: string; type: string }[] }) {
  const [open, setOpen] = useState(false);
  const normalized = String(value ?? '').toLowerCase();
  const filtered = useMemo(() => {
    if (!suggestions) return [];
    if (!normalized) return suggestions.slice(0, 8);
    return suggestions
      .filter(s => String(s.label ?? '').toLowerCase().includes(normalized))
      .slice(0, 8);
  }, [suggestions, normalized]);

  return (
    <div className="relative">
      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder || "Search..."}
        value={value}
        onChange={(e)=> { onChange?.(String(e.target.value)); setOpen(true); }}
        onFocus={()=> setOpen(true)}
        onBlur={()=> setTimeout(()=>setOpen(false), 120)}
        className="pl-9"
      />
      {open && filtered && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-sm">
          {filtered.map((s, idx) => (
            <button
              key={s.label + idx}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
              onMouseDown={(e)=>{ e.preventDefault(); onChange?.(String(s.value || '')); setOpen(false); }}
            >
              <span className="truncate">{s.label}</span>
              <span className="text-[10px] text-muted-foreground ml-2">{friendlyEntityLabel(s.type)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ————— CRUD Dialogs —————

function DeleteButton({ label, onConfirm }: { label?: string; onConfirm: ()=>void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive" className="h-7 px-2"><Trash2 className="h-3.5 w-3.5 mr-1" />{label || 'Delete'}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm delete</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
        <DialogFooter>
          <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={()=>{ onConfirm(); setOpen(false); }}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateUserButton({ onCreate }: { onCreate: (payload: Partial<UserRow> & { email: string })=>void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<UserRow> & { email: string }>({ full_name: '', email: '', role: 'user', vendor_status: 'approved', barangay: '' });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Customer</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create customer profile</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <LabeledInput label="Full name" value={form.full_name||''} onChange={v=>setForm({...form, full_name:v})} />
          <LabeledInput label="Email" type="email" value={form.email} onChange={v=>setForm({...form, email:v})} />
          <LabeledInput label="Role" value={form.role||'user'} onChange={v=>setForm({...form, role:v})} placeholder="user | vendor | admin" />
          <LabeledInput label="Vendor status" value={form.vendor_status||''} onChange={v=>setForm({...form, vendor_status:v})} placeholder="approved | pending | rejected" />
          <LabeledInput label="Barangay" value={form.barangay||''} onChange={v=>setForm({...form, barangay:v})} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
          <Button onClick={()=>{ onCreate(form); setOpen(false); }}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserButton({ user, onSave }: { user: UserRow; onSave: (changes: Partial<UserRow> & { email?: string })=>void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<UserRow> & { email: string }>({ full_name: user.full_name, email: user.email, role: user.role, vendor_status: user.vendor_status || '', barangay: user.barangay||'' });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="h-7 px-2"><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <LabeledInput label="Full name" value={form.full_name||''} onChange={v=>setForm({...form, full_name:v})} />
          <LabeledInput label="Email" type="email" value={form.email||''} onChange={v=>setForm({...form, email:v})} />
          <LabeledInput label="Role" value={form.role||'user'} onChange={v=>setForm({...form, role:v})} placeholder="user | vendor | admin" />
          <LabeledInput label="Vendor status" value={form.vendor_status||''} onChange={v=>setForm({...form, vendor_status:v})} placeholder="approved | pending | rejected" />
          <LabeledInput label="Barangay" value={form.barangay||''} onChange={v=>setForm({...form, barangay:v})} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
          <Button onClick={()=>{ onSave(form); setOpen(false); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateVendorButton({ onCreate }: { onCreate: (payload: Partial<VendorRow>)=>void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<VendorRow>>({ store_name: '', address: '' });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Vendor</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create vendor</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <LabeledInput label="Store name" value={form.store_name||''} onChange={v=>setForm({...form, store_name:v})} />
          <LabeledInput label="Address" value={form.address||''} onChange={v=>setForm({...form, address:v})} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
          <Button onClick={()=>{ if(form.store_name) { onCreate(form); setOpen(false);} }}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewUserButton({ user }: { user: UserRow }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 px-2"><Eye className="h-3.5 w-3.5 mr-1" /> Details</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Customer Details</DialogTitle></DialogHeader>
        <div className="text-sm space-y-1">
          <div><span className="text-muted-foreground">Name:</span> {user.full_name || '—'}</div>
          <div><span className="text-muted-foreground">Email:</span> {user.email}</div>
          <div><span className="text-muted-foreground">Role:</span> {user.role}</div>
          <div><span className="text-muted-foreground">Status:</span> {user.vendor_status || 'n/a'}</div>
          <div><span className="text-muted-foreground">Barangay:</span> {user.barangay || '—'}</div>
          <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">Verification documents are not stored; upload pipeline required.</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ViewVendorButton({ vendor }: { vendor: VendorRow }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 px-2"><Eye className="h-3.5 w-3.5 mr-1" /> Details</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Vendor Details</DialogTitle></DialogHeader>
        <div className="text-sm space-y-1">
          <div><span className="text-muted-foreground">Store:</span> {vendor.store_name}</div>
          <div><span className="text-muted-foreground">ID:</span> {vendor.id}</div>
          <div><span className="text-muted-foreground">Address:</span> {vendor.address || '—'}</div>
          <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">No verification files recorded. Add storage fields to surface permits/IDs.</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditVendorButton({ vendor, onSave }: { vendor: VendorRow; onSave: (changes: Partial<VendorRow>)=>void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<VendorRow>>({ store_name: vendor.store_name, address: vendor.address||'' });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="h-7 px-2"><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit vendor</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <LabeledInput label="Store name" value={form.store_name||''} onChange={v=>setForm({...form, store_name:v})} />
          <LabeledInput label="Address" value={form.address||''} onChange={v=>setForm({...form, address:v})} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
          <Button onClick={()=>{ onSave(form); setOpen(false); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateProductButton({ vendors, onCreate }: { vendors: VendorRow[]; onCreate: (payload: Partial<ProductRow> & { name: string; price: number; vendor_id: string })=>void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; price: string; vendor_id: string }>({ name: '', price: '', vendor_id: vendors[0]?.id || '' });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Product</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create product</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <LabeledInput label="Name" value={form.name} onChange={v=>setForm({...form, name:v})} />
          <LabeledInput label="Price" type="number" value={form.price} onChange={v=>setForm({...form, price:v})} />
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Vendor</label>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={form.vendor_id} onChange={(e)=>setForm({...form, vendor_id: e.target.value})}>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.store_name}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
          <Button onClick={()=>{ if(form.name && form.price && form.vendor_id){ onCreate({ name: form.name, price: Number(form.price), vendor_id: form.vendor_id }); setOpen(false);} }}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditProductButton({ product, vendors, onSave }: { product: ProductRow; vendors: VendorRow[]; onSave: (changes: Partial<ProductRow>)=>void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; price: string; vendor_id: string }>({ name: product.name, price: String(product.price ?? ''), vendor_id: product.vendor_id });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="h-7 px-2"><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit product</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <LabeledInput label="Name" value={form.name} onChange={v=>setForm({...form, name:v})} />
          <LabeledInput label="Price" type="number" value={form.price} onChange={v=>setForm({...form, price:v})} />
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Vendor</label>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={form.vendor_id} onChange={(e)=>setForm({...form, vendor_id: e.target.value})}>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.store_name}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
          <Button onClick={()=>{ onSave({ name: form.name, price: Number(form.price), vendor_id: form.vendor_id }); setOpen(false); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LabeledInput({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string)=>void; type?: string; placeholder?: string }) {
  return (
    <div className="grid gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e)=>onChange(e.target.value)} type={type} placeholder={placeholder} />
    </div>
  );
}

function friendlyEntityLabel(entityType: string | null | undefined): string {
  const lower = String(entityType || '').toLowerCase();
  if (lower === 'user') return 'Customer';
  if (lower === 'users') return 'Customers';
  return entityType || '';
}
