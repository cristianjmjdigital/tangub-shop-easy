import { useEffect, useState, useMemo, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, Store, Package, ShoppingCart, BarChart2, LogOut, Wallet, Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { StatusTimeline } from "@/components/ui/status-timeline";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarFooter,
  SidebarInset,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
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

interface UserRow { id: string; full_name: string; email: string; role: string; barangay: string | null }
interface VendorRow { id: string; store_name: string; address: string | null }
interface ProductRow { id: string; name: string; price: number; vendor_id: string }
interface OrderRow { id: string | number; total: number; status: string | null; created_at?: string; user_id?: string | number | null }

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("");
  const qc = useQueryClient();
  const [tab, setTab] = useState<"dashboard"|"users"|"vendors"|"products"|"orders"|"reports">("dashboard");

  // Gate (still insecure placeholder) – keep localStorage role check
  useEffect(() => {
    if (localStorage.getItem("role") !== "admin") { navigate("/admin/login"); }
  }, [navigate]);

  const usersQuery = useQuery({
    queryKey: ['admin','users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('id,full_name,email,role,barangay').limit(500);
      if (error) throw error; return data as UserRow[];
    }
  });
  const vendorsQuery = useQuery({
    queryKey: ['admin','vendors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendors').select('id,store_name,address').limit(500);
      if (error) throw error; return data as VendorRow[];
    }
  });
  const productsQuery = useQuery({
    queryKey: ['admin','products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('id,name,price,vendor_id').limit(500);
      if (error) throw error; return data as ProductRow[];
    }
  });
  const ordersQuery = useQuery({
    queryKey: ['admin','orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id,total,status,created_at,user_id')
        .order('created_at',{ascending:false})
        .limit(500);
      if (error) throw error; return data as OrderRow[];
    }
  });

  // Mutations: USERS
  const createUser = useMutation({
    mutationFn: async (payload: Partial<UserRow> & { email: string }) => {
      const { data, error } = await supabase.from('users').insert(payload).select('*').single();
      if (error) throw error; return data as UserRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','users'] }),
  });
  const updateUser = useMutation({
    mutationFn: async ({ id, ...changes }: Partial<UserRow> & { id: string }) => {
      const { data, error } = await supabase.from('users').update(changes).eq('id', id).select('*').single();
      if (error) throw error; return data as UserRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','users'] }),
  });
  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error; return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','users'] }),
  });

  // Mutations: VENDORS
  const createVendor = useMutation({
    mutationFn: async (payload: Partial<VendorRow>) => {
      const { data, error } = await supabase.from('vendors').insert(payload).select('*').single();
      if (error) throw error; return data as VendorRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','vendors'] }),
  });
  const updateVendor = useMutation({
    mutationFn: async ({ id, ...changes }: Partial<VendorRow> & { id: string }) => {
      const { data, error } = await supabase.from('vendors').update(changes).eq('id', id).select('*').single();
      if (error) throw error; return data as VendorRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','vendors'] }),
  });
  const deleteVendor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vendors').delete().eq('id', id);
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
      const { data, error } = await supabase.from('products').insert(payload).select('*').single();
      if (error) throw error; return data as ProductRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','products'] }),
  });
  const updateProduct = useMutation({
    mutationFn: async ({ id, ...changes }: Partial<ProductRow> & { id: string }) => {
      const { data, error } = await supabase.from('products').update(changes).eq('id', id).select('*').single();
      if (error) throw error; return data as ProductRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','products'] }),
  });
  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
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
  const totalSales = useMemo(() => ordersData.reduce((sum,o)=> sum + (o.total||0),0), [ordersData]);
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

  // Filter logic (simple text contains across main fields)
  const normalizedFilter = filter.trim().toLowerCase();
  const filterMatch = (val: string | null | undefined) => (val||'').toLowerCase().includes(normalizedFilter);
  const filteredUsers = normalizedFilter ? usersData.filter(u => filterMatch(u.full_name) || filterMatch(u.email) || filterMatch(u.role) || filterMatch(u.barangay)) : usersData;
  const filteredVendors = normalizedFilter ? vendorsData.filter(v => filterMatch(v.store_name) || filterMatch(v.address)) : vendorsData;
  const filteredProducts = normalizedFilter ? productsData.filter(p => filterMatch(p.name) || filterMatch(p.vendor_id)) : productsData;
  const filteredOrders = normalizedFilter ? ordersData.filter(o => filterMatch(o.id) || filterMatch(o.status)) : ordersData;

  // (Effect removed—react-query handles fetching.)

  const logout = () => {
    localStorage.removeItem("role");
    navigate("/admin/login");
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="bg-sidebar">
        <SidebarHeader className="px-3 py-4">
          <div className="flex items-center gap-2 px-1">
            <div className="h-7 w-7 rounded bg-primary/90" />
            <span className="font-semibold tracking-wide">Admin</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Overview</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={tab==="dashboard"} onClick={()=>setTab("dashboard")}>
                  <BarChart2 /> <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={tab==="users"} onClick={()=>setTab("users")}>
                  <Users /> <span>Users</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={tab==="vendors"} onClick={()=>setTab("vendors")}>
                  <Store /> <span>Vendors</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={tab==="products"} onClick={()=>setTab("products")}>
                  <Package /> <span>Products</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={tab==="orders"} onClick={()=>setTab("orders")}>
                  <ShoppingCart /> <span>Orders</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={tab==="reports"} onClick={()=>setTab("reports")}>
                  <Wallet /> <span>Reports</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter className="px-2 pb-3">
          <Button variant="outline" size="sm" className="w-full" onClick={logout}><LogOut className="h-4 w-4 mr-1"/> Logout</Button>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        {/* Top bar */}
        <div className="flex items-center h-14 px-4 gap-3 border-b bg-background/80 supports-[backdrop-filter]:backdrop-blur">
          <SidebarTrigger />
          <div className="font-semibold">Admin Console</div>
          <div className="ml-auto w-full max-w-xs">
            <SearchBar value={filter} onChange={setFilter} placeholder="Search everything" />
          </div>
        </div>
        <div className="px-4 py-6">
          {errorMessage && <div className="p-3 mb-4 border border-destructive/40 bg-destructive/5 text-destructive text-xs rounded">{errorMessage}</div>}
          {/* Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {loading ? (
              Array.from({ length: 6 }).map((_,i)=> (
                <Card key={i} className="p-4"><Skeleton className="h-4 w-16 mb-3" /><Skeleton className="h-6 w-20" /></Card>
              ))
            ) : (
              <>
                <MetricCard icon={Users} label="Users" value={usersData.length} />
                <MetricCard icon={Store} label="Vendors" value={vendorsData.length} />
                <MetricCard icon={Package} label="Products" value={productsData.length} />
                <MetricCard icon={ShoppingCart} label="Orders" value={ordersData.length} />
                <MetricCard icon={Wallet} label="Total Sales" value={`₱${totalSales.toLocaleString()}`} />
                <MetricCard icon={BarChart2} label="Active Today" value={activeToday} />
              </>
            )}
          </div>
          {/* Body */}
          <Tabs value={tab} onValueChange={(v)=>setTab(v as typeof tab)} className="space-y-5 mt-5">
            <TabsList className="overflow-x-auto">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard">
              <SectionCard title="Overview" description="Quick glance at trends.">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Reuse existing charts */}
                  <Card className="p-4">
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
                  <Card className="p-4">
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
                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">Users by Barangay</h3>
                    <ChartContainer className="h-[260px]" config={{ users: { label: 'Users', color: 'hsl(var(--primary))' }}}>
                      <BarChart data={usersByBarangay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="barangay" hide />
                        <YAxis width={45} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="var(--color-users)" radius={[4,4,0,0]} />
                      </BarChart>
                    </ChartContainer>
                  </Card>
                  <Card className="p-4">
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
                  <Card className="p-4">
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
                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">Recent Orders</h3>
                    <div className="text-xs text-muted-foreground mb-2">Latest order IDs and totals</div>
                    <div className="space-y-2">
                      {ordersData.slice(0,10).map((o)=> (
                        <div key={String(o.id)} className="flex items-center justify-between text-sm">
                          <span className="font-mono text-muted-foreground">{String(o.id).slice(0,8)}…</span>
                          <span>₱{(o.total||0).toLocaleString()}</span>
                        </div>
                      ))}
                      {ordersData.length === 0 && <div className="text-xs text-muted-foreground">No recent orders yet.</div>}
                    </div>
                  </Card>
                </div>
              </SectionCard>
            </TabsContent>
          <TabsContent value="users">
            <SectionCard title="Users" description="All registered accounts.">
              <div className="flex items-center justify-between gap-3">
                <SearchBar />
                <CreateUserButton onCreate={(payload)=>createUser.mutate(payload)} />
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredUsers.map(u => (
                  <Card key={u.id} className="p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{u.full_name || '(no name)'} </span>
                      <Badge variant={u.role === 'admin' ? 'default' : u.role === 'vendor' ? 'secondary' : 'outline'}>{u.role}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                    <div className="text-xs">Barangay: <span className="font-medium">{u.barangay || '—'}</span></div>
                    <div className="flex gap-2 mt-1">
                      <EditUserButton user={u} onSave={(changes)=>updateUser.mutate({ id: u.id, ...changes })} />
                      <DeleteButton label="Delete" onConfirm={()=>deleteUser.mutate(u.id)} />
                    </div>
                  </Card>
                ))}
              </div>
            </SectionCard>
          </TabsContent>
          <TabsContent value="vendors">
            <SectionCard title="Vendors" description="Registered merchant accounts.">
              <div className="flex items-center justify-between gap-3">
                <SearchBar />
                <CreateVendorButton onCreate={(payload)=>createVendor.mutate(payload)} />
              </div>
              <div className="space-y-3">
                {filteredVendors.map(v => (
                  <Card key={v.id} className="p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{v.store_name}</span>
                      <Badge className="bg-green-600">Active</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">ID: {v.id}</div>
                    <div className="text-xs">Addr: {v.address || '—'}</div>
                    <div className="flex gap-2 mt-1">
                      <EditVendorButton vendor={v} onSave={(changes)=>updateVendor.mutate({ id: v.id, ...changes })} />
                      <DeleteButton label="Remove" onConfirm={()=>deleteVendor.mutate(v.id)} />
                    </div>
                  </Card>
                ))}
              </div>
            </SectionCard>
          </TabsContent>
          <TabsContent value="products">
            <SectionCard title="Products" description="Sample product inventory.">
              <div className="flex items-center justify-between gap-3">
                <SearchBar />
                <CreateProductButton vendors={vendorsData} onCreate={(payload)=>createProduct.mutate(payload)} />
              </div>
              <div className="space-y-3">
                {filteredProducts.map(p => (
                  <Card key={p.id} className="p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{p.name}</span>
                      <Badge className="bg-green-600">Active</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">Vendor ID: {p.vendor_id}</div>
                    <div className="text-xs">₱{p.price}</div>
                    <div className="flex gap-2 mt-1">
                      <EditProductButton product={p} vendors={vendorsData} onSave={(changes)=>updateProduct.mutate({ id: p.id, ...changes })} />
                      <DeleteButton label="Delete" onConfirm={()=>deleteProduct.mutate(p.id)} />
                    </div>
                  </Card>
                ))}
              </div>
            </SectionCard>
          </TabsContent>
          <TabsContent value="orders">
            <SectionCard title="Orders" description="Recent order activity.">
              <SearchBar />
              <div className="space-y-3">
                {filteredOrders.map(o => (
                  <Card key={o.id} className="p-4 flex flex-col gap-2 border-l-4" style={{borderLeftColor: o.status === 'Preparing'? '#d97706': o.status === 'For Delivery'? '#2563eb': o.status === 'Delivered'? '#15803d': '#dc2626'}}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Order #{o.id}</span>
                      <Badge>{o.status || 'n/a'}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">Placed {o.created_at ? formatDistanceToNow(new Date(o.created_at), { addSuffix: true }) : ''} • Total: ₱{o.total || 0}</div>
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
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-4">
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
                <Card className="p-4">
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
        </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: number | string }) {
  return (
    <Card className="p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </Card>
  );
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground font-normal -mt-2">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function SearchBar({ value, onChange, placeholder }: { value?: string; onChange?: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input placeholder={placeholder || "Search..."} value={value} onChange={(e)=> onChange?.(e.target.value)} className="pl-9" />
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
  const [form, setForm] = useState<Partial<UserRow> & { email: string }>({ full_name: '', email: '', role: 'user', barangay: '' });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New User</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create user profile</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <LabeledInput label="Full name" value={form.full_name||''} onChange={v=>setForm({...form, full_name:v})} />
          <LabeledInput label="Email" type="email" value={form.email} onChange={v=>setForm({...form, email:v})} />
          <LabeledInput label="Role" value={form.role||'user'} onChange={v=>setForm({...form, role:v})} placeholder="user | vendor | admin" />
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
  const [form, setForm] = useState<Partial<UserRow> & { email: string }>({ full_name: user.full_name, email: user.email, role: user.role, barangay: user.barangay||'' });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="h-7 px-2"><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit user</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <LabeledInput label="Full name" value={form.full_name||''} onChange={v=>setForm({...form, full_name:v})} />
          <LabeledInput label="Email" type="email" value={form.email||''} onChange={v=>setForm({...form, email:v})} />
          <LabeledInput label="Role" value={form.role||'user'} onChange={v=>setForm({...form, role:v})} placeholder="user | vendor | admin" />
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
