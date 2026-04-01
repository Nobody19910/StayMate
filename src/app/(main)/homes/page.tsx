"use client";

import { useState, useEffect, useMemo, useRef, memo, useCallback } from "react";
import Link from "next/link";
import FilterModal, { DEFAULT_FILTERS, type FilterState } from "@/components/ui/FilterModal";
import type { PropertyType } from "@/lib/types";
import { useUserLocation } from "@/lib/useUserLocation";
import { searchHomes } from "@/lib/api";
import { addSaved, removeSaved, isSaved } from "@/lib/saved-store";
import type { Property } from "@/lib/types";
import SavedSearches from "@/components/ui/SavedSearches";
import FeaturedCarousel from "@/components/ui/FeaturedCarousel";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import PullToRefreshIndicator from "@/components/ui/PullToRefreshIndicator";
import { useVisibilityRefresh } from "@/lib/use-visibility-refresh";
import { preloadImages } from "@/lib/image-cache";
import { cachedFetch, invalidateCache } from "@/lib/local-cache";
import { AnimatedList } from "@/components/ui/AnimatedList";
import RecentlyViewed from "@/components/ui/RecentlyViewed";
import OnboardingFlow from "@/components/ui/OnboardingFlow";

import { getDistance, DEFAULT_LAT, DEFAULT_LNG } from "@/lib/geo";
type ListingFilter = "all" | "rent" | "sale";

function getCacheKey(filter: ListingFilter, filters: FilterState, q: string) {
  return "homes_" + JSON.stringify({ filter, q, ...filters });
}

