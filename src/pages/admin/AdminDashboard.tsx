import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, Store, Package, ShoppingCart, BarChart2, LogOut, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";

interface UserRow { id: string; full_name: string; email: string; role: string; barangay: string | null }
interface VendorRow { id: string; store_name: string; address: string | null }
interface ProductRow { id: string; name: string; price: number; vendor_id: string }
interface OrderRow { id: string; total: number; status: string | null; created_at?: string }

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("");

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
      const { data, error } = await supabase.from('orders').select('id,total,status,created_at').order('created_at',{ascending:false}).limit(500);
      if (error) throw error; return data as OrderRow[];
    }
  });

  const loading = usersQuery.isLoading || vendorsQuery.isLoading || productsQuery.isLoading || ordersQuery.isLoading;
  const error = (usersQuery.error || vendorsQuery.error || productsQuery.error || ordersQuery.error) as any;

  const usersData = usersQuery.data || [];
  const vendorsData = vendorsQuery.data || [];
  const productsData = productsQuery.data || [];
  const ordersData = ordersQuery.data || [];

  // Aggregations
  const totalSales = useMemo(() => ordersData.reduce((sum,o)=> sum + (o.total||0),0), [ordersData]);
  const activeToday = useMemo(() => {
    const start = new Date(); start.setHours(0,0,0,0);
    return ordersData.filter(o => o.created_at && new Date(o.created_at) >= start).length;
  }, [ordersData]);

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
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Admin Console</h1>
            <p className="text-sm text-muted-foreground">Manage users, vendors, inventory, orders & reports.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={logout}><LogOut className="h-4 w-4 mr-1" /> Logout</Button>
          </div>
        </div>
        {/* Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <MetricCard icon={Users} label="Users" value={usersData.length} />
          <MetricCard icon={Store} label="Vendors" value={vendorsData.length} />
          <MetricCard icon={Package} label="Products" value={productsData.length} />
            <MetricCard icon={ShoppingCart} label="Orders" value={ordersData.length} />
            <MetricCard icon={Wallet} label="Total Sales" value={`₱${totalSales.toLocaleString()}` as any} />
            <MetricCard icon={BarChart2} label="Active Today" value={activeToday} />
        </div>
        <div className="max-w-sm">
          <SearchBar value={filter} onChange={setFilter} placeholder="Search all datasets (client)" />
        </div>
        {error && <div className="p-3 border border-destructive/40 bg-destructive/5 text-destructive text-xs rounded">{error.message || 'Error loading data'}</div>}
        <Tabs defaultValue="users" className="space-y-5">
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="users">
            <SectionCard title="Users" description="All registered accounts.">
              <SearchBar />
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
                      <Button size="sm" variant="outline" className="h-7 px-2">View</Button>
                      <Button size="sm" variant="secondary" className="h-7 px-2">Edit</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </SectionCard>
          </TabsContent>
          <TabsContent value="vendors">
            <SectionCard title="Vendors" description="Registered merchant accounts.">
              <SearchBar />
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
                      <Button size="sm" variant="outline" className="h-7 px-2">View</Button>
                      <Button size="sm" variant="secondary" className="h-7 px-2">Manage</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </SectionCard>
          </TabsContent>
          <TabsContent value="products">
            <SectionCard title="Products" description="Sample product inventory.">
              <SearchBar />
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
                      <Button size="sm" variant="outline" className="h-7 px-2">Inspect</Button>
                      <Button size="sm" variant="secondary" className="h-7 px-2">Edit</Button>
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
                    <div className="text-xs text-muted-foreground">Total: ₱{o.total || 0}</div>
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
            <SectionCard title="Reports" description="High level insights (static placeholder).">
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Sales Summary</h3>
                  <p className="text-xs text-muted-foreground">Integrate Supabase SQL or edge functions later for real metrics.</p>
                </Card>
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">User Growth</h3>
                  <p className="text-xs text-muted-foreground">Charts placeholder (e.g. recharts / chart.js) to be added.</p>
                </Card>
              </div>
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
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
