import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";

const BARANGAYS = [
  "Aquino",
  "Balat-ok",
  "Bintana",
  "Bourbon",
  "Caniangan",
  "Capalaran",
  "Catagan",
  "Cawit",
  "Dimalco",
  "Dimalooc",
  "Guiling",
  "Hoyohoy",
  "Imelda",
  "Kauswagan",
  "Lorenzo Tan",
  "Maquilao",
  "Mantic-an",
  "Matam",
  "Minsuban",
  "Osorio",
  "Panalsalan",
  "Sagayaran",
  "San Apolinario",
  "San Antonio",
  "San Vicente Bajo",
  "San Vicente Alto",
  "Santo Niño",
  "Silanga",
  "Sumirap",
  "Tinacla-an",
  "Villar"
];

export default function UserSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    phone: "",
    city: "Tangub City",
    barangay: "Aquino",
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.confirm) return;
    if (form.password !== form.confirm) return;
    // Mock signup success
    navigate("/home");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-xl">Create Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="09xx-xxx-xxxx" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Barangay</Label>
                <Select value={form.barangay} onValueChange={(v) => setForm({ ...form, barangay: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select barangay" />
                  </SelectTrigger>
                  <SelectContent>
                    {BARANGAYS.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" type="submit">Sign Up</Button>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/login/user">Back to Login</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
