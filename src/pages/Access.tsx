import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Access() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary/10 to-background px-6 text-center">
      <div className="mb-10">
        <img src="/logo.jpg" alt="Tangub City Shopeasy" className="h-32 w-auto mx-auto rounded-xl shadow" />
        <h1 className="mt-6 text-3xl font-bold text-primary">Tangub City Shopeasy</h1>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          Choose how you want to access the marketplace.
        </p>
      </div>
      <div className="w-full max-w-sm space-y-4">
        <Button size="lg" className="w-full rounded-full" asChild>
          <Link to="/login/user">User Login</Link>
        </Button>
        <Button size="lg" variant="outline" className="w-full rounded-full border-primary text-primary hover:bg-secondary" asChild>
          <Link to="/login/vendor">Vendor Login</Link>
        </Button>
      </div>
      <div className="mt-8 text-xs text-muted-foreground">Prototype access screen</div>
    </div>
  );
}
