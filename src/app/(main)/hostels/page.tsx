"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import FilterModal from "@/components/ui/FilterModal";
import { getHostels } from "@/lib/api";
import type { Hostel } from "@/lib/types";

// Haversine formula for distance in km
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in km
  return d;
}

// Default to Accra center for demo purposes if no geolocation
const DEFAULT_LAT = 5.6037;
const DEFAULT_LNG = -0.1870;

export default function HostelsPage() {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);

  // New Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [radius, setRadius] = useState<number>(50); // 1 to 50
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(25000); // 25000 represents 25k+
  
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number}>({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });

  // Scroll hiding logic
  const [isFiltersHidden, setIsFiltersHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > 50 && currentScrollY > lastScrollY) {
      setIsFiltersHidden(true);
    } else if (currentScrollY < lastScrollY) {
      setIsFiltersHidden(false);
    }
    setLastScrollY(currentScrollY);
  };

  useEffect(() => {
    getHostels().then((data) => {
      setHostels(data);
      setLoading(false);
    }).catch(() => setLoading(false));

    // Get real location if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  const allAmenities = useMemo(() => {
    const set = new Set<string>();
    hostels.forEach((h) => h.amenities?.forEach((a) => set.add(a)));
    return Array.from(set).sort();
  }, [hostels]);

  const filteredHostels = useMemo(() => {
    let list = hostels;

    // Search Query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter(h => 
        h.name.toLowerCase().includes(q) || 
        h.city.toLowerCase().includes(q) || 
        h.address?.toLowerCase().includes(q) ||
        h.nearbyUniversities.some((u) => u.toLowerCase().includes(q))
      );
    }
    
    // Radius Filter
    if (radius < 50) {
      list = list.filter(h => {
        const hLat = (h as any).lat ?? DEFAULT_LAT;
        const hLng = (h as any).lng ?? DEFAULT_LNG;
        const dist = getDistance(userLoc.lat, userLoc.lng, hLat, hLng);
        return dist <= radius;
      });
    }

    // Price Filter (Hostels have min and max price ranges)
    list = list.filter(h => {
      // Check if the hostel's price range overlaps with the selected price range
      const hMin = (h as any).price_range_min || 0;
      const hMax = (h as any).price_range_max || 50000;
      
      // If the user's max price is less than the hostel's min price -> ignore
      if (priceMax < 25000 && priceMax < hMin) return false;
      
      // If the user's min price is greater than the hostel's max price -> ignore
      if (priceMin > hMax) return false;

      return true;
    });

    if (selectedAmenities.length > 0) {
      list = list.filter((h) =>
        selectedAmenities.every((a) => h.amenities?.includes(a))
      );
    }
    return list;
  }, [hostels, searchQuery, radius, priceMin, priceMax, selectedAmenities, userLoc]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white z-10 border-b border-gray-100/50 shadow-sm shrink-0">
        <div className="px-4 pt-12 pb-3">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Hostels</h1>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">Student View</p>
          </div>
        </div>
        
        <AnimatePresence initial={false}>
          {!isFiltersHidden && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                {/* Search Bar & Sliders */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                      <circle cx="10" cy="10" r="7" />
                    </svg>
                    <input 
                      type="text"
                      placeholder="Search campus, city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:bg-white transition-all"
                    />
                  </div>
                  <button
                    onClick={() => setFilterOpen(true)}
                    className={`relative flex items-center justify-center p-2.5 rounded-xl border transition-colors shrink-0 ${
                      selectedAmenities.length > 0
                        ? "bg-blue-50 border-blue-300 text-blue-700"
                        : "bg-gray-50 border-gray-100 text-gray-500"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
                    </svg>
                    {selectedAmenities.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {selectedAmenities.length}
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 bg-gray-50/50 p-2 rounded-xl">
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                        <span>Radius</span>
                        <span className="text-blue-700">{radius === 50 ? "50+ km" : `${radius} km`}</span>
                      </div>
                      <input 
                        type="range" 
                        min={1} 
                        max={50} 
                        value={radius} 
                        onChange={(e) => setRadius(parseInt(e.target.value))}
                        className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-gray-50/50 p-2 rounded-xl">
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                        <span>Price Range (GH₵/yr)</span>
                        <span className="text-blue-700">
                          {priceMin.toLocaleString()} - {priceMax === 25000 ? "25k+" : priceMax.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="range" 
                          min={0} 
                          max={10000} 
                          step={100}
                          value={priceMin} 
                          onChange={(e) => {
                            const v = parseInt(e.target.value);
                            if (v <= priceMax) setPriceMin(v);
                          }}
                          className="w-1/2 accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none"
                        />
                        <input 
                          type="range" 
                          min={0} 
                          max={25000} 
                          step={500}
                          value={priceMax} 
                          onChange={(e) => {
                            const v = parseInt(e.target.value);
                            if (v >= priceMin) setPriceMax(v);
                          }}
                          className="w-1/2 accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grid Container */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-4"
        onScroll={handleScroll}
      >
        {loading ? (
          <GridSkeleton />
        ) : filteredHostels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-5xl mb-4">🏫</p>
            <p className="text-base font-semibold text-gray-600">No hostels match</p>
            <p className="text-xs mt-1 text-center">Try adjusting your filters, radius, or price range.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-20">
            {filteredHostels.map((hostel, i) => (
              <motion.div
                key={hostel.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
              >
                <HostelGridCard hostel={hostel} />
              </motion.div>
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
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1 }}
        >
          <div className="aspect-square w-full bg-blue-50/50" />
          <div className="p-2.5 space-y-2.5 mt-1">
            <div className="h-3 bg-blue-100 rounded-full w-1/3" />
            <div className="h-2.5 bg-gray-100 rounded-full w-2/3 mt-1" />
            <div className="h-2 bg-gray-100 rounded-full w-1/2" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function HostelGridCard({ hostel }: { hostel: Hostel }) {
  const [imgLoaded, setImgLoaded] = useState(false);
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
          <span className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm shadow-sm ${hostel.availableRooms > 0 ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
            {hostel.availableRooms > 0 ? `${hostel.availableRooms} free` : "Full"}
          </span>
        </div>
        <div className="p-2.5 flex-1 flex flex-col justify-between">
          <div>
            <p className="text-sm font-extrabold text-blue-600 leading-tight">{hostel.priceRangeLabel}</p>
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
