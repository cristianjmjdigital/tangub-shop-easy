import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
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
  const { items, updateQuantity, removeItem, loading, checkout } = useCart();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const cartItems = items.map(i => {
    const vendor = i.product?.vendor || {};
    const vendorId = i.product?.vendor_id || vendor?.id || 'unknown';
    const productImage = i.product?.main_image_url || i.product?.image_url || (Array.isArray((i.product as any)?.images) ? (i.product as any).images[0] : undefined) || '/placeholder.svg';
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
      image: productImage,
      maxQuantity: i.product?.stock || 99,
    };
  });

  useEffect(() => {
    const nextIds = items.map((item) => item.id);
    setSelectedItemIds((prev) => {
      if (!prev.length) return nextIds;
      const nextSet = new Set(nextIds);
      const preserved = prev.filter((id) => nextSet.has(id));
      const newOnes = nextIds.filter((id) => !prev.includes(id));
      return [...preserved, ...newOnes];
    });
  }, [items]);

  const selectedIdSet = useMemo(() => new Set(selectedItemIds), [selectedItemIds]);
  const selectedCartItems = useMemo(() => cartItems.filter((item) => selectedIdSet.has(item.id)), [cartItems, selectedIdSet]);
  const allSelected = cartItems.length > 0 && selectedCartItems.length === cartItems.length;
  const selectAllState = allSelected ? true : selectedCartItems.length > 0 ? 'indeterminate' : false;

  const toggleSelectAll = (checked: boolean) => {
    setSelectedItemIds(checked ? cartItems.map((item) => item.id) : []);
  };

  const toggleItemSelection = (itemId: string, checked: boolean) => {
    setSelectedItemIds((prev) => {
      if (checked) {
        if (prev.includes(itemId)) return prev;
        return [...prev, itemId];
      }
      return prev.filter((id) => id !== itemId);
    });
  };

  const selectedDeliveryFeeMap = useMemo(() => {
    if (deliveryMethod !== "delivery") return {} as Record<string, number>;
    const map: Record<string, number> = {};
    selectedCartItems.forEach(item => {
      const key = String(item.vendorId || 'unknown');
      if (!map[key]) map[key] = 0;
      map[key] = Math.max(map[key], item.baseDeliveryFee);
    });
    return map;
  }, [selectedCartItems, deliveryMethod]);

  const deliveryFee = useMemo(() => {
    if (deliveryMethod !== "delivery") return 0;
    return Object.values(selectedDeliveryFeeMap).reduce((sum, fee) => sum + (Number.isFinite(fee) ? Number(fee) : 0), 0);
  }, [deliveryMethod, selectedDeliveryFeeMap]);

  const selectedSubtotal = useMemo(() => selectedCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [selectedCartItems]);

  const total = selectedSubtotal + deliveryFee;

  const businessGroups = useMemo(() => cartItems.reduce((groups, item) => {
    const key = String(item.vendorId || item.business);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {} as Record<string, typeof cartItems>), [cartItems]);

  const placeOrder = async () => {
    if (!selectedCartItems.length) {
      toast({ title: "No items selected", description: "Choose at least one item before checking out.", variant: "destructive" });
      return;
    }
    const { orders } = await checkout({ deliveryFee, deliveryFeeByVendor: selectedDeliveryFeeMap, deliveryMethod, selectedItemIds });
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
            <div className="flex items-center justify-between rounded-lg border border-dashed border-muted px-4 py-3" aria-live="polite">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  id="select-all"
                  checked={selectAllState}
                  onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                  aria-label="Select all items"
                />
                <Label htmlFor="select-all" className="cursor-pointer">
                  Select all ({selectedCartItems.length}/{cartItems.length})
                </Label>
              </div>
              {selectedCartItems.length > 0 && selectedCartItems.length !== cartItems.length && (
                <Button variant="ghost" size="sm" onClick={() => toggleSelectAll(false)}>
                  Clear selection
                </Button>
              )}
            </div>
            {Object.entries(businessGroups).map(([businessName, items]) => (
              <Card key={businessName}>
                <CardHeader className="pb-4">
                  <div className="flex items-center">
                    <Store className="h-5 w-5 mr-2 text-primary" />
                    <CardTitle className="text-lg">{items[0]?.business || businessName}</CardTitle>
                    <Badge variant="outline" className="ml-2">
                      <MapPin className="h-3 w-3 mr-1" />
                      {items[0].businessLocation}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center gap-4 p-4 border rounded-lg">
                      <Checkbox
                        checked={selectedIdSet.has(item.id)}
                        onCheckedChange={(checked) => toggleItemSelection(item.id, checked === true)}
                        aria-label={`Select ${item.name}`}
                        className="shrink-0"
                      />
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg";
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-[150px]">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-primary font-semibold">
                          ₱{item.price.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}
                        </p>
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
                        <p className="font-semibold">
                          ₱{(item.price * item.quantity).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}
                        </p>
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
                  <span>Subtotal ({selectedCartItems.length} selected)</span>
                  <span>
                    ₱{selectedSubtotal.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>{deliveryFee === 0 ? "Free" : `₱${deliveryFee.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">
                    ₱{total.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}
                  </span>
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
                  disabled={!selectedCartItems.length || loading}
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