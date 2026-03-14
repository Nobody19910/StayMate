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

async function subscribeUser(reg: ServiceWorkerRegistration) {
  // Check if already subscribed
  const existing = await reg.pushManager.getSubscription();
  const sub = existing ?? await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Save subscription to server
  await fetch("/api/push-subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: user.id, subscription: sub.toJSON() }),
  });
}

export default function PwaInit() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(async (reg) => {
        if (!("Notification" in window)) return;

        if (Notification.permission === "granted") {
          subscribeUser(reg);
        } else if (Notification.permission === "default") {
          // Delay the prompt so it's not the very first thing the user sees
          setTimeout(async () => {
            const perm = await Notification.requestPermission();
            if (perm === "granted") subscribeUser(reg);
          }, 4000);
        }
      })
      .catch((err) => console.warn("[SW] registration failed", err));
  }, []);

  return null;
}
