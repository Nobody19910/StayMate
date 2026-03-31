"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSavedCount } from "@/lib/useSavedCount";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ui/ThemeToggle";

function useSeekerUnread() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!user) return;
    let convId: string | null = null;
    async function refresh() {
      if (!convId) {
        const { data: conv } = await supabase.from("conversations").select("id").eq("seeker_id", user!.id).maybeSingle();
        if (!conv) return;
        convId = conv.id;
      }
      const { count: c } = await supabase.from("messages").select("id", { count: "exact", head: true })
        .eq("conversation_id", convId).eq("is_read", false).neq("sender_id", user!.id);
      setCount(c ?? 0);
    }
    refresh();
    const ch = setInterval(refresh, 5000);
    return () => clearInterval(ch);
  }, [user]);
  return count;
}

function useAdminUnread() {
  const { user, profile } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!user || profile?.role !== "admin") return;
    async function refresh() {
      const { data: convs } = await supabase.from("conversations").select("id, seeker_id");
      if (!convs?.length) { setCount(0); return; }
      const convIds = convs.map((c: any) => c.id);
      const seekerIds = convs.map((c: any) => c.seeker_id);
      const { count: c } = await supabase.from("messages").select("id", { count: "exact", head: true })
        .in("conversation_id", convIds).in("sender_id", seekerIds).eq("is_read", false);
      setCount(c ?? 0);
    }
    refresh();
    const iv = setInterval(refresh, 5000);
    return () => clearInterval(iv);
  }, [user, profile]);
  return count;
}

const seekerTabs = [
  { href: "/homes",   label: "Homes" },
  { href: "/hostels", label: "Hostels" },
  { href: "/post",    label: "List Your Property" },
  { href: "/chat",    label: "Messages" },
  { href: "/saved",   label: "Saved" },
];

const adminTabs = [
  { href: "/chat",    label: "Messages" },
  { href: "/admin",   label: "Admin Panel" },
];

export default function TopNav() {
  const pathname = usePathname();
  const savedCount = useSavedCount();
  const seekerUnread = useSeekerUnread();
  const adminUnread = useAdminUnread();
  const { profile, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = profile?.role === "admin";
  const tabs = isAdmin ? adminTabs : seekerTabs;

  return (
    <>
      {/* ─── Top bar ───────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 w-full"
        style={{ background: "var(--uber-white)", borderBottom: "0.5px solid var(--uber-border)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="max-w-screen-xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 lg:h-16">

            {/* Logo */}
            <Link href="/homes" className="flex items-center gap-2 shrink-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
                style={{ background: "var(--uber-green)", color: "#fff" }}
              >
                S
              </div>
              <div className="hidden sm:block">
                <span className="text-base font-extrabold tracking-tight" style={{ color: "var(--uber-text)" }}>StayMate</span>
                <span className="block text-[9px] font-medium uppercase tracking-widest -mt-0.5" style={{ color: "var(--uber-muted)" }}>Ghana's #1 Property Platform</span>
              </div>
            </Link>

            {/* ── Desktop nav links (center) ── */}
            <nav className="hidden lg:flex items-center gap-1">
              {tabs.map(({ href, label }) => {
                const active = pathname.startsWith(href);
                const isSaved = href === "/saved";
                const isChat = href === "/chat";
                const isPost = href === "/post";
                const chatBadge = isAdmin ? adminUnread : seekerUnread;

                return (
                  <Link
                    key={href}
                    href={href}
                    className="relative px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      color: active ? "var(--uber-green)" : "var(--uber-text)",
                      background: active ? "color-mix(in srgb, var(--uber-green) 10%, transparent)" : "transparent",
                    }}
                  >
                    {isPost ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        {label}
                      </span>
                    ) : label}
                    {active && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                        style={{ background: "var(--uber-green)" }}
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    {isSaved && savedCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 text-[9px] font-bold rounded-full flex items-center justify-center px-0.5"
                        style={{ background: "var(--uber-green)", color: "#fff" }}>
                        {savedCount > 9 ? "9+" : savedCount}
                      </span>
                    )}
                    {isChat && chatBadge > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 text-[9px] font-bold rounded-full flex items-center justify-center px-0.5"
                        style={{ background: "var(--error-text)", color: "#fff" }}>
                        {chatBadge > 9 ? "9+" : chatBadge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* ── Right actions ── */}
            <div className="flex items-center gap-2">
              <ThemeToggle />

              {/* Profile / Auth */}
              {user ? (
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
                  style={{ border: "0.5px solid var(--uber-border)", color: "var(--uber-text)", background: "var(--uber-surface)" }}
                >
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{ background: "var(--uber-green)", color: "#fff" }}>
                      {(profile?.fullName || user.email || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:block max-w-[80px] truncate">
                    {profile?.fullName?.split(" ")[0] || "Profile"}
                  </span>
                </Link>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Link href="/login"
                    className="hidden sm:block px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                    style={{ color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}>
                    Sign in
                  </Link>
                  <Link href="/signup"
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                    style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>
                    Register
                  </Link>
                </div>
              )}

              {/* Mobile hamburger */}
              <button
                className="lg:hidden p-2 rounded-lg"
                style={{ color: "var(--uber-text)" }}
                onClick={() => setMobileMenuOpen(v => !v)}
              >
                {mobileMenuOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* ── Mobile dropdown menu ── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              key="mobile-menu"
              className="lg:hidden border-t overflow-hidden"
              style={{ background: "var(--uber-white)", borderColor: "var(--uber-border)" }}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="px-4 py-3 flex flex-col gap-1">
                {tabs.map(({ href, label }, i) => {
                  const active = pathname.startsWith(href);
                  return (
                    <motion.div
                      key={href}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.18, ease: "easeOut" }}
                    >
                      <Link
                        href={href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-3 py-2.5 rounded-lg text-sm font-semibold"
                        style={{
                          background: active ? "color-mix(in srgb, var(--uber-green) 10%, transparent)" : "transparent",
                          color: active ? "var(--uber-green)" : "var(--uber-text)",
                        }}
                      >
                        {label}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
