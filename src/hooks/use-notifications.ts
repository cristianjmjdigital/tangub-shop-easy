import { useCallback, useEffect, useState } from "react";

// Lightweight browser notification utilities (foreground only; no push backend required)
const isSupported = typeof window !== "undefined" && "Notification" in window;

type PermissionState = NotificationPermission | "unsupported";

export function useNotifications() {
  const [permission, setPermission] = useState<PermissionState>(() => {
    if (!isSupported) return "unsupported";
    return Notification.permission;
  });

  useEffect(() => {
    if (!isSupported) return;
    setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    if (Notification.permission === "granted") {
      setPermission("granted");
      return true;
    }
    const res = await Notification.requestPermission();
    setPermission(res);
    return res === "granted";
  }, []);

  const notify = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported) return false;
      if (Notification.permission !== "granted") return false;
      try {
        new Notification(title, options);
        return true;
      } catch (err) {
        console.warn("Notification failed", err);
        return false;
      }
    },
    []
  );

  return { isSupported, permission, requestPermission, notify } as const;
}

export function showOrderNotification(title: string, body: string) {
  if (!isSupported) return false;
  if (Notification.permission !== "granted") return false;
  try {
    new Notification(title, { body });
    return true;
  } catch (err) {
    console.warn("Notification failed", err);
    return false;
  }
}

export function getNotificationPermission(): PermissionState {
  if (!isSupported) return "unsupported";
  return Notification.permission;
}
