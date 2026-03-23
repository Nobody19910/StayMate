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
  if (!user) {
    console.warn("[Native Push] no user, skipping token save");
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  console.log("[Native Push] saving FCM token for user:", user.id);

  const res = await fetch("/api/push-subscribe", {
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

  const body = await res.json().catch(() => null);
  console.log("[Native Push] push-subscribe response:", res.status, body);
  if (res.ok) {
    fcmTokenSaved = true;
  }
}

/** Register native push via @capacitor/push-notifications */
let pendingFcmToken: string | null = null;
let fcmTokenSaved = false;

async function registerNativePush() {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    // Remove any previous listeners to avoid duplicates
    await PushNotifications.removeAllListeners();

    // Request permission
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== "granted") return;

    // Listen for registration success
    PushNotifications.addListener("registration", async (token) => {
      if (fcmTokenSaved) return;
      console.log("[Native Push] FCM token:", token.value);
      pendingFcmToken = token.value;
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

/** Process an OAuth deep link URL */
async function processAuthUrl(url: string) {
  console.log("[DeepLink] processing:", url);

  if (!url.includes("auth/callback")) return;

  // Supabase may return tokens in hash (#) or query (?) params
  const hashPart = url.split("#")[1];
  const queryPart = url.split("?")[1]?.split("#")[0];

  const params = new URLSearchParams(hashPart || queryPart || "");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  console.log("[DeepLink] accessToken:", !!accessToken, "refreshToken:", !!refreshToken);

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    console.log("[DeepLink] setSession error:", error);
    window.location.href = "/homes";
  } else {
    // PKCE flow returns a code instead of tokens
    const code = params.get("code");
    if (code) {
      console.log("[DeepLink] exchanging code for session");
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      console.log("[DeepLink] exchangeCode error:", error);
      window.location.href = "/homes";
    } else {
      console.warn("[DeepLink] no tokens or code found in URL");
    }
  }
}

/** Handle deep link OAuth callback in Capacitor */
async function handleDeepLinkAuth() {
  try {
    const { App } = await import("@capacitor/app");

    // Check if the app was launched via a deep link (cold start)
    const launchUrl = await App.getLaunchUrl();
    if (launchUrl?.url) {
      await processAuthUrl(launchUrl.url);
    }

    // Listen for deep links while app is running (warm resume)
    App.addListener("appUrlOpen", async ({ url }) => {
      await processAuthUrl(url);
    });
  } catch (err) {
    console.warn("[DeepLink] not available:", err);
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
      handleDeepLinkAuth();

      // When user signs in, retry saving the FCM token
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN" && pendingFcmToken && !fcmTokenSaved) {
          console.log("[Native Push] auth state changed, retrying token save");
          saveFcmToken(pendingFcmToken);
        }
      });

      return () => { subscription.unsubscribe(); };
    } else {
      registerWebPush();
    }
  }, []);

  return null;
}
