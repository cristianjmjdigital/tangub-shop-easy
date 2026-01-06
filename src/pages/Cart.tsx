import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { 
  Minus, 
  Plus, 
  Trash2, 
  MapPin, 
  CreditCard,
  Truck,
  Store,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/context/AuthContext";

const Cart = () => {
  const { toast } = useToast();
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [paymentMethod] = useState("cash");
  const { items, updateQuantity, removeItem, subtotal, loading, checkout } = useCart();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const cartItems = items.map(i => {
    const vendor = i.product?.vendor || {};
    const vendorId = i.product?.vendor_id || vendor?.id || 'unknown';
    return {
      id: i.id,
      name: i.product?.name || 'Product',
      price: i.product?.price || 0,
      quantity: i.quantity,
      size: (i as any).size || null,
      business: vendor.store_name || vendor.name || 'Vendor',
      businessLocation: vendor.barangay || 'Location',
      vendorId,
      baseDeliveryFee: Number(vendor.base_delivery_fee ?? 0) || 0,
      image: i.product?.image_url || '/placeholder.svg',
      maxQuantity: i.product?.stock || 99,
    };
  });

  const deliveryFeeMap = useMemo(() => {
    if (deliveryMethod !== "delivery") return {} as Record<string, number>;
    const map: Record<string, number> = {};
    cartItems.forEach(item => {
      const key = String(item.vendorId || 'unknown');
      if (!map[key]) map[key] = 0;
      // Use the vendor's base delivery fee; if multiple items same vendor, do not double count
      map[key] = Math.max(map[key], item.baseDeliveryFee);
    });
    return map;
  }, [cartItems, deliveryMethod]);

  const deliveryFee = useMemo(() => {
    if (deliveryMethod !== "delivery") return 0;
    return Object.values(deliveryFeeMap).reduce((sum, fee) => sum + (Number.isFinite(fee) ? Number(fee) : 0), 0);
  }, [deliveryMethod, deliveryFeeMap]);

  const total = subtotal + deliveryFee;

  const businessGroups = useMemo(() => cartItems.reduce((groups, item) => {
    const key = String(item.vendorId || item.business);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {} as Record<string, typeof cartItems>), [cartItems]);

  const placeOrder = async () => {
    if (cartItems.length === 0) {
      toast({ title: "Cart is empty", description: "Please add items to your cart before placing an order.", variant: "destructive" });
      return;
    }
    const { orders } = await checkout({ deliveryFee, deliveryFeeByVendor: deliveryFeeMap, deliveryMethod });
    if (orders.length) {
      navigate('/order/confirmation', { state: { orderIds: orders.map((o:any)=>o.id), summary: orders.map((o:any)=>({ id: o.id, total: o.total, total_amount: o.total_amount })) } });
    }
  };

  if (profile?.role === "vendor") {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container mx-auto px-4 py-10">
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle className="text-lg">Cart unavailable for vendors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Only customer accounts can access the cart and place orders. Switch to a customer profile to continue shopping.</p>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/home">Go to Home</Link>
                </Button>
                <Button asChild className="flex-1" variant="secondary">
                  <Link to="/vendor">Vendor Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!loading && cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto text-center py-20">
            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Store className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
            <p className="text-muted-foreground mb-8">
              Discover amazing products from local businesses in Tangub City
            </p>
            <Button size="lg" asChild>
              <Link to="/products">
                Browse Products
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(businessGroups).map(([businessName, items]) => (
              <Card key={businessName}>
                <CardHeader className="pb-4">
                  <div className="flex items-center">
                    <Store className="h-5 w-5 mr-2 text-primary" />
                    <CardTitle className="text-lg">{businessName}</CardTitle>
                    <Badge variant="outline" className="ml-2">
                      <MapPin className="h-3 w-3 mr-1" />
                      {items[0].businessLocation}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg flex-wrap">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        <span className="text-xs text-center">{item.name}</span>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-primary font-semibold">₱{item.price.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                        {item.size && <p className="text-xs text-muted-foreground">Size: {item.size}</p>}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.maxQuantity}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold">₱{(item.price * item.quantity).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            {/* Delivery Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Delivery Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={deliveryMethod} onValueChange={setDeliveryMethod}>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <RadioGroupItem value="pickup" id="pickup" />
                      <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                        <div className="flex items-center">
                          <Store className="h-4 w-4 mr-2 text-primary" />
                          <div>
                            <p className="font-medium">Store Pickup</p>
                            <p className="text-sm text-muted-foreground">Free - Pick up from business location</p>
                          </div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <RadioGroupItem value="delivery" id="delivery" />
                      <Label htmlFor="delivery" className="flex-1 cursor-pointer">
                        <div className="flex items-center">
                          <Truck className="h-4 w-4 mr-2 text-primary" />
                          <div>
                            <p className="font-medium">Cash on Delivery</p>
                            <p className="text-sm text-muted-foreground">
                              Delivery fee uses each vendor's base fee
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>

                {deliveryMethod === "delivery" && (
                  <div className="mt-4 space-y-3">
                    <Label htmlFor="address">Delivery Address</Label>
                    <Input id="address" placeholder="Enter your complete address in Tangub City" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3 p-3 border rounded-lg bg-accent">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">Cash Payment Only</p>
                    <p className="text-sm text-muted-foreground">
                      {deliveryMethod === "delivery" ? "Pay when delivered" : "Pay when picking up"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal ({cartItems.length} items)</span>
                  <span>₱{subtotal.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>{deliveryFee === 0 ? "Free" : `₱${deliveryFee.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">₱{total.toLocaleString()}</span>
                </div>

                <div className="flex items-center text-sm text-muted-foreground mt-4">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>
                    {deliveryMethod === "delivery" 
                      ? "Estimated delivery: 1-2 hours"
                      : "Ready for pickup in 30 minutes"
                    }
                  </span>
                </div>

                <Button 
                  className="w-full mt-6" 
                  size="lg"
                  onClick={placeOrder}
                >
                  Place Order
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  By placing this order, you agree to our terms and conditions. 
                  You will receive order updates via in-app messaging.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;