"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Listens for Capacitor deep-link opens (com.staymate.app://auth/callback?code=...)
 * and exchanges the PKCE code for a Supabase session.
 *
 * Only active on native platforms — no-ops on web.
 */
export default function CapacitorOAuthHandler() {
  const router = useRouter();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function setup() {
      // Only run inside Capacitor native app
      const isNative =
        typeof (window as any).Capacitor !== "undefined" &&
        (window as any).Capacitor.isNativePlatform?.();

      if (!isNative) return;

      const { App } = await import("@capacitor/app");

      const { remove } = await App.addListener("appUrlOpen", async ({ url }) => {
        // Match: com.staymate.app://auth/callback?code=...
        try {
          const parsed = new URL(url);
          const code = parsed.searchParams.get("code");
          if (!code) return;

          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            router.replace("/homes");
          }
        } catch {
          // Malformed URL or unrelated deep link — ignore
        }
      });

      cleanup = remove;
    }

    setup();
    return () => { cleanup?.(); };
  }, [router]);

  return null;
}
