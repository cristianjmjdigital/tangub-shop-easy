// Supabase Edge Function: send web push notifications for an order update
// Deploy with: supabase functions deploy push-order-update --project-ref <ref>
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webpush from "npm:web-push";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");

if (!supabaseUrl || !supabaseKey || !vapidPublic || !vapidPrivate) {
  console.error("Missing required environment variables for push-order-update function.");
}

webpush.setVapidDetails("mailto:admin@example.com", vapidPublic || "", vapidPrivate || "");
const supabase = createClient(supabaseUrl || "", supabaseKey || "");

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  let payload: { userId?: string; title?: string; body?: string; url?: string };
  try {
    payload = await req.json();
  } catch (_e) {
    return new Response("Invalid JSON", { status: 400 });
  }

  const userId = payload.userId;
  if (!userId) return new Response("userId is required", { status: 400 });

  const { data: subs, error: subErr } = await supabase
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("auth_user_id", userId);

  if (subErr) return new Response(subErr.message, { status: 500 });
  if (!subs || subs.length === 0) return new Response(JSON.stringify({ sent: 0, results: [] }), { headers: { "Content-Type": "application/json" } });

  const notificationPayload = JSON.stringify({
    title: payload.title || "Order update",
    body: payload.body || "Your order status changed.",
    url: payload.url || "/orders"
  });

  const results: Array<{ endpoint: string; ok: boolean; error?: string }> = [];
  for (const sub of subs) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      } as any, notificationPayload);
      results.push({ endpoint: sub.endpoint, ok: true });
    } catch (err: any) {
      results.push({ endpoint: sub.endpoint, ok: false, error: err?.message || "send failed" });
    }
  }

  return new Response(JSON.stringify({ sent: results.length, results }), {
    headers: { "Content-Type": "application/json" }
  });
});
