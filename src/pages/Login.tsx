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
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Login as</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Choose your portal</h1>
          <p className="text-base text-muted-foreground">
            Pick the experience that matches how you use Tangub Shop Easy. You can always come back and switch.
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
        <p className="text-xs text-muted-foreground">
          Need help? Contact support via the in-app chat after logging in.
        </p>
      </div>
    </div>
  );
}
