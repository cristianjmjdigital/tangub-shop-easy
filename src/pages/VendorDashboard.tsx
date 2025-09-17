import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Package, ShoppingCart, Settings, TrendingUp, Store, DollarSign, Users, Edit, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function VendorDashboard() {
  const store = {
    name: "Burger King Tangub",
    since: 2024,
    todaySales: 1540.75,
    orders: 27,
    visitors: 123,
  };

  const products = [
    { id: 101, name: "Whopper Jr", price: 129, stock: 34, status: "Active" },
    { id: 102, name: "Cheese Whopper", price: 149, stock: 12, status: "Low Stock" },
    { id: 103, name: "King Fries Large", price: 89, stock: 0, status: "Out of Stock" },
    { id: 104, name: "Iced Tea (22oz)", price: 55, stock: 58, status: "Active" },
    { id: 105, name: "Mushroom Burger", price: 169, stock: 7, status: "Low Stock" },
  ];

  const orders = [
    { id: 9001, customer: "Juan D.", total: 348, items: 3, status: "Preparing", placed: "10:12 AM" },
    { id: 9002, customer: "Maria S.", total: 129, items: 1, status: "For Delivery", placed: "10:25 AM" },
    { id: 9003, customer: "Alex T.", total: 478, items: 4, status: "Delivered", placed: "09:55 AM" },
    { id: 9004, customer: "Chris P.", total: 89, items: 1, status: "Cancelled", placed: "09:41 AM" },
    { id: 9005, customer: "Lara Q.", total: 214, items: 2, status: "For Delivery", placed: "10:31 AM" },
  ];

  return (
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
                  <h1 className="text-xl font-semibold leading-tight">{store.name}</h1>
                  <p className="text-xs text-muted-foreground">Operating since {store.since} • <span className="text-green-600 font-medium">Online</span></p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to="/home">User View</Link>
                </Button>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" /> New Product
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/">Logout</Link>
                </Button>
              </div>
            </div>
            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Today's Sales</span>
                  <DollarSign className="h-3 w-3" />
                </div>
                <div className="mt-1 text-lg font-semibold">₱{store.todaySales.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Orders</span>
                  <ShoppingCart className="h-3 w-3" />
                </div>
                <div className="mt-1 text-lg font-semibold">{store.orders}</div>
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Visitors</span>
                  <Users className="h-3 w-3" />
                </div>
                <div className="mt-1 text-lg font-semibold">{store.visitors}</div>
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
                        <Button size="sm" variant="secondary" className="h-7 px-2"><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-destructive border-destructive/40"><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          <TabsContent value="orders">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-medium text-muted-foreground">Recent Orders: {orders.length}</h2>
              <Button size="sm" variant="outline"><ShoppingCart className="h-4 w-4 mr-1" /> Refresh</Button>
            </div>
            <div className="space-y-4">
              {orders.map(o => (
                <Card key={o.id} className="border-l-4 relative pl-2 pr-2" style={{borderLeftColor: o.status === 'Preparing' ? '#d97706' : o.status === 'For Delivery' ? '#2563eb' : o.status === 'Delivered' ? '#15803d' : '#dc2626'}}>
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-start gap-4">
                        <div className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">#{o.id}</div>
                        <div>
                          <div className="font-medium leading-tight">{o.customer}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{o.items} item{o.items>1? 's':''} • Placed {o.placed}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-semibold">₱{o.total}</div>
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</div>
                        </div>
                        <div>
                          {o.status === "Preparing" && <Badge className="bg-amber-500 hover:bg-amber-500">Preparing</Badge>}
                          {o.status === "For Delivery" && <Badge className="bg-blue-600 hover:bg-blue-600">For Delivery</Badge>}
                          {o.status === "Delivered" && <Badge className="bg-green-600 hover:bg-green-600">Delivered</Badge>}
                          {o.status === "Cancelled" && <Badge variant="destructive">Cancelled</Badge>}
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
                      <Input id="storeName" defaultValue={store.name} />
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
  );
}
