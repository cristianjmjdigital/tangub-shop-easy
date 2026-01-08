import { useEffect, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { supabase } from '@/lib/supabaseClient';
const logo = "/logo.jpg"; // served from public/

const Navbar = () => {
  const { items } = useCart({ autoCreate: false });
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const [messageCount, setMessageCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<{ id: string; label: string; href: string; type: 'product' | 'vendor' }[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { session, profile, loading, signOut } = useAuth();
  const loggedIn = !!session;
  const isVendor = profile?.role === 'vendor';
  const loginPath = isVendor ? '/login/vendor' : '/login/user';

  const fetchUnreadCount = useCallback(async () => {
    const userId = profile?.id;
    if (!userId) {
      setMessageCount(0);
      return;
    }
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_user_id', userId)
      .is('read_at', null);
    if (!error) setMessageCount(count ?? 0);
  }, [profile?.id]);

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate(loginPath);
    }
  };

  // Subscribe to unread messages and keep badge in sync
  useEffect(() => {
    const userId = profile?.id;
    if (!userId) { setMessageCount(0); return; }
    let active = true;

    fetchUnreadCount();

    const channel = supabase.channel('navbar-messages-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_user_id=eq.${userId}` }, () => {
        // Recompute to avoid drift and ensure we only show unread messages
        fetchUnreadCount();
      })
      .subscribe();

    const interval = window.setInterval(() => { if (active) fetchUnreadCount(); }, 30000);
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchUnreadCount(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      active = false;
      supabase.removeChannel(channel);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [profile?.id, fetchUnreadCount]);

  // When user opens messages page, refresh unread count to clear badge promptly
  useEffect(() => {
    if (location.pathname.startsWith('/messages')) fetchUnreadCount();
  }, [location.pathname, fetchUnreadCount]);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/home", label: "Home", icon: null, requiresAuth: false },
    { path: "/products", label: "Products", icon: null, requiresAuth: false },
    // { path: "/businesses", label: "Businesses", icon: Store },
    { path: "/messages", label: "Messages", icon: MessageCircle, requiresAuth: true },
    { path: "/profile", label: "Profile", icon: User, requiresAuth: true },
  ];

  const visibleNavItems = navItems.filter(item => !item.requiresAuth || loggedIn);

  // Autocomplete search against products and vendors
  useEffect(() => {
    const term = searchTerm.trim();
    if (!term) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    let isCancelled = false;
    const run = async () => {
      setSearching(true);
      try {
        const like = `%${term}%`;
        const [prod, vend] = await Promise.all([
          supabase.from('products').select('id,name').ilike('name', like).limit(5),
          supabase.from('vendors').select('id,store_name').ilike('store_name', like).limit(5)
        ]);
        if (isCancelled) return;
        const productSuggestions = (prod.data || []).map((p: any) => ({
          id: p.id,
          label: p.name,
          href: `/products?q=${encodeURIComponent(p.name)}`,
          type: 'product' as const
        }));
        const vendorSuggestions = (vend.data || []).map((v: any) => ({
          id: v.id,
          label: v.store_name,
          href: `/business/${v.id}`,
          type: 'vendor' as const
        }));
        setSuggestions([...productSuggestions, ...vendorSuggestions].slice(0, 8));
      } finally {
        if (!isCancelled) setSearching(false);
      }
    };
    const timer = window.setTimeout(run, 180);
    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  const submitSearch = () => {
    const term = searchTerm.trim();
    if (!term) return;
    navigate(`/products?q=${encodeURIComponent(term)}`);
    setShowSuggestions(false);
  };

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
            {visibleNavItems.map((item) => (
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
            {!loading && !loggedIn && (
                <Link to="/login">
                <Button variant="secondary" size="sm">Login Now</Button>
                </Link>
            )}
            {!loading && loggedIn && (
              <div className="flex gap-2 items-center">
                {profile?.role === 'vendor' && (
                  <>
                    <Link to="/vendor">
                      <Button variant="secondary" size="sm">Vendor Panel</Button>
                    </Link>
                    <Badge variant="outline" className="border-white/50 text-white/90">Vendor</Badge>
                  </>
                )}
                <Button variant="destructive" size="sm" onClick={handleLogout}>Logout</Button>
              </div>
            )}
          </div>

          {/* Cart and Mobile Menu */}
          <div className="flex items-center space-x-2">
            {loggedIn && !isVendor && (
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
            )}

            {/* Mobile Menu */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="secondary" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-4 mt-6">
                  {visibleNavItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setDrawerOpen(false)}
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
                    {!loading && !loggedIn && (
                      <div className="w-full flex flex-col gap-2">
                        <Link to="/login">
                        <Button variant="secondary" size="sm">Login Now</Button>
                        </Link>
                      </div>
                    )}
                    {!loading && loggedIn && (
                      <div className="w-full flex flex-col gap-2">
                        {profile?.role === 'vendor' && (
                          <div className="w-full flex flex-col gap-1">
                            <Link to="/vendor" className="w-full" onClick={() => setDrawerOpen(false)}>
                              <Button variant="secondary" className="w-full">Vendor Panel</Button>
                            </Link>
                            <Badge variant="outline" className="self-start">Vendor</Badge>
                          </div>
                        )}
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={() => { setDrawerOpen(false); handleLogout(); }}
                        >
                          Logout
                        </Button>
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
              placeholder="Search products or shops..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
              className="pl-10 pr-4 py-3 text-base bg-white text-foreground border-0 shadow-sm rounded-full"
            />
            {showSuggestions && (
              <div className="absolute left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-50 max-h-72 overflow-auto">
                {searching && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">Searching...</div>
                )}
                {!searching && suggestions.length === 0 && searchTerm.trim().length > 0 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">No matches found.</div>
                )}
                {!searching && suggestions.map((s) => (
                  <Link
                    key={`${s.type}-${s.id}`}
                    to={s.href}
                    onClick={() => setShowSuggestions(false)}
                    className="flex items-center gap-2 px-4 py-3 hover:bg-accent text-sm"
                  >
                    <span className="text-xs uppercase text-muted-foreground">{s.type === 'product' ? 'Product' : 'Shop'}</span>
                    <span className="font-medium text-foreground">{s.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;