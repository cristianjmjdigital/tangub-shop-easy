import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { 
  Menu, 
  Search, 
  ShoppingCart, 
  MessageCircle, 
  User, 
  Store,
  MapPin 
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { Skeleton } from "@/components/ui/skeleton";
import { computeUnreadForUser } from '@/pages/Messages';
import { supabase } from '@/lib/supabaseClient';
const logo = "/logo.jpg"; // served from public/

const Navbar = () => {
  const { items } = useCart({ autoCreate: false });
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const [messageCount, setMessageCount] = useState(0);
  const location = useLocation();
  const { profile, loading, signOut } = useAuth();

  // subscribe to unread messages
  useEffect(()=>{
    let userId = profile?.id; // fallback later once profile loads
    if (!userId) return; // wait for profile
    let isMounted = true;
    const load = async () => {
      const { data } = await supabase
        .from('messages')
        .select('id,receiver_user_id,read_at')
        .eq('receiver_user_id', userId)
        .is('read_at', null);
      if (isMounted) setMessageCount((data||[]).length);
    };
    load();
    const channel = supabase.channel('navbar-messages-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_user_id=eq.${userId}` }, payload => {
        setMessageCount(prev => {
          const newRow: any = payload.new;
          if (!newRow) return prev;
          // If message inserted for this user and unread
          if (payload.eventType === 'INSERT' && !newRow.read_at) return prev + 1;
          // If message updated (read_at set) reduce count
            if (payload.eventType === 'UPDATE') {
              if (newRow.read_at) return Math.max(0, prev - 1);
            }
          return prev;
        });
      })
      .subscribe();
    return () => { isMounted = false; supabase.removeChannel(channel); };
  }, [profile?.id]);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/home", label: "Home", icon: null },
    { path: "/products", label: "Products", icon: null },
    // { path: "/businesses", label: "Businesses", icon: Store },
    { path: "/messages", label: "Messages", icon: MessageCircle },
    { path: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between py-3">
          <Link to="/home" className="flex items-center space-x-2 group">
            <div className="relative h-12 w-12 flex items-center justify-center">
              <img
                src={logo}
                alt="Tangub City Shopeasy"
                className="h-12 w-auto drop-shadow-sm transition-transform group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('[data-fallback]');
                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                }}
              />
              <div
                data-fallback
                className="hidden absolute inset-0 bg-gradient-primary rounded-md items-center justify-center"
              >
                <Store className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg leading-tight">Tangub City<br /><span className="text-accent-foreground/90">Shopeasy</span></h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? "bg-white/15 text-white"
                    : "text-primary-foreground/90 hover:text-white hover:bg-white/10"
                }`}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                <span>{item.label}</span>
                {item.path === "/messages" && messageCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                    {messageCount > 99 ? '99+' : messageCount}
                  </Badge>
                )}
              </Link>
            ))}
            {loading && (
              <div className="flex gap-2 items-center">
                <Skeleton className="h-8 w-24 rounded" />
                <Skeleton className="h-8 w-20 rounded" />
              </div>
            )}
            {!loading && !profile && (
              <div className="flex gap-2">
                <Link to="/login/user">
                  <Button variant="secondary" size="sm">User Login</Button>
                </Link>
                <Link to="/login/vendor">
                  <Button variant="outline" size="sm" className="border-white/40 text-white hover:bg-white/10">Vendor</Button>
                </Link>
              </div>
            )}
            {!loading && profile && (
              <div className="flex gap-2 items-center">
                {profile.role === 'vendor' && (
                  <>
                    <Link to="/vendor">
                      <Button variant="secondary" size="sm">Vendor Panel</Button>
                    </Link>
                    <Badge variant="outline" className="border-white/50 text-white/90">Vendor</Badge>
                  </>
                )}
                <Button variant="destructive" size="sm" onClick={signOut}>Logout</Button>
              </div>
            )}
          </div>

          {/* Cart and Mobile Menu */}
          <div className="flex items-center space-x-2">
            <Link to="/cart">
              <Button variant="secondary" size="sm" className="relative">
                <ShoppingCart className="h-4 w-4" />
                {cartCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="secondary" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-4 mt-6">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive(item.path)
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                    >
                      {item.icon && <item.icon className="h-5 w-5" />}
                      <span className="font-medium">{item.label}</span>
                      {item.path === "/messages" && messageCount > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {messageCount > 99 ? '99+' : messageCount}
                        </Badge>
                      )}
                    </Link>
                  ))}
                  <div className="flex items-center justify-between pt-2">
                    {!loading && !profile && (
                      <div className="w-full flex flex-col gap-2">
                        <Link to="/login/user" className="w-full">
                          <Button variant="secondary" className="w-full">User Login</Button>
                        </Link>
                        <Link to="/login/vendor" className="w-full">
                          <Button variant="outline" className="w-full">Vendor Login</Button>
                        </Link>
                      </div>
                    )}
                    {!loading && profile && (
                      <div className="w-full flex flex-col gap-2">
                        {profile.role === 'vendor' && (
                          <div className="w-full flex flex-col gap-1">
                            <Link to="/vendor" className="w-full">
                              <Button variant="secondary" className="w-full">Vendor Panel</Button>
                            </Link>
                            <Badge variant="outline" className="self-start">Vendor</Badge>
                          </div>
                        )}
                        <Button variant="destructive" className="w-full" onClick={signOut}>Logout</Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        {/* Search Bar (white pill) */}
        <div className="pb-4">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products, businesses in Tangub City..."
              className="pl-10 pr-4 py-3 text-base bg-white text-foreground border-0 shadow-sm rounded-full"
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;