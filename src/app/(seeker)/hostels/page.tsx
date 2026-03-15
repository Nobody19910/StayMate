"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import FilterModal from "@/components/ui/FilterModal";
import { getHostels } from "@/lib/api";
import { addSaved, removeSaved, isSaved } from "@/lib/saved-store";
import type { Hostel } from "@/lib/types";

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

export default function HostelsPage() {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [radius, setRadius] = useState<number>(50);
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(25000);
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
    getHostels().then((data) => { setHostels(data); setLoading(false); }).catch(() => setLoading(false));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) =>
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      );
    }
  }, []);

  const allAmenities = useMemo(() => {
    const set = new Set<string>();
    hostels.forEach((h) => h.amenities?.forEach((a) => set.add(a)));
    return Array.from(set).sort();
  }, [hostels]);

  const filteredHostels = useMemo(() => {
    let list = hostels;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(h =>
        h.name.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q) ||
        h.address?.toLowerCase().includes(q) ||
        h.nearbyUniversities.some((u) => u.toLowerCase().includes(q))
      );
    }
    if (radius < 50) {
      list = list.filter(h => {
        const d = getDistance(userLoc.lat, userLoc.lng, (h as any).lat ?? DEFAULT_LAT, (h as any).lng ?? DEFAULT_LNG);
        return d <= radius;
      });
    }
    list = list.filter(h => {
      const hMin = (h as any).price_range_min || 0;
      const hMax = (h as any).price_range_max || 50000;
      if (priceMax < 25000 && priceMax < hMin) return false;
      if (priceMin > hMax) return false;
      return true;
    });
    if (selectedAmenities.length > 0) {
      list = list.filter((h) => selectedAmenities.every((a) => h.amenities?.includes(a)));
    }
    return list;
  }, [hostels, searchQuery, radius, priceMin, priceMax, selectedAmenities, userLoc]);

  return (
    <div className="min-h-screen bg-[#F6F6F6] overflow-y-auto" onScroll={handleScroll}>

      {/* Sticky header — slides fully off-screen on scroll down */}
      <div
        ref={headerRef}
        className="sticky top-0 z-20 bg-white border-b border-gray-100/50 shadow-sm"
        style={{ transition: "transform 0.25s ease", willChange: "transform" }}
      >
        {/* Title */}
        <div className="px-4 pt-12 pb-2">
          <h1 className="text-xl font-extrabold text-gray-900">Hostels</h1>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">Student View</p>
        </div>

        {/* Search + filter button */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /><circle cx="10" cy="10" r="7" />
            </svg>
            <input
              type="text"
              placeholder="Search campus, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium text-black focus:outline-none focus:ring-1 focus:ring-black/20 transition-all"
              style={{ border: "0.5px solid rgba(0,0,0,0.12)" }}
            />
          </div>
          <button
            onClick={() => setFilterOpen(true)}
            className={`relative flex items-center justify-center p-2.5 rounded-xl border transition-colors shrink-0 ${selectedAmenities.length > 0 ? "bg-black text-white" : "bg-[#F6F6F6] text-gray-500"}`}
            style={{ border: "0.5px solid rgba(0,0,0,0.12)" }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
            </svg>
            {selectedAmenities.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-black text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {selectedAmenities.length}
              </span>
            )}
          </button>
        </div>

        {/* Radius pill */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto hide-scrollbar">
          <span className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500 shrink-0 flex items-center gap-1">
            📍 {radius === 50 ? "50+ km" : `${radius} km`}
            <input type="range" min={1} max={50} value={radius} onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-16 accent-black h-1 ml-1" />
          </span>
        </div>
      </div>

      {/* Listings grid — fills rest of screen */}
      <div className="px-4 pt-4 pb-24">
        {loading ? (
          <GridSkeleton />
        ) : filteredHostels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-5xl mb-4">🏫</p>
            <p className="text-base font-semibold text-gray-600">No hostels match</p>
            <p className="text-xs mt-1 text-center">Try adjusting your filters or radius.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {filteredHostels.map((hostel) => (
              <div key={hostel.id}>
                <HostelGridCard hostel={hostel} />
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
        accentColor="blue"
      />

      <style dangerouslySetInnerHTML={{ __html: `.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}` }} />
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse" style={{ border: "0.5px solid rgba(0,0,0,0.08)" }}>
          <div className="aspect-square w-full bg-gray-100" />
          <div className="p-2.5 space-y-2.5 mt-1">
            <div className="h-3 bg-gray-200 rounded-full w-1/3" />
            <div className="h-2.5 bg-gray-100 rounded-full w-2/3 mt-1" />
            <div className="h-2 bg-gray-100 rounded-full w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function HostelGridCard({ hostel }: { hostel: Hostel }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isSaved(hostel.id));
  }, [hostel.id]);

  function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
    if (saved) {
      removeSaved(hostel.id);
      setSaved(false);
    } else {
      addSaved(hostel.id, "hostel");
      setSaved(true);
    }
  }

  return (
    <Link href={`/hostels/${hostel.id}`}>
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-95 transition-transform cursor-pointer h-full flex flex-col">
        <div className="relative aspect-square w-full bg-gray-200 shrink-0">
          {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-gray-200" />}
          <Image
            src={hostel.images[0] || ""}
            alt={hostel.name || ""}
            fill
            className={`object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)}
            unoptimized
          />
          <span className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm shadow-sm text-white`}
            style={{ background: hostel.availableRooms > 0 ? "#06C167" : "#000000" }}>
            {hostel.availableRooms > 0 ? `${hostel.availableRooms} free` : "Full"}
          </span>
          <button
            onClick={toggleSave}
            className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-all active:scale-90 ${
              saved ? "bg-red-500 text-white" : "bg-white/90 text-gray-400 hover:text-red-400"
            }`}
          >
            <svg className="w-4 h-4" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
        <div className="p-2.5 flex-1 flex flex-col justify-between">
          <div>
            <p className="text-sm font-bold text-black leading-tight">{hostel.priceRangeLabel}</p>
            <p className="text-xs font-semibold text-gray-800 mt-0.5 line-clamp-2 leading-snug">{hostel.name}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 truncate mt-1">{hostel.city}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{hostel.totalRooms} rooms total</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
