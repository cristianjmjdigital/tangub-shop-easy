import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, Loader2, ShoppingBag, Star } from "lucide-react";

interface OrderRow {
  id: string;
  vendor_id: string;
  vendor_name: string;
  status: string;
  total: number;
  created_at: string;
}

interface RatingRow {
  order_id: string;
  rating: number;
  review: string | null;
  created_at?: string | null;
}

const rateableStatuses = new Set(["delivered", "completed", "ready"]);

const Ratings = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ratings, setRatings] = useState<Record<string, RatingRow>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialOrderId = searchParams.get("orderId");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialOrderId);
  const [ratingValue, setRatingValue] = useState(3);
  const [reviewText, setReviewText] = useState("");

  useEffect(() => {
    setSelectedOrderId(initialOrderId);
  }, [initialOrderId]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );
  const existingRating = selectedOrderId ? ratings[selectedOrderId] : undefined;

  useEffect(() => {
    if (existingRating) {
      setRatingValue(Math.min(3, Math.max(1, existingRating.rating)));
      setReviewText(existingRating.review || "");
    } else {
      setReviewText("");
      setRatingValue(3);
    }
  }, [existingRating, selectedOrderId]);

  const load = async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data: orderRows, error: orderErr } = await supabase
        .from("orders")
        .select(
          "id,total,status,created_at,vendor_id,vendors(store_name),order_ratings!left(order_id,rating,review,created_at)"
        )
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (orderErr) throw orderErr;

      const mappedRatings: Record<string, RatingRow> = {};
      const mappedOrders: OrderRow[] = (orderRows || []).map((o: any) => {
        const firstRating = Array.isArray(o.order_ratings) ? o.order_ratings[0] : null;
        if (firstRating) {
          mappedRatings[o.id] = {
            order_id: firstRating.order_id,
            rating: firstRating.rating,
            review: firstRating.review,
            created_at: firstRating.created_at,
          };
        }
        return {
          id: o.id,
          vendor_id: o.vendor_id,
          vendor_name: o.vendors?.store_name || "Vendor",
          status: o.status,
          total: Number(o.total) || 0,
          created_at: o.created_at,
        } as OrderRow;
      });
      setOrders(mappedOrders);
      setRatings(mappedRatings);
      const rateableIds = mappedOrders
        .filter((o) => rateableStatuses.has((o.status || "").toLowerCase()))
        .map((o) => o.id);
      if (initialOrderId && mappedOrders.some((o) => o.id === initialOrderId)) {
        setSelectedOrderId(initialOrderId);
      } else if (!selectedOrderId && rateableIds.length) {
        setSelectedOrderId(rateableIds[0]);
      } else if (!selectedOrderId && mappedOrders.length) {
        setSelectedOrderId(mappedOrders[0].id);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load ratings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const handleSave = async () => {
    if (!profile?.id) {
      navigate("/login/user");
      return;
    }
    if (!selectedOrder) {
      toast({ title: "Select an order", description: "Pick an order to rate." });
      return;
    }
    const cleanRating = Math.min(3, Math.max(1, ratingValue));
    setSaving(true);
    try {
      const payload = {
        order_id: selectedOrder.id,
        user_id: profile.id,
        vendor_id: selectedOrder.vendor_id,
        rating: cleanRating,
        review: reviewText.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const { error: upsertErr } = await supabase
        .from("order_ratings")
        .upsert(payload, { onConflict: "order_id,user_id" });
      if (upsertErr) throw upsertErr;
      setRatings((prev) => ({
        ...prev,
        [selectedOrder.id]: {
          order_id: selectedOrder.id,
          rating: cleanRating,
          review: payload.review,
          created_at: prev[selectedOrder.id]?.created_at || new Date().toISOString(),
        },
      }));
      toast({
        title: "Rating saved",
        description: `Thanks for rating order #${selectedOrder.id}.`,
      });
    } catch (e: any) {
      toast({
        title: "Could not save",
        description: e.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const rateableOrders = useMemo(() => {
    return orders.filter((o) => rateableStatuses.has((o.status || "").toLowerCase()));
  }, [orders]);

  const historyOrders = useMemo(() => {
    return orders.filter((o) => !rateableStatuses.has((o.status || "").toLowerCase()));
  }, [orders]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container mx-auto px-4 py-12 max-w-xl text-center space-y-4">
          <h1 className="text-2xl font-semibold">Ratings & Reviews</h1>
          <p className="text-muted-foreground">Sign in to rate your orders and leave feedback for vendors.</p>
          <div className="flex gap-3 justify-center">
            <Button asChild>
              <Link to="/login/user">Login</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/signup/user">Create account</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Feedback</p>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> Ratings & Reviews
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" asChild size="sm">
              <Link to="/home"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
            </Button>
            <Button variant="outline" asChild size="sm">
              <Link to="/orders"><ShoppingBag className="h-4 w-4 mr-1" />Orders</Link>
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded border border-destructive/40 bg-destructive/5 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" /> Select an order to rate
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Completed orders are eligible for rating. Tap an order below to fill in your review.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading rateable orders...
                </div>
              )}
              {!loading && rateableOrders.length === 0 && (
                <div className="text-sm text-muted-foreground">No completed orders ready for rating yet.</div>
              )}
              {rateableOrders.map((o) => {
                const rated = ratings[o.id];
                const active = selectedOrderId === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setSelectedOrderId(o.id)}
                    className={`w-full text-left border rounded-lg p-4 transition-colors ${
                      active ? "border-primary bg-primary/5" : "hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Order #{o.id}</span>
                          <Badge variant="outline" className="capitalize">{o.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">{o.vendor_name}</div>
                        <div className="text-xs text-muted-foreground">Placed {new Date(o.created_at).toLocaleString()}</div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-lg font-semibold text-primary">₱{o.total.toLocaleString()}</div>
                        {rated ? (
                          <div className="inline-flex items-center gap-1 text-sm text-amber-600">
                            <Star className="h-4 w-4 fill-amber-500 text-amber-500" /> {Math.min(3, rated.rating)}/3
                          </div>
                        ) : (
                          <Badge variant="secondary">Not rated</Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {historyOrders.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-xs uppercase text-muted-foreground mb-2">Still in progress</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {historyOrders.map((o) => (
                      <div key={o.id} className="border rounded-lg p-3 bg-muted/40">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Order #{o.id}</span>
                          <Badge variant="outline" className="capitalize">{o.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{o.vendor_name}</div>
                        <div className="text-xs text-muted-foreground">Placed {new Date(o.created_at).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rate this order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedOrder && (
                <div className="text-sm text-muted-foreground">Select a completed order to begin your rating.</div>
              )}
              {selectedOrder && (
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="font-medium">Order #{selectedOrder.id}</div>
                    <div className="text-muted-foreground">{selectedOrder.vendor_name}</div>
                    <div className="text-xs text-muted-foreground">Status: {selectedOrder.status}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rating (1-3)</label>
                    <Input
                      type="number"
                      min={1}
                      max={3}
                      value={ratingValue}
                      onChange={(e) => setRatingValue(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Review (optional)</label>
                    <Textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      rows={4}
                      placeholder="Share what went well or what can improve."
                    />
                  </div>
                  <Button className="w-full" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                      </>
                    ) : existingRating ? (
                      "Update rating"
                    ) : (
                      "Submit rating"
                    )}
                  </Button>
                  {existingRating && (
                    <p className="text-xs text-muted-foreground">
                      Last saved {existingRating.created_at ? new Date(existingRating.created_at).toLocaleString() : "recently"}.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Ratings;
