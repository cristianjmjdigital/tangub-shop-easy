import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabaseClient";
import { Star, ArrowLeft, MapPin } from "lucide-react";

interface VendorRow {
  id: string;
  store_name?: string | null;
  name?: string | null;
  address?: string | null;
}

interface RatingRow {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  user?: {
    full_name?: string | null;
    barangay?: string | null;
  } | null;
  order_id?: string | null;
}

export default function VendorReviews() {
  const { id } = useParams<{ id: string }>();
  const [vendor, setVendor] = useState<VendorRow | null>(null);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) return;
      setLoading(true); setError(null);
      try {
        const { data: vRow, error: vErr } = await supabase
          .from('vendors')
          .select('id,store_name,name,address')
          .eq('id', id)
          .single();
        if (vErr) throw vErr;
        if (!cancelled) setVendor(vRow as VendorRow);

        const { data: rRows, error: rErr } = await supabase
          .from('order_ratings')
          .select('id,rating,review,created_at,order_id,user:users(full_name,barangay)')
          .eq('vendor_id', id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (rErr) throw rErr;
        if (!cancelled) setRatings((rRows || []) as RatingRow[]);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load reviews');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  const average = useMemo(() => {
    if (!ratings.length) return null;
    const sum = ratings.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return Math.round((sum / ratings.length) * 10) / 10;
  }, [ratings]);

  if (!id) return <div className="p-6 text-sm text-muted-foreground">Missing vendor id.</div>;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Reviews</p>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              {vendor?.store_name || vendor?.name || 'Vendor'}
            </h1>
            {vendor?.address && (
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <MapPin className="h-4 w-4 mr-1" /> {vendor.address}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-col">
            <Button variant="ghost" asChild size="sm">
              <Link to={vendor ? `/business/${vendor.id}` : '/businesses'}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to store
              </Link>
            </Button>
            <Button variant="outline" asChild size="sm">
              <Link to="/ratings">My ratings</Link>
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded border border-destructive/40 bg-destructive/5 text-destructive text-sm">
            {error}
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Overall rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && <div className="text-sm text-muted-foreground">Loading reviews...</div>}
            {!loading && ratings.length === 0 && (
              <div className="text-sm text-muted-foreground">No reviews yet.</div>
            )}
            {!loading && ratings.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold">{average ?? '—'}</div>
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star key={idx} className={`h-4 w-4 ${average && average >= idx + 1 ? 'fill-amber-500' : 'fill-muted text-muted-foreground'}`} />
                  ))}
                </div>
                <Badge variant="secondary">{ratings.length} review{ratings.length === 1 ? '' : 's'}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ratings.map((r) => (
            <Card key={r.id} className="h-full">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star key={idx} className={`h-4 w-4 ${r.rating >= idx + 1 ? 'fill-amber-500' : 'fill-muted text-muted-foreground'}`} />
                    ))}
                  </div>
                  <Badge variant="outline">{r.rating}/5</Badge>
                </div>
                {r.review && <p className="text-sm text-foreground leading-relaxed">{r.review}</p>}
                <Separator />
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>{r.user?.full_name || 'Customer'}{r.user?.barangay ? ` • ${r.user.barangay}` : ''}</span>
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                </div>
                {r.order_id && (
                  <div className="text-[11px] text-muted-foreground">Order #{r.order_id}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
