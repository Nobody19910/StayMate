"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import SwipeDeck, { type DeckItem } from "@/components/swipe/SwipeDeck";
import HostelCardContent from "@/components/swipe/HostelCardContent";
import FilterModal from "@/components/ui/FilterModal";
import { getHostels } from "@/lib/api";
import { addSaved } from "@/lib/saved-store";
import type { Hostel } from "@/lib/types";

type Layout = "grid" | "swipe";

export default function HostelsPage() {
  const router = useRouter();
  const [layout, setLayout] = useState<Layout>("grid");
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  useEffect(() => {
    getHostels().then((data) => {
      setHostels(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const allAmenities = useMemo(() => {
    const set = new Set<string>();
    hostels.forEach((h) => h.amenities?.forEach((a) => set.add(a)));
    return Array.from(set).sort();
  }, [hostels]);

  const filteredHostels = useMemo(() => {
    if (selectedAmenities.length === 0) return hostels;
    return hostels.filter((h) =>
      selectedAmenities.every((a) => h.amenities?.includes(a))
    );
  }, [hostels, selectedAmenities]);

  const items: DeckItem[] = filteredHostels.map((hostel) => ({
    id: hostel.id,
    type: "hostel" as const,
    node: (
      <div
        data-top-card
        className="w-full h-full"
        onClick={() => router.push(`/hostels/${hostel.id}`)}
      >
        <HostelCardContent hostel={hostel} />
      </div>
    ),
  }));

  function handleSwipeRight(id: string) {
    addSaved(id, "hostel");
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3 bg-white">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Hostels</h1>
          <p className="text-xs text-gray-400">Student accommodation near your campus</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterOpen(true)}
            className={`relative flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              selectedAmenities.length > 0
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-gray-100 border-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
            </svg>
            Filters
            {selectedAmenities.length > 0 && (
              <span className="ml-0.5 bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {selectedAmenities.length}
              </span>
            )}
          </button>
          <LayoutToggle layout={layout} onChange={setLayout} />
        </div>
      </div>

      {loading ? (
        <GridSkeleton />
      ) : (
        <AnimatePresence mode="wait">
          {layout === "swipe" ? (
            <motion.div
              key="swipe"
              className="flex-1 relative px-4 pb-2 min-h-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <SwipeDeck
                items={items}
                onSwipeRight={handleSwipeRight}
                onSwipeLeft={() => {}}
                saveColor="blue"
                emptyState={
                  <div className="text-center text-gray-400 px-8">
                    <p className="text-5xl mb-4">🏫</p>
                    <p className="text-lg font-semibold text-gray-600">All caught up!</p>
                    <p className="text-sm mt-1">You&apos;ve seen all hostel listings.</p>
                    <p className="text-sm text-blue-600 mt-3 font-medium">Check your saved hostels →</p>
                  </div>
                }
              />
              {/* Floating switch-to-grid */}
              <motion.button
                onClick={() => setLayout("grid")}
                className="absolute bottom-8 right-6 flex items-center gap-2 bg-white shadow-lg border border-gray-100 px-4 py-2 rounded-2xl text-xs font-semibold text-gray-700"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                Switch to Grid
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {filteredHostels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <p className="text-5xl mb-4">🏫</p>
                  <p className="text-base font-semibold text-gray-600">No hostels match</p>
                  {selectedAmenities.length > 0 && (
                    <button
                      onClick={() => setSelectedAmenities([])}
                      className="mt-3 text-sm text-blue-600 font-medium"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
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
            </motion.div>
          )}
        </AnimatePresence>
      )}

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
    <motion.div 
      className="flex-1 bg-gray-50 px-4 py-4 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
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
    </motion.div>
  );
}

function HostelGridCard({ hostel }: { hostel: Hostel }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  return (
    <Link href={`/hostels/${hostel.id}`}>
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-95 transition-transform">
        <div className="relative aspect-square w-full bg-gray-200">
          {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-gray-200" />}
          <Image
            src={hostel.images[0]}
            alt={hostel.name}
            fill
            className={`object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)}
            unoptimized
          />
          <span className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${hostel.availableRooms > 0 ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
            {hostel.availableRooms > 0 ? `${hostel.availableRooms} free` : "Full"}
          </span>
        </div>
        <div className="p-2.5">
          <p className="text-sm font-extrabold text-blue-600 leading-tight">{hostel.priceRangeLabel}</p>
          <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate">{hostel.name}</p>
          <p className="text-[10px] text-gray-400 truncate">{hostel.city}</p>
          <p className="text-[10px] text-gray-500 mt-1">{hostel.totalRooms} rooms total</p>
        </div>
      </div>
    </Link>
  );
}

function LayoutToggle({ layout, onChange }: { layout: Layout; onChange: (l: Layout) => void }) {
  return (
    <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
      <button
        onClick={() => onChange("swipe")}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${layout === "swipe" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-600"}`}
        aria-label="Swipe view"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="3" width="16" height="18" rx="3" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      </button>
      <button
        onClick={() => onChange("grid")}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${layout === "grid" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-600"}`}
        aria-label="Grid view"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </button>
    </div>
  );
}
