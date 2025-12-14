import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/hooks/use-cart";

const tabs = [
  { to: "/home", label: "Home", icon: Home, requiresAuth: false },
  { to: "/products", label: "Products", icon: ShoppingBag, requiresAuth: false },
  { to: "/cart", label: "Cart", icon: ShoppingCart, requiresAuth: true },
  { to: "/profile", label: "Profile", icon: User, requiresAuth: true },
];

export default function BottomNav() {
  const location = useLocation();
  const { profile } = useAuth();
  const { items } = useCart({ autoCreate: false });
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const visibleTabs = tabs.filter(t => !t.requiresAuth || !!profile);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <ul className={`grid ${visibleTabs.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
        {visibleTabs.map((t) => {
          const active = location.pathname === t.to;
          const Icon = t.icon;
          return (
            <li key={t.to}>
              <Link
                to={t.to}
                className={`flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                  {t.to === "/cart" && cartCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-4 min-w-4 px-1 p-0 text-[10px] leading-4 flex items-center justify-center bg-accent text-accent-foreground">
                      {cartCount}
                    </Badge>
                  )}
                </div>
                <span className="mt-1">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
