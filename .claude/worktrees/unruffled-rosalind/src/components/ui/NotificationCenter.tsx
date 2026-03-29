"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  clearNotifications,
  type AppNotification,
} from "@/lib/notification-store";
import { IconClipboard, IconCreditCard, IconChat, IconBell, IconClose } from "@/components/ui/Icons";

const TYPE_ICONS: Record<AppNotification["type"], React.ReactNode> = {
  booking: <IconClipboard />,
  payment: <IconCreditCard />,
  message: <IconChat />,
  system: <IconBell />,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setUnread(getUnreadCount());
    function handle() { setUnread(getUnreadCount()); }
    window.addEventListener("staymate:notifications-changed", handle);
    return () => window.removeEventListener("staymate:notifications-changed", handle);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
        style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }}
        aria-label="Notifications"
      >
        <svg className="w-4.5 h-4.5" style={{ color: "var(--uber-text)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#06C167", color: "#fff" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </>
  );
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setNotifications(getNotifications());
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  function handleTap(n: AppNotification) {
    markRead(n.id);
    setNotifications(getNotifications());
    if (n.link) { router.push(n.link); onClose(); }
  }

  function handleMarkAllRead() {
    markAllRead();
    setNotifications(getNotifications());
  }

  function handleClear() {
    clearNotifications();
    setNotifications([]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" style={{ background: "rgba(0,0,0,0.3)" }}>
      <div
        ref={panelRef}
        className="w-full max-w-sm mt-2 mr-2 rounded-2xl overflow-hidden max-h-[80vh] flex flex-col"
        style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "0.5px solid var(--uber-border)" }}>
          <h2 className="text-base font-bold" style={{ color: "var(--uber-text)" }}>Notifications</h2>
          <div className="flex gap-2">
            {notifications.some(n => !n.read) && (
              <button onClick={handleMarkAllRead} className="text-[11px] font-semibold" style={{ color: "var(--uber-green)" }}>
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={handleClear} className="text-[11px] font-semibold" style={{ color: "var(--uber-muted)" }}>
                Clear
              </button>
            )}
            <button onClick={onClose} className="text-sm font-bold" style={{ color: "var(--uber-muted)" }}><IconClose /></button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: "var(--uber-muted)" }}>
              <span className="text-3xl mb-2"><IconBell className="w-8 h-8" /></span>
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleTap(n)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                style={{
                  borderBottom: "0.5px solid var(--uber-border)",
                  background: n.read ? "transparent" : "color-mix(in srgb, var(--uber-green) 5%, var(--uber-white))",
                }}
              >
                <span className="text-lg mt-0.5">{TYPE_ICONS[n.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight" style={{ color: "var(--uber-text)" }}>{n.title}</p>
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--uber-muted)" }}>{n.body}</p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--uber-muted)" }}>{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: "#06C167" }} />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
