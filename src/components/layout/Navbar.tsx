import { useState } from "react";
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
const logo = "/logo.jpg"; // served from public/

const Navbar = () => {
  const [cartCount] = useState(3);
  const [messageCount] = useState(2);
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/home", label: "Home", icon: null },
    { path: "/products", label: "Products", icon: null },
    { path: "/businesses", label: "Businesses", icon: Store },
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
                    {messageCount}
                  </Badge>
                )}
              </Link>
            ))}
            {!profile && (
              <Link to="/login/user">
                <Button variant="secondary" size="sm">Login</Button>
              </Link>
            )}
            {profile && (
              <Button variant="destructive" size="sm" onClick={signOut}>Logout</Button>
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
                          {messageCount}
                        </Badge>
                      )}
                    </Link>
                  ))}
                  <div className="flex items-center justify-between pt-2">
                    {!profile && (
                      <Link to="/login/user" className="w-full">
                        <Button variant="secondary" className="w-full">Login</Button>
                      </Link>
                    )}
                    {profile && (
                      <Button variant="destructive" className="w-full" onClick={signOut}>Logout</Button>
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