import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

const isSupported = typeof window !== "undefined"
  && "serviceWorker" in navigator
  && "PushManager" in window
  && "Notification" in window;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type EnsureResult = { ok: true } | { ok: false; reason: string };

export function usePushSubscription(authUserId?: string | null) {
  const [status, setStatus] = useState<"idle" | "pending" | "subscribed" | "error">("idle");
  const [lastError, setLastError] = useState<string | null>(null);

  const canUse = useMemo(() => isSupported && !!VAPID_PUBLIC_KEY, []);

  const ensureSubscription = useCallback(async (opts: { prompt?: boolean } = {}): Promise<EnsureResult> => {
    if (!canUse) return { ok: false, reason: "unsupported" };
    if (!authUserId) return { ok: false, reason: "unauthenticated" };
    const currentPermission = Notification.permission;
    if (currentPermission === "denied") return { ok: false, reason: "permission-denied" };
    if (currentPermission !== "granted") {
      if (!opts.prompt) return { ok: false, reason: "permission-not-granted" };
      const res = await Notification.requestPermission();
      if (res !== "granted") return { ok: false, reason: "permission-not-granted" };
    }
    setStatus("pending");
    setLastError(null);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appServerKey });
      }
      const data = subscription.toJSON();
      const p256dh = data.keys?.p256dh;
      const auth = data.keys?.auth;
      if (!p256dh || !auth) {
        throw new Error("Push subscription keys missing");
      }
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({
          auth_user_id: authUserId,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          ua
        }, { onConflict: "endpoint" });
      if (error) throw error;
      setStatus("subscribed");
      return { ok: true };
    } catch (e: any) {
      setStatus("error");
      setLastError(e?.message || "Failed to subscribe");
      return { ok: false, reason: e?.message || "error" };
    }
  }, [authUserId, canUse]);

  const syncIfGranted = useCallback(async () => {
    if (!canUse || !authUserId) return { ok: false, reason: "skip" } as EnsureResult;
    if (Notification.permission === "granted") {
      return ensureSubscription({ prompt: false });
    }
    return { ok: false, reason: "permission-not-granted" } as EnsureResult;
  }, [authUserId, canUse, ensureSubscription]);

  return { isSupported: canUse, status, lastError, ensureSubscription, syncIfGranted } as const;
}
