"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const STORAGE_KEY = "staymate_recently_viewed";
const MAX_ITEMS = 10;

export interface RecentlyViewedItem {
  id: string;
  title: string;
  image: string;
  city: string;
  priceLabel: string;
  type: "home" | "hostel";
}

export function trackView(item: RecentlyViewedItem) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing: RecentlyViewedItem[] = raw ? JSON.parse(raw) : [];
    // Deduplicate by id, then prepend
    const deduped = existing.filter((i) => i.id !== item.id);
    const updated = [item, ...deduped].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable — fail silently
  }
}

export default function RecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // fail silently
    }
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3 px-4 lg:px-0">
        <svg
          className="w-4 h-4 shrink-0"
          style={{ color: "var(--uber-muted)" }}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
          />
        </svg>
        <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>
          Recently viewed
        </p>
      </div>

      {/* Horizontal scroll strip */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 px-4 lg:px-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.type === "home" ? `/homes/${item.id}` : `/hostels/${item.id}`}
            className="shrink-0 flex flex-col rounded-2xl overflow-hidden transition-all hover:opacity-90 active:scale-95"
            style={{
              width: "140px",
              background: "var(--uber-white)",
              border: "0.5px solid var(--uber-border)",
            }}
          >
            {/* Thumbnail */}
            <div className="relative w-full" style={{ height: "80px" }}>
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{ background: "var(--uber-surface2)" }}
                />
              )}
            </div>

            {/* Info */}
            <div className="px-2.5 py-2 flex-1 min-w-0">
              <p
                className="text-xs font-bold truncate leading-tight"
                style={{ color: "var(--uber-text)" }}
              >
                {item.title}
              </p>
              <p
                className="text-[11px] mt-0.5 truncate"
                style={{ color: "var(--uber-muted)" }}
              >
                {item.city} · {item.priceLabel}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
