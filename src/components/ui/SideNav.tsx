"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSavedCount } from "@/lib/useSavedCount";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ui/ThemeToggle";

/* Use CSS variable var(--uber-green) instead of hardcoded hex */

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

const tabs = [
  { href: "/homes",   label: "Homes",   icon: HomeIcon },
  { href: "/hostels", label: "Hostels", icon: HostelIcon },
  { href: "/post",    label: "Partner", icon: PostIcon },
  { href: "/chat",    label: "Chat",    icon: ChatIcon },
  { href: "/saved",   label: "Saved",   icon: HeartIcon },
  { href: "/profile", label: "Profile", icon: ProfileIcon },
];

export default function SideNav() {
  const pathname = usePathname();
  const savedCount = useSavedCount();
  const seekerUnread = useSeekerUnread();
  const { profile } = useAuth();

  const isAdmin = profile?.role === "admin";
  const allTabs = isAdmin
    ? [
        { href: "/homes",   label: "Homes",   icon: HomeIcon },
        { href: "/hostels", label: "Hostels", icon: HostelIcon },
        { href: "/chat",    label: "Chat",    icon: ChatIcon },
        { href: "/admin",   label: "Admin",   icon: AdminIcon },
        { href: "/profile", label: "Profile", icon: ProfileIcon },
      ]
    : tabs;

  return (
    <nav className="flex flex-col h-full px-4 py-8" style={{ background: "var(--uber-white)", borderRight: "0.5px solid var(--uber-border)" }}>
      {/* Logo */}
      <div className="mb-10 px-2">
        <span className="text-xl font-extrabold tracking-tight" style={{ color: "var(--uber-text)" }}>StayMate</span>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--uber-muted)" }}>Property Listings & Sales</p>
      </div>

      {/* Nav links */}
      <div className="flex flex-col gap-1 flex-1">
        {allTabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          const isSaved = href === "/saved";
          const isChat  = href === "/chat";
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: active ? "var(--uber-black)" : "transparent",
                color: active ? "var(--uber-white)" : "var(--uber-muted)",
              }}
            >
              <div className="relative">
                <Icon active={active} />
                {isSaved && savedCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1.5 min-w-[16px] h-4 text-[9px] font-bold rounded-full flex items-center justify-center px-0.5"
                    style={{ background: "var(--uber-green)", color: "var(--uber-white)" }}
                  >
                    {savedCount > 99 ? "99+" : savedCount}
                  </span>
                )}
                {isChat && seekerUnread > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 text-[9px] font-bold rounded-full flex items-center justify-center px-0.5" style={{ background: "var(--error-text)", color: "#fff" }}>
                    {seekerUnread > 99 ? "99+" : seekerUnread}
                  </span>
                )}
              </div>
              {label}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-auto px-2 pt-6 flex items-center justify-between" style={{ borderTop: "0.5px solid var(--uber-border)" }}>
        <p className="text-[10px] leading-relaxed" style={{ color: "var(--uber-muted)" }}>
          © StayMate {new Date().getFullYear()}
        </p>
        <ThemeToggle />
      </div>
    </nav>
  );
}

function PostIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.5 1.5 0 012.092 0L22.25 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function HostelIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  );
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function AdminIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}
