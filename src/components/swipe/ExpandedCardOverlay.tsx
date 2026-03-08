"use client";

import { useRef } from "react";
import { motion, PanInfo } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { mockHomes, mockHostels } from "@/lib/mock-data";
import type { Property, Hostel } from "@/lib/types";

interface Props {
  id: string;
  type: "home" | "hostel";
  onClose: () => void;
}

export default function ExpandedCardOverlay({ id, type, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const home = type === "home" ? mockHomes.find((h) => h.id === id) : null;
  const hostel = type === "hostel" ? mockHostels.find((h) => h.id === id) : null;

  const heroImage = (home ?? hostel)!.images[0];

  // Homes: images[1..3] are interior room shots
  // Hostels: first image of first 3 rooms
  const roomPhotos =
    home
      ? home.images.slice(1, 4)
      : hostel!.rooms.slice(0, 3).map((r) => r.images[0]);

  const detailHref = type === "home" ? `/homes/${id}` : `/hostels/${id}`;

  // Drag-to-dismiss: only when scroll is at the very top
  function handleDragEnd(_: unknown, info: PanInfo) {
    const atTop = !scrollRef.current || scrollRef.current.scrollTop === 0;
    if (atTop && (info.offset.y > 80 || info.velocity.y > 400)) {
      onClose();
    }
  }

  return (
    <motion.div
      className="absolute inset-0 z-50 bg-white flex flex-col overflow-hidden rounded-2xl"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 400, damping: 36 }}
      drag="y"
      dragConstraints={{ top: 0 }}
      dragElastic={{ top: 0, bottom: 0.3 }}
      onDragEnd={handleDragEnd}
    >
      {/* Drag handle pill */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-10 w-10 h-1 bg-gray-300 rounded-full pointer-events-none" />

      {/* Hero image — top 30% */}
      <div className="relative h-[30%] shrink-0">
        <Image
          src={heroImage}
          alt="Property"
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 to-transparent" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-8 left-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md"
        >
          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">

        {/* 3 room photos */}
        <div className="flex gap-2 px-3 pt-3 pb-1">
          {roomPhotos.map((src, i) => (
            <div key={i} className="relative flex-1 aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
              <Image
                src={src}
                alt={`Room ${i + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>

        {/* Info */}
        {home && <HomeInfo home={home} detailHref={detailHref} />}
        {hostel && <HostelInfo hostel={hostel} detailHref={detailHref} />}
      </div>
    </motion.div>
  );
}

// ─── Home info panel ─────────────────────────────────────────────────────────

function HomeInfo({ home, detailHref }: { home: Property; detailHref: string }) {
  return (
    <div className="px-4 pt-3 pb-6">
      {/* Title + price */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded w-fit capitalize">
            {home.propertyType}
          </p>
          <h2 className="text-lg font-extrabold text-gray-900 mt-1 leading-tight">{home.title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{home.address}, {home.city}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-extrabold text-emerald-600">{home.priceLabel}</p>
          <p className="text-xs text-gray-400">{home.forSale ? "asking price" : "per month"}</p>
        </div>
      </div>

      {/* Specs */}
      <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 border-t border-gray-100 pt-3">
        <span>🛏 {home.beds} {home.beds === 1 ? "bed" : "beds"}</span>
        <span>🚿 {home.baths} {home.baths === 1 ? "bath" : "baths"}</span>
        <span>📐 {home.sqft.toLocaleString()} sqft</span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 leading-relaxed mt-3">{home.description}</p>

      {/* CTAs */}
      <div className="flex gap-3 mt-5">
        <button className="flex-1 bg-emerald-500 text-white font-bold text-sm py-3 rounded-2xl active:scale-95 transition-transform">
          Contact Owner
        </button>
        <Link
          href={detailHref}
          className="flex-1 border border-gray-200 text-gray-700 font-semibold text-sm py-3 rounded-2xl text-center active:scale-95 transition-transform"
        >
          Full Details
        </Link>
      </div>
      <p className="text-center text-xs text-gray-400 mt-2">No agents. No commission.</p>
    </div>
  );
}

// ─── Hostel info panel ────────────────────────────────────────────────────────

function HostelInfo({ hostel, detailHref }: { hostel: Hostel; detailHref: string }) {
  return (
    <div className="px-4 pt-3 pb-6">
      {/* Title + price */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit">
            Student Hostel
          </p>
          <h2 className="text-lg font-extrabold text-gray-900 mt-1 leading-tight">{hostel.name}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{hostel.address}, {hostel.city}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-extrabold text-blue-600">{hostel.priceRangeLabel}</p>
          <p className="text-xs text-gray-400">per year</p>
        </div>
      </div>

      {/* Availability */}
      <div className="flex items-center gap-3 mt-3 text-sm text-gray-600 border-t border-gray-100 pt-3">
        <span className={`font-semibold ${hostel.availableRooms > 0 ? "text-green-600" : "text-red-500"}`}>
          {hostel.availableRooms > 0 ? `${hostel.availableRooms} rooms available` : "Fully booked"}
        </span>
        <span className="text-gray-300">·</span>
        <span>{hostel.totalRooms} total rooms</span>
      </div>

      {/* Nearby universities */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {hostel.nearbyUniversities.map((uni) => (
          <span key={uni} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
            {uni}
          </span>
        ))}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 leading-relaxed mt-3">{hostel.description}</p>

      {/* Room previews */}
      <div className="mt-4 space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Room types available</p>
        {hostel.rooms.slice(0, 3).map((room) => (
          <div key={room.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
            <div>
              <span className="text-xs font-semibold text-gray-800 capitalize">{room.roomType}</span>
              <span className="text-xs text-gray-400 ml-2">up to {room.capacity} {room.capacity === 1 ? "person" : "people"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600">{room.priceLabel}</span>
              {!room.available && (
                <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full font-medium">Full</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex gap-3 mt-5">
        <Link
          href={detailHref}
          className="flex-1 bg-blue-600 text-white font-bold text-sm py-3 rounded-2xl text-center active:scale-95 transition-transform"
        >
          Browse Rooms
        </Link>
        <button className="flex-1 border border-gray-200 text-gray-700 font-semibold text-sm py-3 rounded-2xl active:scale-95 transition-transform">
          Save Hostel
        </button>
      </div>
      <p className="text-center text-xs text-gray-400 mt-2">Direct from manager — no broker fees</p>
    </div>
  );
}
