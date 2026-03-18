"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/** Save an FCM token to push_subscriptions with fcm:// prefix */
async function saveFcmToken(token: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: { session } } = await supabase.auth.getSession();
  await fetch("/api/push-subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({
      subscription: {
        endpoint: `fcm://${token}`,
        keys: { p256dh: "", auth: "" },
      },
    }),
  });
}

/** Register native push via @capacitor/push-notifications */
async function registerNativePush() {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    // Request permission
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== "granted") return;

    // Listen for registration success
    PushNotifications.addListener("registration", async (token) => {
      console.log("[Native Push] FCM token:", token.value);
      await saveFcmToken(token.value);
    });

    // Listen for registration errors
    PushNotifications.addListener("registrationError", (err) => {
      console.error("[Native Push] registration error:", err);
    });

    // Listen for incoming notifications while app is foreground
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("[Native Push] received:", notification);
    });

    // Listen for notification tap
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const url = action.notification.data?.url;
      if (url && typeof window !== "undefined") {
        window.location.href = url;
      }
    });

    // Register with FCM/APNs
    await PushNotifications.register();
  } catch (err) {
    console.warn("[Native Push] not available:", err);
  }
}

/** Register web push via PushManager + VAPID */
async function registerWebPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    if (!("Notification" in window)) return;

    async function subscribe(reg: ServiceWorkerRegistration) {
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();
      await fetch("/api/push-subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
    }

    if (Notification.permission === "granted") {
      subscribe(reg);
    } else if (Notification.permission === "default") {
      setTimeout(async () => {
        const perm = await Notification.requestPermission();
        if (perm === "granted") subscribe(reg);
      }, 4000);
    }
  } catch (err) {
    console.warn("[SW] registration failed", err);
  }
}

export default function PwaInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect Capacitor native environment
    const isNative = typeof (window as any).Capacitor !== "undefined" &&
      (window as any).Capacitor.isNativePlatform?.();

    if (isNative) {
      registerNativePush();
    } else {
      registerWebPush();
    }
  }, []);

  return null;
}
