import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

export default function UserLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-xl">User Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Email" type="email" />
            <Input placeholder="Password" type="password" />
          <Button className="w-full" asChild>
            <Link to="/home">Continue (Mock)</Link>
          </Button>
          <div className="text-center text-sm text-muted-foreground">Don't have an account? <Link to="/signup/user" className="text-primary font-medium">Sign up</Link></div>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/">Back</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
