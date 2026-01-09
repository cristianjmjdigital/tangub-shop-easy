import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const loginOptions = [
  {
    title: "Customer",
    description: "Shop, track orders, and manage your cart.",
    href: "/login/user",
    variant: "default" as const,
  },
  {
    title: "Vendor",
    description: "Manage products, fulfill orders, and chat with customers.",
    href: "/login/vendor",
    variant: "outline" as const,
  },
];

export default function Login() {
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-12">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-10 rounded-3xl border border-border/60 bg-background/95 p-8 text-center shadow-xl backdrop-blur">
        <div className="mb-10">
        <img src="/logo.jpg" alt="Tangub City Shopeasy" className="h-32 w-auto mx-auto rounded-xl shadow" />
        <h1 className="mt-6 text-3xl font-bold text-primary">Tangub City Shopeasy</h1>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          Choose how you want to access the marketplace.
        </p>
      </div>
        <div className="space-y-4">
          {loginOptions.map((option) => (
            <div key={option.href} className="rounded-2xl border border-border/80 bg-card/60 p-6 text-left shadow-sm">
              <div className="mb-4 space-y-1">
                <h2 className="text-xl font-semibold text-foreground">{option.title} Portal</h2>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
              <Link to={option.href} className="block">
                <Button variant={option.variant} className="w-full">
                  Continue to {option.title} Login
                </Button>
              </Link>
            </div>
          ))}
        </div>
        
      <div className="mt-8 text-xs text-muted-foreground"><Link to="/admin/login">Admin Login</Link></div>
      </div>
    </div>
  );
}
