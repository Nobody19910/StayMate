"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: "booking" | "message" | "system";
  read: boolean;
  action_url: string | null;
  created_at: string;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BellIcon({ count }: { count: number }) {
  return (
    <div className="relative">
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        viewBox="0 0 24 24"
        style={{ color: "var(--uber-text)" }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1.5 min-w-[16px] h-4 text-[9px] font-bold rounded-full flex items-center justify-center px-0.5"
          style={{ background: "var(--uber-green)", color: "#fff" }}
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </div>
  );
}

function TypeIcon({ type }: { type: Notification["type"] }) {
  if (type === "booking") {
    return (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "var(--uber-green)" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
      </svg>
    );
  }
  if (type === "message") {
    return (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "#2563eb" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "var(--uber-muted)" }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function groupNotifications(notifications: Notification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: Notification[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier", items: [] },
  ];

  for (const n of notifications) {
    const d = new Date(n.created_at);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) {
      groups[0].items.push(n);
    } else if (d.getTime() === yesterday.getTime()) {
      groups[1].items.push(n);
    } else {
      groups[2].items.push(n);
    }
  }

  return groups.filter(g => g.items.length > 0);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NotificationCenter() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (fetchError) {
        // Table may not exist yet — silently catch
        setError(true);
        setNotifications([]);
      } else {
        setError(false);
        setNotifications((data as Notification[]) ?? []);
      }
    } catch {
      setError(true);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load when panel opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Poll unread count every 30s
  useEffect(() => {
    if (!user) return;
    async function pollUnread() {
      try {
        const { data } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", user!.id)
          .eq("read", false)
          .limit(10);
        if (data) {
          setNotifications(prev => {
            // Only update if count changed to avoid full re-render
            const prevUnread = prev.filter(n => !n.read).length;
            if ((data.length > 0 || prevUnread > 0) && data.length !== prevUnread && !open) {
              fetchNotifications();
            }
            return prev;
          });
        }
      } catch {}
    }
    const iv = setInterval(pollUnread, 30000);
    return () => clearInterval(iv);
  }, [user, open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function markRead(id: string, actionUrl: string | null) {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    } catch {}
    if (actionUrl) {
      setOpen(false);
      router.push(actionUrl);
    }
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (!unreadIds.length) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", unreadIds);
    } catch {}
  }

  const groups = groupNotifications(notifications);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="p-2 rounded-lg transition-colors"
        style={{ color: "var(--uber-text)" }}
        aria-label="Notifications"
      >
        <BellIcon count={unreadCount} />
      </button>

      {/* Panel */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 sm:hidden"
            style={{ background: "rgba(0,0,0,0.3)" }}
            onClick={() => setOpen(false)}
          />

          {/* Slide-in panel */}
          <div
            className="fixed sm:absolute right-0 top-0 sm:top-full sm:mt-2 z-50 flex flex-col"
            style={{
              width: "min(360px, 100vw)",
              height: "100dvh",
              maxHeight: "calc(100dvh)",
              // On sm+ shrink to dropdown
              ["@media (min-width: 640px)" as any]: {
                height: "auto",
                maxHeight: "480px",
              },
              background: "var(--uber-surface)",
              border: "0.5px solid var(--uber-border)",
              borderRadius: "0 0 0 16px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "0.5px solid var(--uber-border)", background: "var(--uber-surface)" }}
            >
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm" style={{ color: "var(--uber-text)" }}>Notifications</span>
                {unreadCount > 0 && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "var(--uber-green)", color: "#fff" }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs font-semibold transition-opacity hover:opacity-70"
                    style={{ color: "var(--uber-green)" }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "var(--uber-border)", color: "var(--uber-text)" }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div
                    className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "var(--uber-green)", borderTopColor: "transparent" }}
                  />
                </div>
              )}

              {!loading && (error || notifications.length === 0) && (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <svg className="w-10 h-10 mb-3 opacity-20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: "var(--uber-text)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  <p className="text-sm font-semibold" style={{ color: "var(--uber-muted)" }}>No notifications yet</p>
                </div>
              )}

              {!loading && !error && groups.map(group => (
                <div key={group.label}>
                  <div
                    className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest sticky top-0"
                    style={{ color: "var(--uber-muted)", background: "var(--uber-surface)", borderBottom: "0.5px solid var(--uber-border)" }}
                  >
                    {group.label}
                  </div>
                  {group.items.map(n => (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id, n.action_url)}
                      className="w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors hover:opacity-90"
                      style={{
                        background: n.read ? "transparent" : "color-mix(in srgb, var(--uber-green) 6%, transparent)",
                        borderBottom: "0.5px solid var(--uber-border)",
                      }}
                    >
                      <div className="mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--uber-border)" }}>
                        <TypeIcon type={n.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold leading-snug" style={{ color: "var(--uber-text)" }}>{n.title}</p>
                        {n.body && (
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--uber-muted)" }}>{n.body}</p>
                        )}
                        <p className="text-[10px] mt-1" style={{ color: "var(--uber-muted)" }}>{formatTime(n.created_at)}</p>
                      </div>
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: "var(--uber-green)" }} />
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