/* ─── Hero Search Bar ─────────────────────────────────────────────────────── */
function HeroSearch({
  searchQuery, setSearchQuery, filter, setFilter, radius, setRadius, onFilterClick, activeFilterCount,
}: {
  searchQuery: string; setSearchQuery: (v: string) => void;
  filter: ListingFilter; setFilter: (v: ListingFilter) => void;
  radius: number; setRadius: (v: number) => void;
  onFilterClick: () => void; activeFilterCount: number;
}) {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #0f2a1a 100%)",
        minHeight: "220px",
      }}
    >
      {/* Subtle green glow */}
      <div className="absolute inset-0 opacity-10"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, #06c167, transparent)" }} />

      <div className="relative max-w-screen-xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        {/* Headline */}
        <h1 className="text-2xl lg:text-4xl font-extrabold mb-1 font-serif" style={{ color: "#06c167" }}>
          Find your next home in Ghana
        </h1>
        <p className="text-sm lg:text-base mb-6 font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
          Homes for rent and sale · No brokers · No commission
        </p>

        {/* Search bar */}
        <div className="flex flex-row gap-2 max-w-3xl">
          <div className="relative" style={{ flex: "0 0 75%", maxWidth: "75%" }}>
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#06c167" }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <input
              type="text"
              placeholder="Where are you looking? City, neighbourhood…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl pl-9 pr-3 py-3 text-sm font-medium focus:outline-none"
              style={{ background: "rgba(255,255,255,0.07)", color: "#fff", border: "0.5px solid rgba(6,193,103,0.35)" }}
            />
          </div>
          <button
            className="py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 justify-center flex-1"
            style={{ background: "#06c167", color: "#fff" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              <circle cx="10" cy="10" r="7" />
            </svg>
            Search
          </button>
        </div>

        {/* Filter pills row */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {(["all", "rent", "sale"] as ListingFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={filter === f
                ? { background: "#06c167", color: "#fff" }
                : { background: "rgba(6,193,103,0.12)", color: "#06c167", border: "0.5px solid rgba(6,193,103,0.3)" }}
            >
              {f === "all" ? "All Listings" : f === "rent" ? "For Rent" : "For Sale"}
            </button>
          ))}

          {/* Radius pill */}
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

          {/* Filter modal trigger */}
          <button
            onClick={onFilterClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={activeFilterCount > 0
              ? { background: "#06c167", color: "#fff" }
              : { background: "rgba(6,193,103,0.12)", color: "#06c167", border: "0.5px solid rgba(6,193,103,0.3)" }}
          >
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

/* ─── Filter Sidebar ────────────────────────────────────────────────────────── */
function FilterSidebar({
  filter, setFilter, radius, setRadius, filters, setFilters, onOpenModal,
}: {
  filter: ListingFilter; setFilter: (v: ListingFilter) => void;
  radius: number; setRadius: (v: number) => void;
  filters: FilterState; setFilters: (v: FilterState) => void;
  onOpenModal: () => void;
}) {
  const amenityOptions = ["WiFi", "Parking", "AC", "Security", "Generator", "Water", "Gym", "Pool"];
  const typeOptions: PropertyType[] = ["apartment", "house", "studio", "townhouse", "duplex"];

  return (
    <aside
      className="w-72 shrink-0 self-start sticky top-4 rounded-2xl overflow-hidden hidden lg:block"
      style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", boxShadow: "var(--shadow-sm)" }}
    >
      {/* Header */}
      <div className="px-5 py-4" style={{ borderBottom: "0.5px solid var(--uber-border)" }}>
        <h2 className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>Filter results</h2>
      </div>

      <div className="px-5 py-4 space-y-6">

        {/* Listing type */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--uber-muted)" }}>Listing type</h3>
          <div className="space-y-2">
            {([["all", "All listings"], ["rent", "For rent"], ["sale", "For sale"]] as const).map(([val, label]) => (
              <label key={val} className="flex items-center gap-2.5 cursor-pointer">
                <input type="radio" name="listing-type" checked={filter === val} onChange={() => setFilter(val)}
                  className="accent-current w-4 h-4" style={{ accentColor: "var(--uber-green)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--uber-text)" }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--uber-muted)" }}>Your budget (GH₵/mo)</h3>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Min"
              value={filters.priceMin || ""}
              onChange={(e) => setFilters({ ...filters, priceMin: parseInt(e.target.value) || 0 })}
              className="w-full rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none"
              style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)", color: "var(--uber-text)" }}
            />
            <span className="text-xs" style={{ color: "var(--uber-muted)" }}>–</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.priceMax < 50000 ? filters.priceMax : ""}
              onChange={(e) => setFilters({ ...filters, priceMax: parseInt(e.target.value) || 50000 })}
              className="w-full rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none"
              style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)", color: "var(--uber-text)" }}
            />
          </div>
        </div>

        {/* Distance */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--uber-muted)" }}>
            Distance from you: <span style={{ color: "var(--uber-text)" }}>{radius >= 50 ? "50+ km" : `${radius} km`}</span>
          </h3>
          <input type="range" min={1} max={50} value={radius} onChange={(e) => setRadius(parseInt(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: "var(--uber-green)" }} />
          <div className="flex justify-between mt-1">
            <span className="text-[10px]" style={{ color: "var(--uber-muted)" }}>1 km</span>
            <span className="text-[10px]" style={{ color: "var(--uber-muted)" }}>50+ km</span>
          </div>
        </div>

        {/* Property type */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--uber-muted)" }}>Property type</h3>
          <div className="space-y-2">
            {typeOptions.map((t) => (
              <label key={t} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.propertyTypes.includes(t)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...filters.propertyTypes, t]
                      : filters.propertyTypes.filter((x) => x !== t);
                    setFilters({ ...filters, propertyTypes: next });
                  }}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: "var(--uber-green)" }}
                />
                <span className="text-sm font-medium capitalize" style={{ color: "var(--uber-text)" }}>{t}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--uber-muted)" }}>Amenities</h3>
          <div className="flex flex-wrap gap-1.5">
            {amenityOptions.map((a) => {
              const on = filters.amenities.includes(a);
              return (
                <button
                  key={a}
                  onClick={() => {
                    const next = on ? filters.amenities.filter((x) => x !== a) : [...filters.amenities, a];
                    setFilters({ ...filters, amenities: next });
                  }}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                  style={on
                    ? { background: "var(--uber-green)", color: "#fff" }
                    : { background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)", color: "var(--uber-muted)" }}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>

        {/* Condition */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--uber-muted)" }}>Condition</h3>
          <div className="space-y-2">
            {([["", "Any"], ["new", "New build"], ["renovated", "Renovated"], ["used", "Used"]] as const).map(([val, label]) => (
              <label key={val} className="flex items-center gap-2.5 cursor-pointer">
                <input type="radio" name="condition" checked={(filters.condition ?? "") === val}
                  onChange={() => setFilters({ ...filters, condition: val || null })}
                  className="w-4 h-4" style={{ accentColor: "var(--uber-green)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--uber-text)" }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* More filters */}
        <button
          onClick={onOpenModal}
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
        >
          All filters
        </button>

        {/* Reset */}
        {(filters.amenities.length > 0 || filters.propertyTypes.length > 0 || filters.condition) && (
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="w-full py-2 text-xs font-semibold"
            style={{ color: "var(--uber-muted)" }}
          >
            Reset all filters
          </button>
        )}
      </div>
    </aside>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────────────────────── */
function ListSkeleton() {
  return (
    <div className="space-y-10 pt-2 pb-10">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden flex flex-col sm:flex-row animate-pulse"
          style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
          <div className="w-full sm:w-52 shrink-0" style={{ minHeight: "160px", background: "var(--uber-surface2)" }} />
          <div className="flex-1 p-4 space-y-3">
            <div className="h-4 rounded w-2/3" style={{ background: "var(--uber-surface2)" }} />
            <div className="h-3 rounded w-1/3" style={{ background: "var(--uber-surface2)" }} />
            <div className="h-3 rounded w-1/2" style={{ background: "var(--uber-surface2)" }} />
            <div className="h-3 rounded w-1/4 mt-4" style={{ background: "var(--uber-surface2)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Property List Card (Booking.com style) ─────────────────────────────── */
const HomeListCard = memo(function HomeListCard({ property }: { property: Property }) {
  // Start false on both server and client (avoids hydration mismatch),
  // then sync from localStorage after mount.
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(isSaved(property.id)); }, [property.id]);

  function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
    if (saved) { removeSaved(property.id); setSaved(false); }
    else { addSaved(property.id, "home"); setSaved(true); }
  }

  const distanceLabel = "Accra";

  return (
    <Link href={`/homes/${property.id}`}>
      <div
        className="rounded-2xl overflow-hidden flex flex-row cursor-pointer group card-hover"
        style={{
          background: "var(--uber-white)",
          border: "0.5px solid var(--uber-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Image — compact on mobile, wider on desktop */}
        <div className="relative w-28 sm:w-56 md:w-72 shrink-0" style={{ minHeight: "120px", background: "var(--uber-surface2)" }}>
          <OptimizedImage
            src={property.images[0] || ""}
            alt={property.title || ""}
            width={400}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Save button */}
          <button
            onClick={toggleSave}
            className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 ${saved ? "bg-red-500 text-white" : "bg-white/90 text-gray-400"}`}
          >
            <svg className="w-4 h-4" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          {/* Sponsored badge */}
          {property.isSponsored && (
            <span className="absolute top-2.5 left-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded shimmer-gold text-[#1A1A1A]">
              ✦ Sponsored
            </span>
          )}
          {/* Rented / Sold overlay */}
          {(property.status === "rented" || property.status === "sold") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(1px)" }}>
              <span className="text-xl mb-1">{property.status === "rented" ? "🔑" : "🏷️"}</span>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-white px-2 py-0.5 rounded"
                style={{ background: property.status === "rented" ? "rgba(245,158,11,0.85)" : "rgba(124,58,237,0.85)" }}>
                {property.status === "rented" ? "Rented" : "Sold"}
              </span>
              <span className="text-[9px] text-white/80 mt-1 font-medium">Waitlist open</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 p-2.5 sm:p-5 flex flex-col justify-between min-w-0 overflow-hidden">
          <div>
            {/* Tags row */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{ background: property.forSale ? "color-mix(in srgb, var(--uber-green) 15%, transparent)" : "color-mix(in srgb, var(--info-text) 15%, transparent)", color: property.forSale ? "var(--uber-green)" : "var(--info-text)" }}>
                {property.forSale ? "For Sale" : "For Rent"}
              </span>
              {property.isVerified && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-0.5"
                  style={{ background: "color-mix(in srgb, var(--uber-green) 12%, transparent)", color: "var(--uber-green)" }}>
                  ✓ Verified
                </span>
              )}
              {property.isNegotiable && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{ background: "var(--uber-surface2)", color: "var(--uber-muted)" }}>
                  Negotiable
                </span>
              )}
              {property.condition && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded"
                  style={{ background: "var(--uber-surface2)", color: "var(--uber-muted)" }}>
                  {property.condition === "new" ? "New build" : property.condition === "renovated" ? "Renovated" : "Used"}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-base font-bold leading-snug group-hover:underline line-clamp-2 mb-1"
              style={{ color: "var(--uber-text)", textDecorationColor: "var(--uber-text)" }}>
              {property.title}
            </h3>

            {/* Location */}
            <div className="flex items-center gap-1 mb-2">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "var(--uber-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="text-xs font-medium" style={{ color: "var(--uber-muted)" }}>
                {property.address || property.city || distanceLabel}
              </span>
            </div>

            {/* Property specs */}
            <div className="flex items-center gap-3 flex-wrap">
              {property.beds != null && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--uber-muted)" }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12h19.5M2.25 12V6.375a2.25 2.25 0 012.25-2.25h15a2.25 2.25 0 012.25 2.25V12M2.25 12v6.75M21.75 12v6.75M5.25 18.75h13.5" />
                  </svg>
                  {property.beds} bed{property.beds !== 1 ? "s" : ""}
                </span>
              )}
              {property.baths != null && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--uber-muted)" }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 10h16M4 10V7a2 2 0 012-2h.586a1 1 0 01.707.293l1.414 1.414A1 1 0 0014.414 7H16a2 2 0 012 2v1M4 10v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  </svg>
                  {property.baths} bath{property.baths !== 1 ? "s" : ""}
                </span>
              )}
              {property.sqft != null && (
                <span className="text-xs" style={{ color: "var(--uber-muted)" }}>{property.sqft.toLocaleString()} sqft</span>
              )}
            </div>

            {/* Agent name */}
            {property.isAgent && property.agentName && (
              <p className="text-[11px] font-semibold mt-1.5" style={{ color: "var(--uber-green)" }}>
                Listed by {property.agentName}
              </p>
            )}
          </div>

          {/* Price + CTA */}
          <div className="flex items-end justify-between mt-4 pt-4" style={{ borderTop: "0.5px solid var(--uber-border)" }}>
            <div>
              <p className="text-lg font-extrabold leading-none" style={{ color: "var(--uber-text)" }}>
                {property.priceLabel}
              </p>
              {!property.forSale && (
                <p className="text-[10px] mt-0.5" style={{ color: "var(--uber-muted)" }}>per month</p>
              )}
              {property.serviceCharge != null && property.serviceCharge > 0 && (
                <p className="text-[10px] mt-0.5" style={{ color: "var(--uber-muted)" }}>
                  + GH₵{property.serviceCharge.toLocaleString()} service charge
                </p>
              )}
              <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "var(--info-text)" }}>
                GH₵200 coordination fee applies
              </p>
            </div>

            {/* Score badge (Booking.com style) */}
            <div className="flex flex-col items-end gap-1.5">
              {property.isSponsored && (
                <div className="text-right">
                  <p className="text-[10px] font-semibold" style={{ color: "var(--uber-muted)" }}>Featured</p>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px]" style={{ color: "var(--uber-muted)" }}>Sponsored listing</span>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black text-white shimmer-gold">✦</div>
                  </div>
                </div>
              )}
              <span
                className="px-4 py-2 rounded-xl text-xs font-bold shrink-0"
                style={{ background: "var(--uber-green)", color: "#fff" }}
              >
                See details →
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
});

/* ─── Main Page ──────────────────────────────────────────────────────────────── */
export default function HomesPage() {
  const [filter, setFilter] = useState<ListingFilter>("all");
  const [homes, setHomes] = useState<Property[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [radius, setRadius] = useState<number>(50);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<"nearest" | "price_asc" | "price_desc" | "newest">("nearest");
  const [groupBy, setGroupBy] = useState<"location" | "none">("location");
  const { loc: userLoc, denied: locDenied } = useUserLocation();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleRefresh = useCallback(async () => {
    const cacheKey = getCacheKey(filter, filters, searchQuery);
    await invalidateCache(cacheKey);
    const data = await searchHomes({
      query: searchQuery.trim() || undefined,
      forSale: filter === "sale" ? true : filter === "rent" ? false : null,
      propertyTypes: filters.propertyTypes.length > 0 ? filters.propertyTypes : undefined,
      amenities: filters.amenities.length > 0 ? filters.amenities : undefined,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      condition: filters.condition ?? undefined,
      furnishing: filters.furnishing ?? undefined,
      timePosted: filters.timePosted,
    });
    setHomes(data);
    setTotalCount(data.length);
    preloadImages(data.map((h: Property) => h.images?.[0]).filter(Boolean));
  }, [filter, filters, searchQuery]);

  const { refreshing, pullDistance, handlers: pullHandlers } = usePullToRefresh({ onRefresh: handleRefresh });
  useVisibilityRefresh(handleRefresh);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = getCacheKey(filter, filters, searchQuery);
    const fetcher = () => searchHomes({
      query: searchQuery.trim() || undefined,
      forSale: filter === "sale" ? true : filter === "rent" ? false : null,
      propertyTypes: filters.propertyTypes.length > 0 ? filters.propertyTypes : undefined,
      amenities: filters.amenities.length > 0 ? filters.amenities : undefined,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      condition: filters.condition ?? undefined,
      furnishing: filters.furnishing ?? undefined,
      timePosted: filters.timePosted,
    });
    setLoading(true);
    cachedFetch<Property[]>(cacheKey, fetcher, {
      onRevalidated: (fresh) => {
        if (!cancelled) {
          setHomes(fresh);
          setTotalCount(fresh.length);
          preloadImages(fresh.map((h: Property) => h.images?.[0]).filter(Boolean));
        }
      },
    }).then(({ data }) => {
      if (!cancelled) {
        setHomes(data);
        setTotalCount(data.length);
        setLoading(false);
        preloadImages(data.map((h: Property) => h.images?.[0]).filter(Boolean));
      }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter, filters, searchQuery]);

  const filteredHomes = useMemo(() => {
    let list = homes;

    // Radius filter
    if (radius < 50) {
      list = list.filter(h => {
        const d = getDistance(userLoc.lat, userLoc.lng, h.lat ?? DEFAULT_LAT, h.lng ?? DEFAULT_LNG);
        return d <= radius;
      });
    }

    // Location filter
    if (filters.districts.length > 0) {
      list = list.filter(h => {
        const city = (h.city ?? "").toLowerCase();
        const addr = (h.address ?? "").toLowerCase();
        return filters.districts.some(d => city.includes(d.toLowerCase()) || addr.includes(d.toLowerCase()));
      });
    } else if (filters.regions.length > 0) {
      const { getDistrictsForRegion } = require("@/lib/ghana-locations");
      const allDistricts: string[] = filters.regions.flatMap((r: string) => getDistrictsForRegion(r));
      list = list.filter(h => {
        const city = (h.city ?? "").toLowerCase();
        const addr = (h.address ?? "").toLowerCase();
        return allDistricts.some(d => city.includes(d.toLowerCase()) || addr.includes(d.toLowerCase()));
      });
    }

    const sponsored = list.filter(h => h.isSponsored && h.sponsorTier !== "featured");
    const regular = list.filter(h => !h.isSponsored || h.sponsorTier === "featured");

    // Sort regular
    regular.sort((a, b) => {
      if (sortBy === "price_asc") return (a.price ?? 0) - (b.price ?? 0);
      if (sortBy === "price_desc") return (b.price ?? 0) - (a.price ?? 0);
      if (sortBy === "newest") return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      // nearest
      const dA = getDistance(userLoc.lat, userLoc.lng, a.lat ?? DEFAULT_LAT, a.lng ?? DEFAULT_LNG);
      const dB = getDistance(userLoc.lat, userLoc.lng, b.lat ?? DEFAULT_LAT, b.lng ?? DEFAULT_LNG);
      return dA - dB;
    });

    const nearest = regular.slice(0, 2);
    const rest = regular.slice(2);
    return [...nearest, ...sponsored, ...rest];
  }, [homes, radius, userLoc, filters.regions, filters.districts, sortBy]);

  const homesByCity = useMemo<[string, Property[]][]>(() => {
    if (groupBy !== "location") return [];
    const map = new Map<string, Property[]>();
    for (const h of filteredHomes) {
      const city = (h as any).city || "Other";
      const bucket = map.get(city) ?? [];
      bucket.push(h);
      map.set(city, bucket);
    }
    // Sort cities alphabetically, but keep "Other" last
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "Other") return 1;
      if (b === "Other") return -1;
      return a.localeCompare(b);
    });
  }, [filteredHomes, groupBy]);

  const activeFilterCount =
    filters.amenities.length +
    filters.propertyTypes.length +
    (filters.condition ? 1 : 0) +
    (filters.furnishing ? 1 : 0) +
    (filters.timePosted !== "any" ? 1 : 0) +
    (filters.priceMin > 0 ? 1 : 0) +
    (filters.priceMax < 50000 ? 1 : 0) +
    filters.regions.length +
    filters.districts.length;

  // Featured items for carousel
  const featuredItems = homes
    .filter(h => h.isSponsored && h.sponsorTier === "featured")
    .slice(0, 10)
    .map(h => ({ id: h.id, title: h.title, image: h.images?.[0] || "", city: h.city, priceLabel: h.priceLabel, type: "home" as const }));

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }} {...pullHandlers}>
      <OnboardingFlow />
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} />

      {/* Hero search */}
      <HeroSearch
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filter={filter}
        setFilter={setFilter}
        radius={radius}
        setRadius={setRadius}
        onFilterClick={() => setFilterOpen(true)}
        activeFilterCount={activeFilterCount}
      />

      {/* Featured carousel */}
      {!loading && featuredItems.length > 0 && (
        <div style={{ background: "var(--uber-surface)" }}>
          <div className="max-w-screen-xl mx-auto px-4 lg:px-6 py-4">
            <p className="text-sm font-bold mb-3" style={{ color: "var(--uber-text)" }}>✦ Featured listings</p>
            <FeaturedCarousel items={featuredItems} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="max-w-screen-xl mx-auto px-4 lg:px-6 py-6">
        <div className="flex gap-6 items-start">

          {/* Filter sidebar — desktop only */}
          <FilterSidebar
            filter={filter}
            setFilter={setFilter}
            radius={radius}
            setRadius={setRadius}
            filters={filters}
            setFilters={setFilters}
            onOpenModal={() => setFilterOpen(true)}
          />

          {/* Results */}
          <div className="flex-1 min-w-0">

            {/* Results header bar */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                {!loading && (
                  <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>
                    {filteredHomes.length.toLocaleString()} propert{filteredHomes.length !== 1 ? "ies" : "y"} found
                    {searchQuery && <span style={{ color: "var(--uber-muted)" }}> for &ldquo;{searchQuery}&rdquo;</span>}
                  </p>
                )}
                <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>
                  Prices shown are in Ghanaian Cedis (GH₵)
                </p>
              </div>
              {/* Sort + Group toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none"
                  style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", color: "var(--uber-text)" }}
                >
                  <option value="nearest">Sort: Nearest first</option>
                  <option value="price_asc">Sort: Price (low → high)</option>
                  <option value="price_desc">Sort: Price (high → low)</option>
                  <option value="newest">Sort: Newest first</option>
                </select>
                <button
                  onClick={() => setGroupBy(g => g === "location" ? "none" : "location")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0"
                  style={groupBy === "location"
                    ? { background: "var(--uber-green)", color: "#fff", border: "0.5px solid var(--uber-green)" }
                    : { background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", color: "var(--uber-muted)" }}
                >
                  {groupBy === "location" ? "📍 By Location" : "☰ List"}
                </button>
              </div>
            </div>

            {/* Mobile filter pills */}
            <div className="lg:hidden flex gap-2 overflow-x-auto hide-scrollbar mb-4 pb-1">
              {(["all", "rent", "sale"] as ListingFilter[]).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold shrink-0"
                  style={filter === f
                    ? { background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }
                    : { background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", color: "var(--uber-muted)" }}>
                  {f === "all" ? "All" : f === "rent" ? "Rent" : "Sale"}
                </button>
              ))}
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
              <SavedSearches
                currentFilters={{ filter, radius, ...filters }}
                propertyType="home"
                onApply={(saved) => {
                  if (saved.filter) setFilter(saved.filter as string);
                  if (saved.radius) setRadius(saved.radius as number);
                  if (saved.priceMin !== undefined || saved.priceMax !== undefined) {
                    setFilters(prev => ({ ...prev, ...(saved as any) }));
                  }
                }}
              />
            </div>

            <RecentlyViewed />

            {/* List */}
            {loading ? (
              <ListSkeleton />
            ) : filteredHomes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-2xl"
                style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <svg className="w-14 h-14 mb-4" style={{ color: "var(--uber-surface2)" }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
                <p className="text-base font-bold" style={{ color: "var(--uber-text)" }}>No listings match your search</p>
                <p className="text-sm mt-1" style={{ color: "var(--uber-muted)" }}>Try adjusting your filters or search area.</p>
                <button onClick={() => { setFilters(DEFAULT_FILTERS); setSearchQuery(""); setRadius(50); }}
                  className="mt-4 px-5 py-2 rounded-xl text-sm font-bold"
                  style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>
                  Clear all filters
                </button>
              </div>
            ) : groupBy === "location" ? (
              <div className="pt-2 pb-10 space-y-10">
                {homesByCity.map(([city, cityHomes]) => (
                  <section key={city}>
                    {/* Sticky city header */}
                    <div
                      className="sticky top-0 z-10 flex items-center gap-2 px-1 py-2 mb-4"
                      style={{ background: "var(--uber-surface)" }}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ background: "var(--uber-green)" }}
                      />
                      <span
                        className="text-xs font-bold uppercase tracking-widest"
                        style={{ color: "var(--uber-text)" }}
                      >
                        {city}
                      </span>
                      <span
                        className="text-xs font-semibold ml-1"
                        style={{ color: "var(--uber-muted)" }}
                      >
                        · {cityHomes.length} listing{cityHomes.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {/* 2-col grid on desktop, single col on mobile */}
                    <div className="flex flex-col gap-4">
                      {cityHomes.map((property) => (
                        <HomeListCard key={property.id} property={property} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <AnimatedList className="space-y-10 pt-2 pb-10">
                {filteredHomes.map((property) => (
                  <HomeListCard key={property.id} property={property} />
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
