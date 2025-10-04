import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Package, 
  Clock,
  Star,
  Edit,
  Settings,
  LogOut,
  Store,
  CreditCard,
  MessageSquare,
  Send,
  X
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Profile = () => {
  const { toast } = useToast();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: profile?.full_name || "", 
    email: profile?.email || "", 
    phone: profile?.phone || "", 
    address: profile?.barangay ? `${profile.barangay}, Tangub City` : "Tangub City"
  });

  interface RecentOrderDisplay {
    id: string;
    business: string;
    items: string;
    total: number;
    status: string;
    date: string;
    rating: number | null;
  }
  const [recentOrders, setRecentOrders] = useState<RecentOrderDisplay[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const statusMapRef = useRef<Record<string,string>>({});
  const initialLoadedRef = useRef(false);
  const lastUpdatedRef = useRef<Record<string, number>>({});
  const pendingChangesRef = useRef<{id:string; status:string}[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [messageOrderId, setMessageOrderId] = useState<string | null>(null);
  const [messageVendorName, setMessageVendorName] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Determine user column (your schema might use profile_id instead of user_id)
  const userColumn = 'user_id'; // change to 'profile_id' if your orders table uses that

  // Load recent orders from DB for current user
  const loadRecentOrders = async () => {
    if (!profile?.id) return;
    setOrdersLoading(true); setOrdersError(null);
    const { data, error } = await supabase
      .from('orders')
      .select(`id,total,status,created_at,vendor:vendors(store_name),order_items:order_items(quantity,unit_price,product:products(name))`)
      .eq(userColumn, profile.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) { setOrdersError(error.message); setOrdersLoading(false); return; }
    const display: RecentOrderDisplay[] = (data || []).map((o: any) => {
      const itemsStr = (o.order_items || [])
        .map((it: any) => `${it.product?.name || 'Item'} (x${it.quantity})`)
        .join(', ');
      statusMapRef.current[o.id] = o.status;
      return {
        id: o.id,
        business: o.vendor?.store_name || 'Unknown Store',
        items: itemsStr || '—',
        total: Number(o.total) || 0,
        status: o.status,
        date: new Date(o.created_at).toLocaleString(),
        rating: null
      };
    });
    setRecentOrders(display);
    setOrdersLoading(false);
    initialLoadedRef.current = true;
  };

  useEffect(() => { loadRecentOrders(); }, [profile?.id]);

  const enqueueStatusChangeToast = (id: string, status: string) => {
    pendingChangesRef.current.push({ id, status });
    if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
    flushTimerRef.current = window.setTimeout(() => {
      const changes = pendingChangesRef.current;
      pendingChangesRef.current = [];
      flushTimerRef.current = null;
      if (changes.length === 0) return;
      if (changes.length === 1) {
        const c = changes[0];
        toast({ title: 'Order Status Updated', description: `Order #${c.id} is now ${c.status}.` });
      } else {
        const summary = changes.map(c => `#${c.id.slice(0,6)}→${c.status}`).join(', ');
        toast({ title: 'Orders Updated', description: summary });
      }
    }, 600); // group rapid changes within 600ms
  };

  // Realtime subscription to order status changes for this user
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel('user-orders-' + profile.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `${userColumn}=eq.${profile.id}` }, async (payload: any) => {
        console.log('[realtime][orders]', payload);
        const newRow = payload.new;
        const orderId = newRow.id;
        const prevStatus = statusMapRef.current[orderId];
        // If existing order status changed
        if (prevStatus && prevStatus !== newRow.status) {
          enqueueStatusChangeToast(orderId, newRow.status);
          lastUpdatedRef.current[orderId] = Date.now();
          statusMapRef.current[orderId] = newRow.status;
          setRecentOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newRow.status } : o));
          return;
        }
        // New order (or we didn't have it cached) – fetch full details then add
        if (!prevStatus) {
          try {
            const { data: full, error: fetchErr } = await supabase
              .from('orders')
              .select(`id,total,status,created_at,vendor:vendors(store_name),order_items:order_items(quantity,product:products(name))`)
              .eq('id', orderId)
              .single();
            if (!fetchErr && full) {
              const itemsStr = (full.order_items || []).map((it: any) => `${it.product?.name || 'Item'} (x${it.quantity})`).join(', ');
              statusMapRef.current[orderId] = full.status;
              lastUpdatedRef.current[orderId] = Date.now();
              enqueueStatusChangeToast(orderId, full.status);
              setRecentOrders(prev => [{
                id: full.id,
                business: full.vendor?.store_name || 'Order',
                items: itemsStr || '—',
                total: Number(full.total) || 0,
                status: full.status,
                date: new Date(full.created_at).toLocaleString(),
                rating: null
              }, ...prev].slice(0,5));
            }
          } catch (e) {
            console.warn('Failed to hydrate new order', e);
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, toast]);

  const favoriteBusinesses = [
    {
      name: "Tangub Delicacies",
      category: "Food & Beverage",
      rating: 4.8,
      orders: 12
    },
    {
      name: "Mountain Coffee",
      category: "Food & Beverage", 
      rating: 4.7,
      orders: 8
    },
    {
      name: "Eco Crafts",
      category: "Electronics",
      rating: 4.5,
      orders: 3
    }
  ];

  const handleSaveProfile = () => {
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your profile has been successfully updated.",
    });
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'delivered': return 'bg-green-600';
      case 'for delivery': return 'bg-orange-500';
      case 'preparing': return 'bg-amber-500';
      case 'cancelled': return 'bg-red-600';
      case 'new':
      case 'created': return 'bg-slate-500';
      default: return 'bg-muted text-foreground';
    }
  };

  const filteredOrders = showActiveOnly
    ? recentOrders.filter(o => !['Delivered','Cancelled'].includes(o.status))
    : recentOrders;

  const openMessageDialog = (orderId: string) => {
    const ord = recentOrders.find(o => o.id === orderId);
    if (!ord) return;
    setMessageOrderId(orderId);
    setMessageVendorName(ord.business);
    setMessageText('');
  };

  const sendOrderMessage = async () => {
    if (!messageOrderId || !profile?.id || !messageText.trim()) return;
    // We assume messages table: vendor_id, sender_user_id, receiver_user_id, content
    // Need vendor_id & receiver_user_id (vendor owner). Fetch vendor to get owner.
    try {
      setSendingMsg(true);
      // fetch order to get vendor_id
      const { data: ord, error: ordErr } = await supabase.from('orders').select('id,vendor_id').eq('id', messageOrderId).single();
      if (ordErr) throw ordErr;
      // fetch vendor to get owner_user_id
      const { data: vend, error: vendErr } = await supabase.from('vendors').select('id,owner_user_id').eq('id', ord.vendor_id).single();
      if (vendErr) throw vendErr;
      const content = messageText.trim();
      await supabase.from('messages').insert({ vendor_id: ord.vendor_id, sender_user_id: profile.id, receiver_user_id: vend.owner_user_id, content });
      toast({ title: 'Message sent', description: `Sent to ${messageVendorName}` });
      setMessageOrderId(null);
    } catch (e: any) {
      toast({ title: 'Failed to send', description: e.message || 'Please retry', variant: 'destructive' });
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {userInfo.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-3xl font-bold mb-2">{userInfo.name}</h1>
                  <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 text-muted-foreground">
                    <div className="flex items-center justify-center md:justify-start">
                      <Mail className="h-4 w-4 mr-2" />
                      {userInfo.email}
                    </div>
                    <div className="flex items-center justify-center md:justify-start">
                      <Phone className="h-4 w-4 mr-2" />
                      {userInfo.phone}
                    </div>
                  </div>
                  <div className="flex items-center justify-center md:justify-start mt-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="text-sm">{userInfo.address}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="orders" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="favorites">Favorites</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="business">My Business</TabsTrigger>
            </TabsList>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Recent Orders
                  </CardTitle>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Button variant="outline" size="sm" onClick={loadRecentOrders} disabled={ordersLoading}>
                      {ordersLoading ? 'Refreshing...' : 'Refresh'}
                    </Button>
                    <Button variant={showActiveOnly ? 'default' : 'outline'} size="sm" onClick={()=>setShowActiveOnly(v=>!v)}>
                      {showActiveOnly ? 'Showing Active' : 'Showing All'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {ordersLoading && (
                      <div className="text-xs text-muted-foreground">Loading recent orders...</div>
                    )}
                    {ordersError && (
                      <div className="text-xs text-destructive">{ordersError}</div>
                    )}
                    {!ordersLoading && !ordersError && recentOrders.length === 0 && (
                      <div className="text-sm text-muted-foreground">No recent orders.</div>
                    )}
                    {filteredOrders.map((order) => {
                      const updatedAge = Date.now() - (lastUpdatedRef.current[order.id] || 0);
                      const recentlyUpdated = updatedAge < 4000; // 4s highlight
                      return (
                      <div key={order.id} className={`border rounded-lg p-4 relative ${recentlyUpdated ? 'ring-1 ring-primary/40 bg-primary/5 animate-pulse-subtle' : ''}`}>
                        {recentlyUpdated && (
                          <span className="absolute top-1 right-2 text-[10px] text-primary/80">Updated just now</span>
                        )}
                        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="font-semibold">Order #{order.id}</span>
                              <Badge className={`${getStatusColor(order.status)} text-white`}>
                                {order.status}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm mb-1">{order.business}</p>
                            <p className="text-sm">{order.items}</p>
                            <div className="flex items-center text-sm text-muted-foreground mt-2">
                              <Clock className="h-3 w-3 mr-1" />
                              {order.date}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-bold text-lg">₱{order.total.toLocaleString()}</p>
                            {order.rating ? (
                              <div className="flex items-center mt-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="ml-1 text-sm">{order.rating}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2 mt-1">
                                <Button variant="outline" size="sm">
                                  Rate Order
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => openMessageDialog(order.id)} className="flex items-center gap-1">
                                  <MessageSquare className="h-3.5 w-3.5" /> Message
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      );
                    })}
                    
                    <div className="text-center mt-6">
                      <Button variant="outline" asChild>
                        <Link to="/orders">View All Orders</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Favorites Tab */}
            <TabsContent value="favorites">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="h-5 w-5 mr-2" />
                    Favorite Businesses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favoriteBusinesses.map((business, index) => (
                      <Card key={index} className="hover:shadow-elegant transition-shadow">
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-2">{business.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{business.category}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="ml-1 text-sm">{business.rating}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {business.orders} orders
                            </span>
                          </div>
                          <Button variant="outline" size="sm" className="w-full mt-3" asChild>
                            <Link to="/businesses">Visit Store</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isEditing ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={userInfo.name}
                            onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={userInfo.email}
                            onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            value={userInfo.phone}
                            onChange={(e) => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={userInfo.address}
                          onChange={(e) => setUserInfo(prev => ({ ...prev, address: e.target.value }))}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={handleSaveProfile}>Save Changes</Button>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                          <p className="text-lg">{userInfo.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                          <p className="text-lg">{userInfo.email}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                          <p className="text-lg">{userInfo.phone}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                        <p className="text-lg">{userInfo.address}</p>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Account Actions</h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Payment Methods
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Settings className="h-4 w-4 mr-2" />
                        Privacy Settings
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-destructive hover:text-destructive"
                        onClick={async () => { await signOut(); navigate('/'); }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Log Out
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Business Tab */}
            <TabsContent value="business">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Store className="h-5 w-5 mr-2" />
                    Business Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12">
                  <Store className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-4">Start Your Business</h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    Join our community of local entrepreneurs and start selling your products to customers in Tangub City.
                  </p>
                  <Button size="lg" asChild>
                    <Link to="/register-business">
                      Register Your Business
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Dialog open={!!messageOrderId} onOpenChange={(o)=>{ if(!o){ setMessageOrderId(null);} }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">Message {messageVendorName || 'Vendor'}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>setMessageOrderId(null)}><X className="h-4 w-4" /></Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea value={messageText} onChange={e=>setMessageText(e.target.value)} placeholder="Type your message about this order..." rows={4} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={()=>setMessageOrderId(null)}>Cancel</Button>
              <Button size="sm" disabled={!messageText.trim() || sendingMsg} onClick={sendOrderMessage}>
                {sendingMsg ? 'Sending...' : (<span className="inline-flex items-center gap-1"><Send className="h-3.5 w-3.5" /> Send</span>)}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Your message will appear in Messages. Vendor can reply there.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// (Messaging dialog integrated above) single default export below.

export default Profile;