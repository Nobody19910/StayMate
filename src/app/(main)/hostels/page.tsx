"use client";

import { useState, useEffect, useMemo, useRef, memo, useCallback } from "react";
import Link from "next/link";
import FilterModal, { DEFAULT_FILTERS, type FilterState } from "@/components/ui/FilterModal";
import { useUserLocation } from "@/lib/useUserLocation";
import { getHostels } from "@/lib/api";
import { addSaved, removeSaved, isSaved } from "@/lib/saved-store";
import type { Hostel } from "@/lib/types";
import FeaturedCarousel from "@/components/ui/FeaturedCarousel";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import PullToRefreshIndicator from "@/components/ui/PullToRefreshIndicator";
import { useVisibilityRefresh } from "@/lib/use-visibility-refresh";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { preloadImages } from "@/lib/image-cache";
import { cachedFetch, invalidateCache } from "@/lib/local-cache";
import { AnimatedList } from "@/components/ui/AnimatedList";

import { getDistance, DEFAULT_LAT, DEFAULT_LNG } from "@/lib/geo";

function getCacheKey(filters: FilterState, q: string) {
  return "hostels_" + JSON.stringify({ q, ...filters });
}

/* ─── Hero Search ─────────────────────────────────────────────────────────── */
function HeroSearch({
  searchQuery, setSearchQuery, radius, setRadius, onFilterClick, activeFilterCount,
}: {
  searchQuery: string; setSearchQuery: (v: string) => void;
  radius: number; setRadius: (v: number) => void;
  onFilterClick: () => void; activeFilterCount: number;
}) {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #0a1f12 100%)",
        minHeight: "200px",
      }}
    >
      <div className="absolute inset-0 opacity-10"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, #06c167, transparent)" }} />

      <div className="relative max-w-screen-xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        <h1 className="text-2xl lg:text-4xl font-extrabold mb-1 font-serif" style={{ color: "#06c167" }}>
          Student & Staff Accommodation
        </h1>
        <p className="text-sm lg:text-base mb-6 font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
          Hostels near campuses · All universities covered
        </p>

        {/* Search bar */}
        <div className="flex flex-row gap-2 max-w-3xl">
          <div className="relative" style={{ flex: "0 0 75%", maxWidth: "75%" }}>
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#06c167" }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
            <input
              type="text"
              placeholder="Search campus, city, university…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl pl-9 pr-3 py-3 text-sm font-medium focus:outline-none"
              style={{ background: "rgba(255,255,255,0.07)", color: "#fff", border: "0.5px solid rgba(6,193,103,0.35)" }}
            />
          </div>
          <button className="py-3 rounded-xl text-sm font-bold flex items-center gap-2 justify-center flex-1"
            style={{ background: "#06c167", color: "#fff" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              <circle cx="10" cy="10" r="7" />
            </svg>
            Search
          </button>
        </div>

        {/* Pills */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: "rgba(6,193,103,0.12)", color: "#06c167", border: "0.5px solid rgba(6,193,103,0.3)" }}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" /><path strokeLinecap="round" d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
            {radius >= 50 ? "50+ km" : `${radius} km`}
            <input type="range" min={1} max={50} value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-20 h-1 ml-1" style={{ accentColor: "#06c167" } as React.CSSProperties} />
          </div>
          <button onClick={onFilterClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={activeFilterCount > 0
              ? { background: "#06c167", color: "#fff" }
              : { background: "rgba(6,193,103,0.12)", color: "#06c167", border: "0.5px solid rgba(6,193,103,0.3)" }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
            </svg>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Filter Sidebar ─────────────────────────────────────────────────────── */
function FilterSidebar({ radius, setRadius, filters, setFilters, onOpenModal }: {
  radius: number; setRadius: (v: number) => void;
  filters: FilterState; setFilters: (v: FilterState) => void;
  onOpenModal: () => void;
}) {
  const amenityOptions = ["WiFi", "Study Room", "Generator", "Water", "Security", "AC", "Laundry", "Cafeteria"];

  return (
    <aside className="w-72 shrink-0 self-start sticky top-4 rounded-2xl overflow-hidden hidden lg:block"
      style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-5 py-4" style={{ borderBottom: "0.5px solid var(--uber-border)" }}>
        <h2 className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>Filter results</h2>
      </div>

      <div className="px-5 py-4 space-y-6">

        {/* Budget */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--uber-muted)" }}>Budget per semester (GH₵)</h3>
          <div className="flex gap-2 items-center">
            <input type="number" placeholder="Min" value={filters.priceMin || ""}
              onChange={(e) => setFilters({ ...filters, priceMin: parseInt(e.target.value) || 0 })}
              className="w-full rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none"
              style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)", color: "var(--uber-text)" }} />
            <span className="text-xs" style={{ color: "var(--uber-muted)" }}>–</span>
            <input type="number" placeholder="Max" value={filters.priceMax < 25000 ? filters.priceMax : ""}
              onChange={(e) => setFilters({ ...filters, priceMax: parseInt(e.target.value) || 25000 })}
              className="w-full rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none"
              style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)", color: "var(--uber-text)" }} />
          </div>
        </div>

        {/* Distance */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--uber-muted)" }}>
            Distance from you: <span style={{ color: "var(--uber-text)" }}>{radius >= 50 ? "50+ km" : `${radius} km`}</span>
          </h3>
          <input type="range" min={1} max={50} value={radius} onChange={(e) => setRadius(parseInt(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{ accentColor: "var(--uber-green)" }} />
          <div className="flex justify-between mt-1">
            <span className="text-[10px]" style={{ color: "var(--uber-muted)" }}>1 km</span>
            <span className="text-[10px]" style={{ color: "var(--uber-muted)" }}>50+ km</span>
          </div>
        </div>

        {/* Amenities */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--uber-muted)" }}>Amenities</h3>
          <div className="flex flex-wrap gap-1.5">
            {amenityOptions.map((a) => {
              const on = filters.amenities.includes(a);
              return (
                <button key={a} onClick={() => {
                  const next = on ? filters.amenities.filter((x) => x !== a) : [...filters.amenities, a];
                  setFilters({ ...filters, amenities: next });
                }}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                  style={on
                    ? { background: "var(--uber-green)", color: "#fff" }
                    : { background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)", color: "var(--uber-muted)" }}>
                  {a}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={onOpenModal}
          className="w-full py-2.5 rounded-xl text-sm font-bold"
          style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>
          All filters
        </button>

        {(filters.amenities.length > 0 || filters.priceMin > 0) && (
          <button onClick={() => setFilters({ ...DEFAULT_FILTERS, priceMax: 25000 })}
            className="w-full py-2 text-xs font-semibold" style={{ color: "var(--uber-muted)" }}>
            Reset all filters
          </button>
        )}
      </div>
    </aside>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
function ListSkeleton() {
  return (
    <div className="space-y-10 pt-2 pb-10">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden flex flex-row animate-pulse"
          style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
          <div className="w-28 sm:w-52 shrink-0" style={{ minHeight: "120px", background: "var(--uber-surface2)" }} />
          <div className="flex-1 p-4 space-y-3">
            <div className="h-4 rounded w-2/3" style={{ background: "var(--uber-surface2)" }} />
            <div className="h-3 rounded w-1/3" style={{ background: "var(--uber-surface2)" }} />
            <div className="h-3 rounded w-1/2" style={{ background: "var(--uber-surface2)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Hostel List Card ────────────────────────────────────────────────────── */
const HostelListCard = memo(function HostelListCard({ hostel }: { hostel: Hostel }) {
  // Start false on both server and client (avoids hydration mismatch),
  // then sync from localStorage after mount.
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(isSaved(hostel.id)); }, [hostel.id]);

  function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
    if (saved) { removeSaved(hostel.id); setSaved(false); }
    else { addSaved(hostel.id, "hostel"); setSaved(true); }
  }

  const priceMin = hostel.priceRange?.min;
  const priceMax = hostel.priceRange?.max;
  const priceLabel = priceMin != null
    ? (priceMax != null && priceMax !== priceMin
      ? `GH₵${priceMin.toLocaleString()} – GH₵${priceMax.toLocaleString()}`
      : `GH₵${priceMin.toLocaleString()}`)
    : "Price on request";

  return (
    <Link href={`/hostels/${hostel.id}`}>
      <div className="rounded-2xl overflow-hidden flex flex-row cursor-pointer group card-hover"
        style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", boxShadow: "var(--shadow-sm)" }}>

        {/* Image — compact on mobile, wider on desktop */}
        <div className="relative w-28 sm:w-56 md:w-72 shrink-0" style={{ minHeight: "120px", background: "var(--uber-surface2)" }}>
          <OptimizedImage
            src={hostel.images[0] || ""}
            alt={hostel.name}
            width={400}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <button onClick={toggleSave}
            className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 ${saved ? "bg-red-500 text-white" : "bg-white/90 text-gray-400"}`}>
            <svg className="w-4 h-4" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          {hostel.isSponsored && (
            <span className="absolute top-2.5 left-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded shimmer-gold text-[#1A1A1A]">
              ✦ Sponsored
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 p-2.5 sm:p-5 flex flex-col justify-between min-w-0 overflow-hidden">
          <div>
            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{ background: "color-mix(in srgb, var(--uber-green) 12%, transparent)", color: "var(--uber-green)" }}>
                Student Hostel
              </span>
              {hostel.isVerified && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-0.5"
                  style={{ background: "color-mix(in srgb, var(--uber-green) 10%, transparent)", color: "var(--uber-green)" }}>
                  ✓ Verified
                </span>
              )}
            </div>

            {/* Name */}
            <h3 className="text-base font-bold leading-snug group-hover:underline line-clamp-2 mb-1"
              style={{ color: "var(--uber-text)" }}>
              {hostel.name}
            </h3>

            {/* Location */}
            <div className="flex items-center gap-1 mb-2">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "var(--uber-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="text-xs font-medium" style={{ color: "var(--uber-muted)" }}>
                {hostel.address || hostel.city}
              </span>
            </div>

            {/* Nearby universities */}
            {hostel.nearbyUniversities?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {hostel.nearbyUniversities.slice(0, 3).map((u) => (
                  <span key={u} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "var(--uber-surface)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" }}>
                    🎓 {u}
                  </span>
                ))}
                {hostel.nearbyUniversities.length > 3 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "var(--uber-surface)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" }}>
                    +{hostel.nearbyUniversities.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Amenities preview */}
            {hostel.amenities?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {hostel.amenities.slice(0, 5).map((a) => (
                  <span key={a} className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: "var(--uber-surface2)", color: "var(--uber-muted)" }}>{a}</span>
                ))}
                {hostel.amenities.length > 5 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: "var(--uber-surface2)", color: "var(--uber-muted)" }}>+{hostel.amenities.length - 5}</span>
                )}
              </div>
            )}
          </div>

          {/* Price + CTA */}
          <div className="flex items-end justify-between mt-3 pt-3" style={{ borderTop: "0.5px solid var(--uber-border)" }}>
            <div>
              <p className="text-[10px] font-medium mb-0.5" style={{ color: "var(--uber-muted)" }}>Rooms from</p>
              <p className="text-lg font-extrabold leading-none" style={{ color: "var(--uber-text)" }}>{priceLabel}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--uber-muted)" }}>per semester</p>
              <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "var(--info-text)" }}>
                GH₵200 coordination fee applies
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {hostel.totalRooms != null && (
                <p className="text-[10px] font-medium" style={{ color: "var(--uber-muted)" }}>
                  {hostel.totalRooms} room{hostel.totalRooms !== 1 ? "s" : ""} available
                </p>
              )}
              <span className="px-4 py-2 rounded-xl text-xs font-bold"
                style={{ background: "var(--uber-green)", color: "#fff" }}>
                See rooms →
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
});

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function HostelsPage() {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [radius, setRadius] = useState<number>(50);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS, priceMax: 25000 });
  const [sortBy, setSortBy] = useState<"nearest" | "price_asc" | "price_desc">("nearest");
  const { loc: userLoc } = useUserLocation();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleRefresh = useCallback(async () => {
    const cacheKey = getCacheKey(filters, searchQuery);
    await invalidateCache(cacheKey);
    const data = await getHostels();
    setHostels(data);
    setTotalCount(data.length);
    preloadImages(data.map((h: Hostel) => h.images?.[0]).filter(Boolean));
  }, [filters, searchQuery]);

  const { refreshing, pullDistance, handlers: pullHandlers } = usePullToRefresh({ onRefresh: handleRefresh });
  useVisibilityRefresh(handleRefresh);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    cachedFetch<Hostel[]>(getCacheKey(filters, searchQuery), () => getHostels(), {
      onRevalidated: (fresh) => {
        if (!cancelled) { setHostels(fresh); setTotalCount(fresh.length); preloadImages(fresh.map((h: Hostel) => h.images?.[0]).filter(Boolean)); }
      },
    }).then(({ data }) => {
      if (!cancelled) { setHostels(data); setTotalCount(data.length); setLoading(false); preloadImages(data.map((h: Hostel) => h.images?.[0]).filter(Boolean)); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filteredHostels = useMemo(() => {
    let list = hostels;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(h =>
        h.name.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q) ||
        (h.address ?? "").toLowerCase().includes(q) ||
        h.nearbyUniversities?.some((u) => u.toLowerCase().includes(q))
      );
    }
    if (radius < 50) {
      list = list.filter(h => {
        const d = getDistance(userLoc.lat, userLoc.lng, (h as any).lat ?? DEFAULT_LAT, (h as any).lng ?? DEFAULT_LNG);
        return d <= radius;
      });
    }
    list = list.filter(h => {
      const hMin = h.priceRange?.min || 0;
      const hMax = h.priceRange?.max || 50000;
      if (filters.priceMax < 25000 && filters.priceMax < hMin) return false;
      if (filters.priceMin > hMax) return false;
      return true;
    });
    if (filters.amenities.length > 0) {
      list = list.filter((h) => filters.amenities.every((a) => h.amenities?.includes(a)));
    }
    if (filters.districts.length > 0) {
      list = list.filter(h => {
        const city = h.city.toLowerCase();
        const addr = (h.address ?? "").toLowerCase();
        return filters.districts.some(d => city.includes(d.toLowerCase()) || addr.includes(d.toLowerCase()));
      });
    } else if (filters.regions.length > 0) {
      const { getDistrictsForRegion } = require("@/lib/ghana-locations");
      const allDistricts: string[] = filters.regions.flatMap((r: string) => getDistrictsForRegion(r));
      list = list.filter(h => {
        const city = h.city.toLowerCase();
        const addr = (h.address ?? "").toLowerCase();
        return allDistricts.some(d => city.includes(d.toLowerCase()) || addr.includes(d.toLowerCase()));
      });
    }

    const sponsored = list.filter(h => h.isSponsored && h.sponsorTier !== "featured");
    const regular = list.filter(h => !h.isSponsored || h.sponsorTier === "featured");

    regular.sort((a, b) => {
      if (sortBy === "price_asc") return (a.priceRange?.min ?? 0) - (b.priceRange?.min ?? 0);
      if (sortBy === "price_desc") return (b.priceRange?.min ?? 0) - (a.priceRange?.min ?? 0);
      const dA = getDistance(userLoc.lat, userLoc.lng, (a as any).lat ?? DEFAULT_LAT, (a as any).lng ?? DEFAULT_LNG);
      const dB = getDistance(userLoc.lat, userLoc.lng, (b as any).lat ?? DEFAULT_LAT, (b as any).lng ?? DEFAULT_LNG);
      return dA - dB;
    });

    const nearest = regular.slice(0, 2);
    const rest = regular.slice(2);
    let seed = rest.length;
    const seededRandom = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return [...nearest, ...sponsored, ...rest];
  }, [hostels, searchQuery, radius, filters, userLoc, sortBy]);

  const activeFilterCount =
    filters.amenities.length +
    (filters.priceMin > 0 ? 1 : 0) +
    (filters.priceMax < 25000 ? 1 : 0) +
    filters.regions.length +
    filters.districts.length;

  const featuredItems = hostels
    .filter(h => h.isSponsored && h.sponsorTier === "featured")
    .slice(0, 10)
    .map(h => ({
      id: h.id, title: h.name, image: h.images?.[0] || "",
      city: h.city, priceLabel: h.priceRange ? `GH₵${h.priceRange.min.toLocaleString()}+` : "", type: "hostel" as const,
    }));

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }} {...pullHandlers}>
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} />

      <HeroSearch
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        radius={radius}
        setRadius={setRadius}
        onFilterClick={() => setFilterOpen(true)}
        activeFilterCount={activeFilterCount}
      />

      {!loading && featuredItems.length > 0 && (
        <div style={{ background: "var(--uber-surface)" }}>
          <div className="max-w-screen-xl mx-auto px-4 lg:px-6 py-4">
            <p className="text-sm font-bold mb-3" style={{ color: "var(--uber-text)" }}>✦ Featured hostels</p>
            <FeaturedCarousel items={featuredItems} />
          </div>
        </div>
      )}

      <div className="max-w-screen-xl mx-auto px-4 lg:px-6 py-6">
        <div className="flex gap-6 items-start">

          {/* Sidebar */}
          <FilterSidebar
            radius={radius}
            setRadius={setRadius}
            filters={filters}
            setFilters={setFilters}
            onOpenModal={() => setFilterOpen(true)}
          />

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Results bar */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                {!loading && (
                  <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>
                    {filteredHostels.length.toLocaleString()} hostel{filteredHostels.length !== 1 ? "s" : ""} found
                    {searchQuery && <span style={{ color: "var(--uber-muted)" }}> for &ldquo;{searchQuery}&rdquo;</span>}
                  </p>
                )}
                <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>Prices shown per semester in GH₵</p>
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none"
                style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", color: "var(--uber-text)" }}>
                <option value="nearest">Sort: Nearest first</option>
                <option value="price_asc">Sort: Price (low → high)</option>
                <option value="price_desc">Sort: Price (high → low)</option>
              </select>
            </div>

            {/* Mobile pills */}
            <div className="lg:hidden flex gap-2 overflow-x-auto hide-scrollbar mb-4 pb-1">
              <button onClick={() => setFilterOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0"
                style={activeFilterCount > 0
                  ? { background: "var(--uber-green)", color: "#fff" }
                  : { background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", color: "var(--uber-muted)" }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
                </svg>
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>

            {/* List */}
            {loading ? (
              <ListSkeleton />
            ) : filteredHostels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-2xl"
                style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <svg className="w-14 h-14 mb-4" style={{ color: "var(--uber-surface2)" }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
                <p className="text-base font-bold" style={{ color: "var(--uber-text)" }}>No hostels match your search</p>
                <p className="text-sm mt-1" style={{ color: "var(--uber-muted)" }}>Try adjusting your filters or search area.</p>
                <button onClick={() => setFilters({ ...DEFAULT_FILTERS, priceMax: 25000 })}
                  className="mt-4 px-5 py-2 rounded-xl text-sm font-bold"
                  style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>
                  Clear all filters
                </button>
              </div>
            ) : (
              <AnimatedList className="space-y-10 pt-2 pb-10">
                {filteredHostels.map((hostel) => (
                  <HostelListCard key={hostel.id} hostel={hostel} />
                ))}
              </AnimatedList>
            )}

            <div ref={sentinelRef} />
          </div>
        </div>
      </div>

      <FilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={setFilters}
      />
    </div>
  );
}
