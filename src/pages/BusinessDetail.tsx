import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductCard from "@/components/ui/ProductCard";
import { ArrowLeft, Clock, Heart, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";

const menu = [
  { id: 1, name: "Beef Burger", price: 160, rating: 4.8, business: "Burger King", location: "Poblacion", image: "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=600&auto=format&fit=crop" },
  { id: 2, name: "Double Cheese Burger", price: 180, rating: 4.7, business: "Burger King", location: "Poblacion", image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop" },
  { id: 3, name: "Fries & Sides", price: 90, rating: 4.6, business: "Burger King", location: "Poblacion", image: "https://images.unsplash.com/photo-1550547660-3a06a9f4b2d8?q=80&w=600&auto=format&fit=crop" },
];

export default function BusinessDetail() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header image */}
      <div className="relative">
        <img src="https://images.unsplash.com/photo-1550317138-10000687a72b?q=80&w=1200&auto=format&fit=crop" alt="cover" className="h-56 w-full object-cover" />
        <div className="absolute top-3 left-3 flex gap-2">
          <Link to="/home" className="inline-flex"><Button size="icon" variant="secondary" className="rounded-full"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <Button size="icon" variant="secondary" className="rounded-full"><Heart className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="px-6 -mt-8 relative z-10">
        <Card className="rounded-2xl shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">Burger King</h1>
                <div className="flex items-center text-sm text-muted-foreground gap-4 mt-1">
                  <div className="flex items-center"><Star className="h-4 w-4 text-yellow-400 fill-yellow-400" /><span className="ml-1">4.8</span></div>
                  <div className="flex items-center"><MapPin className="h-4 w-4" /><span className="ml-1">Free Delivery</span></div>
                  <div className="flex items-center"><Clock className="h-4 w-4" /><span className="ml-1">20 mins</span></div>
                </div>
              </div>
              <img src="/logo.jpg" alt="brand" className="h-12 w-12 rounded-full object-cover border" />
            </div>

            {/* Offer card */}
            <div className="mt-5">
              <div className="rounded-xl bg-secondary p-4 flex items-center justify-between">
                <div>
                  <Badge className="bg-accent text-accent-foreground">30% Off</Badge>
                  <div className="font-semibold mt-2">The King's Combo!</div>
                  <p className="text-sm text-muted-foreground">Burger + Fries + Drink. Limited time only!</p>
                </div>
                <Button className="rounded-full">View Offer</Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="burgers" className="mt-6">
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="burgers">Burgers</TabsTrigger>
                <TabsTrigger value="meals">King Meals</TabsTrigger>
                <TabsTrigger value="sides">Fries & Sides</TabsTrigger>
                <TabsTrigger value="drinks">Drinks</TabsTrigger>
              </TabsList>
              <TabsContent value="burgers" className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {menu.map((m) => (
                    <ProductCard key={m.id} {...m} />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
