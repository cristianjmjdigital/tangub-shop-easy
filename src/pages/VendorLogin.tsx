import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

export default function VendorLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-xl">Vendor Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Business Email" type="email" />
          <Input placeholder="Password" type="password" />
          <Button className="w-full" asChild>
            <Link to="/vendor">Enter Vendor Panel (Mock)</Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/">Back</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
