"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface SimilarItem {
  id: string;
  title?: string;
  name?: string;
  city: string;
  price_label: string;
  images: string[];
  type: "home" | "hostel";
  status?: string;
}

interface Props {
  currentId: string;
  city: string;
  propertyType: "home" | "hostel";
}

export default function SimilarProperties({ currentId, city, propertyType }: Props) {
  const [items, setItems] = useState<SimilarItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!city) return;

    async function load() {
      if (propertyType === "home") {
        const { data } = await supabase
          .from("homes")
          .select("id, title, city, price_label, images, status")
          .ilike("city", `%${city}%`)
          .not("status", "in", '("pending_admin","rejected")')
          .neq("id", currentId)
          .order("is_sponsored", { ascending: false })
          .limit(4);
        if (data) setItems(data.map(d => ({ ...d, type: "home" as const })));
      } else {
        const { data } = await supabase
          .from("hostels")
          .select("id, name, city, price_range_label, images, status")
          .ilike("city", `%${city}%`)
          .not("status", "in", '("pending_admin","rejected")')
          .neq("id", currentId)
          .limit(4);
        if (data) setItems(data.map(d => ({ ...d, price_label: d.price_range_label, type: "hostel" as const })));
      }
    }

    load();
  }, [currentId, city, propertyType]);

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
      <h2 className="text-base font-bold mb-4" style={{ color: "var(--uber-text)" }}>
        Similar properties in {city}
      </h2>
      <div className="space-y-3">
        {items.map((item) => {
          const href = item.type === "home" ? `/homes/${item.id}` : `/hostels/${item.id}`;
          const label = item.title || item.name || "Property";
          const img = item.images?.[0];
          const isUnavailable = item.status === "rented" || item.status === "sold" || item.status === "full";

          return (
            <button
              key={item.id}
              onClick={() => router.push(href)}
              className="w-full flex items-center gap-3 rounded-xl p-2.5 text-left transition-all hover:opacity-80 active:scale-[0.98]"
              style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }}
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 relative" style={{ background: "var(--uber-surface2)" }}>
                {img ? (
                  <img
                    src={img}
                    alt={label}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">🏠</div>
                )}
                {isUnavailable && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg" style={{ background: "rgba(0,0,0,0.45)" }}>
                    <span className="text-[9px] font-extrabold uppercase text-white px-1.5 py-0.5 rounded" style={{ background: item.status === "rented" ? "rgba(245,158,11,0.9)" : "rgba(124,58,237,0.9)" }}>
                      {item.status === "rented" ? "Rented" : item.status === "sold" ? "Sold" : "Full"}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-snug line-clamp-1" style={{ color: "var(--uber-text)" }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>{item.city}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--uber-green)" }}>{item.price_label}</p>
              </div>

              {/* Arrow */}
              <svg className="w-4 h-4 shrink-0" style={{ color: "var(--uber-muted)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
