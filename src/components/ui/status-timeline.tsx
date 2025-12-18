import React from "react";

const DELIVERY_STEPS = [
  { key: "pending", label: "Pending" },
  { key: "preparing", label: "Preparing" },
  { key: "for_delivery", label: "For Delivery" },
  { key: "delivered", label: "Delivered" },
] as const;

const PICKUP_STEPS = [
  { key: "pending", label: "Pending" },
  { key: "preparing", label: "Preparing" },
  { key: "for_delivery", label: "Ready for Pickup" },
  { key: "delivered", label: "Picked up" },
] as const;

export type OrderStatusKey = typeof DELIVERY_STEPS[number]["key"] | "cancelled" | string;
type TimelineMode = "delivery" | "pickup";

export function StatusTimeline({ status, steps, mode = "delivery" }: { status: OrderStatusKey; steps?: ReadonlyArray<{ key: string; label: string }>; mode?: TimelineMode; }) {
  const resolvedSteps = steps || (mode === "pickup" ? PICKUP_STEPS : DELIVERY_STEPS);
  const idx = Math.max(0, resolvedSteps.findIndex(s => s.key.toLowerCase() === String(status || '').toLowerCase()));
  const cancelled = String(status || '').toLowerCase() === 'cancelled';
  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between">
        {resolvedSteps.map((s, i) => {
          const active = i <= idx && !cancelled;
          return (
            <div key={s.key} className="flex-1 flex items-center">
              <div className={`h-2 w-full ${i === 0 ? 'rounded-l-full':''} ${i === resolvedSteps.length-1 ? 'rounded-r-full':''} ${active ? 'bg-primary' : 'bg-muted'}`}></div>
              <div className={`h-3 w-3 -ml-3 rounded-full border ${active ? 'bg-primary border-primary' : 'bg-background border-muted-foreground/30'}`}></div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-4 text-[10px] text-muted-foreground">
        {resolvedSteps.map((s) => (
          <div key={s.key} className="text-center">{s.label}</div>
        ))}
      </div>
      {cancelled && (
        <div className="mt-2 text-[11px] text-destructive">Cancelled</div>
      )}
    </div>
  );
}
