"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import FilterModal from "@/components/ui/FilterModal";
import { getHomes } from "@/lib/api";
import type { Property } from "@/lib/types";

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
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(50000);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number }>({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });

  // Sticky header that slides fully off-screen on scroll down
  const headerRef = useRef<HTMLDivElement>(null);
  const lastY = useRef(0);
  const isHidden = useRef(false);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop;
    const delta = y - lastY.current;
    if (delta > 8 && !isHidden.current) {
      isHidden.current = true;
      if (headerRef.current) headerRef.current.style.transform = "translateY(-100%)";
    } else if (delta < -8 && isHidden.current) {
      isHidden.current = false;
      if (headerRef.current) headerRef.current.style.transform = "translateY(0)";
    }
    lastY.current = y;
  }, []);

  useEffect(() => {
    getHomes().then((data) => { setHomes(data); setLoading(false); }).catch(() => setLoading(false));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) =>
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      );
    }
  }, []);

  const allAmenities = useMemo(() => {
    const set = new Set<string>();
    homes.forEach((h) => h.amenities?.forEach((a) => set.add(a)));
    return Array.from(set).sort();
  }, [homes]);

  const filteredHomes = useMemo(() => {
    let list = homes;
    if (filter === "rent") list = list.filter((h) => !h.forSale);
    if (filter === "sale") list = list.filter((h) => h.forSale);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(h =>
        h.title.toLowerCase().includes(q) || h.city.toLowerCase().includes(q) || h.address?.toLowerCase().includes(q)
      );
    }
    if (radius < 50) {
      list = list.filter(h => {
        const d = getDistance(userLoc.lat, userLoc.lng, (h as any).lat ?? DEFAULT_LAT, (h as any).lng ?? DEFAULT_LNG);
        return d <= radius;
      });
    }
    list = list.filter(h => h.price >= priceMin && (priceMax >= 50000 || h.price <= priceMax));
    if (selectedAmenities.length > 0) {
      list = list.filter((h) => selectedAmenities.every((a) => h.amenities?.includes(a)));
    }
    return list;
  }, [homes, filter, searchQuery, radius, priceMin, priceMax, selectedAmenities, userLoc]);

  return (
    <div className="h-screen bg-gray-50 overflow-y-auto" onScroll={handleScroll}>

      {/* Sticky header — slides fully off-screen on scroll down */}
      <div
        ref={headerRef}
        className="sticky top-0 z-20 bg-white border-b border-gray-100/50 shadow-sm"
        style={{ transition: "transform 0.25s ease", willChange: "transform" }}
      >
        {/* Title row */}
        <div className="px-4 pt-12 pb-2">
          <h1 className="text-xl font-extrabold text-gray-900">StayMate</h1>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">Dual-Mode Client View</p>
        </div>

        {/* Search + filter button */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /><circle cx="10" cy="10" r="7" />
            </svg>
            <input
              type="text"
              placeholder="Search city, neighborhood..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:bg-white transition-all"
            />
          </div>
          <button
            onClick={() => setFilterOpen(true)}
            className={`relative flex items-center justify-center p-2.5 rounded-xl border transition-colors shrink-0 ${selectedAmenities.length > 0 ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-gray-50 border-gray-100 text-gray-500"}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
            </svg>
            {selectedAmenities.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {selectedAmenities.length}
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
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 ${filter === f ? "bg-gray-900 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              {f === "all" ? "All Listings" : f === "rent" ? "For Rent" : "For Sale"}
            </button>
          ))}
          {/* Radius pill */}
          <span className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500 shrink-0 flex items-center gap-1">
            📍 {radius === 50 ? "50+ km" : `${radius} km`}
            <input type="range" min={1} max={50} value={radius} onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-16 accent-emerald-500 h-1 ml-1" />
          </span>
        </div>
      </div>

      {/* Listing grid — fills rest of screen */}
      <div className="px-4 pt-4 pb-24">
        {loading ? (
          <GridSkeleton />
        ) : filteredHomes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-5xl mb-4">🏠</p>
            <p className="text-base font-semibold text-gray-600">No listings match</p>
            <p className="text-xs mt-1 text-center">Try adjusting your filters or radius.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
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
        allAmenities={allAmenities}
        selected={selectedAmenities}
        onChange={setSelectedAmenities}
        accentColor="emerald"
      />

      <style dangerouslySetInnerHTML={{ __html: `.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}` }} />
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
          <div className="aspect-square w-full bg-emerald-50/50" />
          <div className="p-2.5 space-y-2.5 mt-1">
            <div className="h-3 bg-emerald-100 rounded-full w-1/3" />
            <div className="h-2.5 bg-gray-100 rounded-full w-2/3 mt-1" />
            <div className="h-2 bg-gray-100 rounded-full w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function HomeGridCard({ property }: { property: Property }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  return (
    <Link href={`/homes/${property.id}`}>
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-95 transition-transform cursor-pointer h-full flex flex-col">
        <div className="relative aspect-square w-full bg-gray-200 shrink-0">
          {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-gray-200" />}
          <Image
            src={property.images[0] || ""}
            alt={property.title || ""}
            fill
            className={`object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)}
            unoptimized
          />
          <span className="absolute top-2 left-2 text-[10px] font-bold uppercase bg-white/90 text-emerald-600 px-1.5 py-0.5 rounded-md backdrop-blur-sm shadow-sm">
            {property.forSale ? "For Sale" : "Rent"}
          </span>
        </div>
        <div className="p-2.5 flex-1 flex flex-col justify-between">
          <div>
            <p className="text-sm font-extrabold text-emerald-600 leading-tight">{property.priceLabel}</p>
            <p className="text-xs font-semibold text-gray-800 mt-0.5 line-clamp-2 leading-snug">{property.title}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 truncate mt-1">{property.city}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{property.beds}bd · {property.baths}ba</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
