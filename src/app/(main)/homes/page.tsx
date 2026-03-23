"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import FilterModal, { DEFAULT_FILTERS, type FilterState } from "@/components/ui/FilterModal";
import { searchHomes } from "@/lib/api";
import { addSaved, removeSaved, isSaved } from "@/lib/saved-store";
import type { Property } from "@/lib/types";
import FeaturedCarousel from "@/components/ui/FeaturedCarousel";

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DEFAULT_LAT = 5.6037;
const DEFAULT_LNG = -0.1870;
type ListingFilter = "all" | "rent" | "sale";

export default function HomesPage() {
  const [filter, setFilter] = useState<ListingFilter>("all");
  const [homes, setHomes] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [radius, setRadius] = useState<number>(50);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number }>({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });

  // Sticky header that slides fully off-screen on scroll down
  const headerRef = useRef<HTMLDivElement>(null);
  const lastY = useRef(0);
  const isHidden = useRef(false);

  const rafId = useRef(0);
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop;
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const delta = y - lastY.current;
      if (delta > 8 && !isHidden.current) {
        isHidden.current = true;
        if (headerRef.current) headerRef.current.style.transform = "translateY(-100%)";
      } else if (delta < -8 && isHidden.current) {
        isHidden.current = false;
        if (headerRef.current) headerRef.current.style.transform = "translateY(0)";
      }
      lastY.current = y;
    });
  }, []);

  // Fetch homes whenever server-side filters change
  useEffect(() => {
    setLoading(true);
    searchHomes({
      query: searchQuery.trim() || undefined,
      forSale: filter === "sale" ? true : filter === "rent" ? false : null,
      propertyTypes: filters.propertyTypes.length > 0 ? filters.propertyTypes : undefined,
      amenities: filters.amenities.length > 0 ? filters.amenities : undefined,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      condition: filters.condition ?? undefined,
      furnishing: filters.furnishing ?? undefined,
      timePosted: filters.timePosted,
    })
      .then(data => { setHomes(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter, filters, searchQuery]);

  useEffect(() => {
    async function fetchUserLocation() {
      try {
        const isNative = typeof (window as any).Capacitor !== "undefined" &&
          (window as any).Capacitor.isNativePlatform?.();
        if (isNative) {
          const { Geolocation } = await import("@capacitor/geolocation");
          await Geolocation.requestPermissions();
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
          setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        } else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) =>
            setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          );
        }
      } catch (_) { /* silently fall back to default coords */ }
    }
    fetchUserLocation();
  }, []);

  // Client-side radius + location filter + interleaved sponsored
  const filteredHomes = useMemo(() => {
    let list = homes;
    if (radius < 50) {
      list = list.filter(h => {
        const d = getDistance(userLoc.lat, userLoc.lng, h.lat ?? DEFAULT_LAT, h.lng ?? DEFAULT_LNG);
        return d <= radius;
      });
    }
    // Filter by districts/regions (multi-select)
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

    // Separate sponsored (basic/standard only — featured goes to carousel) and regular
    const sponsored = list.filter(h => h.isSponsored && h.sponsorTier !== "featured");
    const regular = list.filter(h => !h.isSponsored || h.sponsorTier === "featured");

    // Sort regular by distance (nearest first)
    regular.sort((a, b) => {
      const dA = getDistance(userLoc.lat, userLoc.lng, a.lat ?? DEFAULT_LAT, a.lng ?? DEFAULT_LNG);
      const dB = getDistance(userLoc.lat, userLoc.lng, b.lat ?? DEFAULT_LAT, b.lng ?? DEFAULT_LNG);
      return dA - dB;
    });

    // Interleave: insert 1 sponsored every 4 regular listings
    const interleaved: typeof list = [];
    let sIdx = 0;
    for (let i = 0; i < regular.length; i++) {
      interleaved.push(regular[i]);
      if ((i + 1) % 4 === 0 && sIdx < sponsored.length) {
        interleaved.push(sponsored[sIdx++]);
      }
    }
    // Append remaining sponsored at the end
    while (sIdx < sponsored.length) {
      interleaved.push(sponsored[sIdx++]);
    }

    return interleaved;
  }, [homes, radius, userLoc, filters.regions, filters.districts]);

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

  return (
    <div className="min-h-screen overflow-y-auto" style={{ background: "var(--background)" }} onScroll={handleScroll}>

      {/* Sticky header — slides fully off-screen on scroll down */}
      <div
        ref={headerRef}
        className="sticky top-0 z-20 border-b shadow-sm"
        style={{ transition: "transform 0.25s ease", willChange: "transform", borderColor: "var(--uber-border)", background: "var(--uber-surface)" }}
      >
        {/* Title row */}
        <div className="px-4 pb-2" style={{ paddingTop: "calc(env(safe-area-inset-top, 20px) + 12px)" }}>
          <h1 className="text-2xl font-bold" style={{ color: "var(--uber-text)" }}>StayMate</h1>
          <p className="text-[10px] font-medium uppercase tracking-widest mt-0.5" style={{ color: "var(--uber-muted)" }}>Residential & Rental Estate</p>
        </div>

        {/* Search + filter button */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--uber-muted)" }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /><circle cx="10" cy="10" r="7" />
            </svg>
            <input
              type="text"
              placeholder="Search city, neighborhood..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-black/20 transition-all"
              style={{ border: "0.5px solid var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-text)" }}
            />
          </div>
          <button
            onClick={() => setFilterOpen(true)}
            className="relative flex items-center justify-center p-2.5 rounded-xl transition-colors shrink-0"
            style={activeFilterCount > 0
              ? { background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }
              : { border: "0.5px solid var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-muted)" }
            }
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
            </svg>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--uber-green)", color: "#fff" }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter pills */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto hide-scrollbar">
          {(["all", "rent", "sale"] as ListingFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-semibold transition-all shrink-0 ${filter === f ? "shadow-sm" : ""}`}
              style={filter === f ? { background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)", border: "none" } : { border: "0.5px solid var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-muted)" }}
            >
              {f === "all" ? "All Listings" : f === "rent" ? "For Rent" : "For Sale"}
            </button>
          ))}
          {/* Radius pill */}
          <span className="px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1" style={{ background: "var(--uber-surface2)", color: "var(--uber-muted)" }}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
            {radius === 50 ? "50+ km" : `${radius} km`}
            <input type="range" min={1} max={50} value={radius} onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-16 accent-black h-1 ml-1" />
          </span>
        </div>
      </div>

      {/* Featured carousel */}
      {!loading && (() => {
        const featured = homes.filter(h => h.isSponsored && h.sponsorTier === "featured").slice(0, 10).map(h => ({
          id: h.id, title: h.title, image: h.images?.[0] || "", city: h.city, priceLabel: h.priceLabel, type: "home" as const,
        }));
        return featured.length > 0 ? <FeaturedCarousel items={featured} /> : null;
      })()}

      {/* Listing grid — fills rest of screen */}
      <div className="px-4 pt-4 pb-24">
        {loading ? (
          <GridSkeleton />
        ) : filteredHomes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20" style={{ color: "var(--uber-muted)" }}>
            <p className="text-5xl mb-4">🏠</p>
            <p className="text-base font-semibold" style={{ color: "var(--uber-text)" }}>No listings match</p>
            <p className="text-xs mt-1 text-center">Try adjusting your filters or radius.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {filteredHomes.map((property) => (
              <div key={property.id}>
                <HomeGridCard property={property} />
              </div>
            ))}
          </div>
        )}
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

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ border: "0.5px solid var(--uber-border)", background: "var(--uber-white)" }}>
          <div className="aspect-square w-full" style={{ background: "var(--uber-surface2)" }} />
          <div className="p-2.5 space-y-2.5 mt-1">
            <div className="h-3 rounded-full w-1/3" style={{ background: "var(--uber-surface2)" }} />
            <div className="h-2.5 rounded-full w-2/3 mt-1" style={{ background: "var(--uber-surface2)" }} />
            <div className="h-2 rounded-full w-1/2" style={{ background: "var(--uber-surface2)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}


function HomeGridCard({ property }: { property: Property }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isSaved(property.id));
  }, [property.id]);

  function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
    if (saved) {
      removeSaved(property.id);
      setSaved(false);
    } else {
      addSaved(property.id, "home");
      setSaved(true);
    }
  }

  return (
    <Link href={`/homes/${property.id}`}>
      <div
        className="rounded-2xl overflow-hidden active:scale-95 transition-transform cursor-pointer h-full flex flex-col"
        style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: "0.5px solid var(--uber-border)", background: "var(--uber-white)" }}
      >
        <div className="relative aspect-square w-full shrink-0" style={{ background: "var(--uber-surface2)" }}>
          {!imgLoaded && <div className="absolute inset-0 animate-pulse" style={{ background: "var(--uber-surface2)" }} />}
          <Image
            src={property.images[0] || ""}
            alt={property.title || ""}
            fill
            className={`object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)}
            unoptimized
          />
          {/* Listing type badge */}
          <span className="absolute top-2 left-2 text-[9px] font-bold uppercase bg-[#1A1A1A]/80 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
            {property.forSale ? "For Sale" : "Rent"}
          </span>
          {/* Sponsored badge */}
          {property.isSponsored && (
            <span className="absolute top-2 left-2 mt-5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shimmer-gold text-[#1A1A1A]">
              ✦ Sponsored
            </span>
          )}
          {/* Verified badge */}
          {property.isVerified && (
            <span className="absolute bottom-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm" style={{ background: "#06C167", color: "#fff" }}>
              ✓ Verified
            </span>
          )}
          {/* Negotiable badge */}
          {property.isNegotiable && (
            <span className="absolute bottom-2 left-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded backdrop-blur-sm" style={{ background: "var(--uber-green)", color: "#fff" }}>
              Negotiable
            </span>
          )}
          <button
            onClick={toggleSave}
            className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-all active:scale-90 ${
              saved ? "bg-red-500 text-white" : "bg-white/90 text-gray-400"
            }`}
          >
            <svg className="w-4 h-4" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
        <div className="p-2.5 flex-1 flex flex-col justify-between">
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: "var(--uber-text)" }}>{property.priceLabel}</p>
            <p className="text-xs mt-0.5 line-clamp-2 leading-snug" style={{ color: "var(--uber-muted)" }}>{property.title}</p>
          </div>
          <div>
            <p className="text-[10px] truncate mt-1" style={{ color: "var(--uber-muted)" }}>{property.city}</p>
            {property.isAgent && property.agentName && (
              <p className="text-[9px] font-semibold mt-0.5 truncate" style={{ color: "var(--uber-green)" }}>
                By {property.agentName}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[10px]" style={{ color: "var(--uber-muted)" }}>{property.beds}bd · {property.baths}ba</p>
              {property.condition && (
                <span className="text-[9px] font-medium px-1 py-0.5 rounded" style={{ background: "var(--uber-surface2)", color: "var(--uber-muted)" }}>
                  {property.condition === "new" ? "New" : property.condition === "renovated" ? "Reno" : "Used"}
                </span>
              )}
            </div>
            {property.serviceCharge != null && property.serviceCharge > 0 && (
              <p className="text-[10px] mt-0.5" style={{ color: "var(--uber-muted)" }}>
                + GH₵{property.serviceCharge.toLocaleString()}/mo service
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
