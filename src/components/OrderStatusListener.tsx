import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/use-notifications";

interface Props {
  enabled?: boolean;
}

// Listens for order status updates for the current user and surfaces a toast + browser notification.
export default function OrderStatusListener({ enabled = true }: Props) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { notify } = useNotifications();
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const userId = profile?.id;
    if (!userId || !enabled) return;

    const channel = supabase
      .channel(`orders-status-user-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
        (payload) => {
          const nextStatus = (payload.new as any)?.status;
          const prevStatus = (payload.old as any)?.status;
          const orderId = (payload.new as any)?.id || (payload.old as any)?.id;
          if (!nextStatus || nextStatus === prevStatus || !orderId) return;
          const key = `${orderId}:${nextStatus}:${(payload.new as any)?.updated_at || ""}`;
          if (lastKeyRef.current === key) return;
          lastKeyRef.current = key;
          const title = `Order #${orderId}`;
          const description = `Status updated to ${nextStatus}`;
          toast({ title, description });
          notify(title, { body: description });
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("OrderStatusListener: channel error; check Realtime table config and policies");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, enabled, toast, notify]);

  return null;
}
