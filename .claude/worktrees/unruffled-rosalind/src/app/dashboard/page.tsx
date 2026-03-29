"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Dashboard has been merged into the Profile page.
 * This page redirects to /profile for backward compatibility.
 */
export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/profile");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
      <div className="animate-pulse text-sm font-semibold" style={{ color: "var(--uber-muted)" }}>
        Redirecting to Profile…
      </div>
    </div>
  );
}
