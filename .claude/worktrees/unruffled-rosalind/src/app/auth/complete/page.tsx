"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      router.replace("/login?error=oauth_failed");
      return;
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          router.replace("/login?error=oauth_failed");
        } else {
          router.replace("/homes");
        }
      });
  }, [router, searchParams]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--uber-surface)" }}
    >
      <div className="text-center">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
          style={{ borderColor: "var(--uber-green)", borderTopColor: "transparent" }}
        />
        <p className="text-sm font-medium" style={{ color: "var(--uber-muted)" }}>
          Signing you in…
        </p>
      </div>
    </div>
  );
}
