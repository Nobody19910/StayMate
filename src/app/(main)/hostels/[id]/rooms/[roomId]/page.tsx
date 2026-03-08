"use client";

import { useState, useEffect } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { getHostelById } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Hostel, Room, RoomAmenity } from "@/lib/types";

const AMENITY_LABELS: Record<RoomAmenity, { label: string; emoji: string; description: string }> = {
  wifi: { label: "High-Speed WiFi", emoji: "📶", description: "Fast internet throughout the building" },
  ac: { label: "Air Conditioning", emoji: "❄️", description: "Individual AC unit in room" },
  "attached-bath": { label: "En-suite Bathroom", emoji: "🚿", description: "Private bathroom within the room" },
  "hot-water": { label: "Hot Water", emoji: "🔥", description: "24/7 hot water supply" },
  laundry: { label: "Laundry Access", emoji: "🧺", description: "In-house laundry machines available" },
  "study-desk": { label: "Study Desk & Chair", emoji: "🪑", description: "Dedicated study area in room" },
  wardrobe: { label: "Wardrobe / Closet", emoji: "🚪", description: "Built-in wardrobe space" },
  balcony: { label: "Private Balcony", emoji: "🏞️", description: "Room opens onto a private balcony" },
  "meal-included": { label: "Meals Included", emoji: "🍽️", description: "Daily meal plan included in rent" },
  security: { label: "24/7 Security", emoji: "🔒", description: "Manned security gate round the clock" },
  cctv: { label: "CCTV Surveillance", emoji: "📷", description: "Cameras covering common areas" },
  generator: { label: "Standby Generator", emoji: "⚡", description: "Generator backup during power outages" },
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  single: "Single Room",
  double: "Double Room",
  triple: "Triple Room",
  quad: "Quad Room",
  dormitory: "Dormitory",
};

interface Props {
  params: Promise<{ id: string; roomId: string }>;
}

export default function RoomDetailPage({ params }: Props) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [booked, setBooked] = useState(false);
  const [resolvedParams, setResolvedParams] = useState<{ id: string; roomId: string } | null>(null);

  useEffect(() => {
    params.then((p) => setResolvedParams(p));
  }, [params]);

  useEffect(() => {
    if (!resolvedParams) return;
    getHostelById(resolvedParams.id).then((h) => {
      if (!h) return;
      setHostel(h);
      const r = h.rooms.find((r) => r.id === resolvedParams.roomId);
      setRoom(r ?? null);
    });
  }, [resolvedParams]);

  if (!hostel || !room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full px-4">
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-6 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (booked) {
    return <BookingSuccessScreen room={room} hostel={hostel} onBack={() => setBooked(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Photo */}
      <div className="relative h-64">
        <Image
          src={room.images[0]}
          alt={room.name}
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
        <Link
          href={`/hostels/${hostel.id}`}
          className="absolute top-12 left-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>

        <div className={`absolute top-12 right-4 text-white text-xs font-bold px-2 py-1 rounded-full ${room.available ? "bg-green-500" : "bg-red-500"}`}>
          {room.available ? "Available" : "Fully Booked"}
        </div>
      </div>

      {/* Main content */}
      <div className="bg-white px-4 pt-4 pb-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {ROOM_TYPE_LABELS[room.roomType]}
            </span>
            <h1 className="text-xl font-extrabold text-gray-900 mt-1">{room.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{hostel.name}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-blue-600">{room.priceLabel}</p>
            <p className="text-xs text-gray-400">per year</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 text-sm text-gray-600 border-t border-gray-50 pt-3">
          <span>Up to {room.capacity} {room.capacity === 1 ? "occupant" : "occupants"}</span>
          <span>•</span>
          <span>{hostel.city}, {hostel.state}</span>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-bold text-gray-900 mb-2">About this room</h2>
        <p className="text-sm text-gray-600 leading-relaxed">{room.description}</p>
      </div>

      {/* Amenities */}
      <div className="px-4 py-2">
        <h2 className="text-sm font-bold text-gray-900 mb-3">
          Amenities <span className="text-gray-400 font-normal">({room.amenities.length})</span>
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {room.amenities.map((amenity) => {
            const info = AMENITY_LABELS[amenity];
            return (
              <div key={amenity} className="flex items-start gap-2 bg-white rounded-xl p-3 border border-gray-100">
                <span className="text-lg leading-none">{info.emoji}</span>
                <div>
                  <p className="text-xs font-semibold text-gray-800">{info.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{info.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Nearby */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-bold text-gray-900 mb-2">Nearby Universities</h2>
        <div className="flex flex-wrap gap-2">
          {hostel.nearbyUniversities.map((uni) => (
            <span key={uni} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full font-medium">
              {uni}
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="sticky bottom-0 px-4 py-3 bg-white border-t border-gray-100 space-y-2">
        {room.available ? (
          user ? (
            <button
              onClick={async () => {
                await supabase.from("bookings").insert({
                  listing_id: room.id,
                  listing_type: "hostel_room",
                  listing_title: `${room.name} — ${hostel.name}`,
                  seeker_id: user.id,
                  seeker_name: profile?.fullName ?? user.email ?? "Unknown",
                  seeker_email: user.email ?? "",
                  seeker_phone: profile?.phone ?? null,
                  price_label: room.priceLabel,
                  owner_id: hostel.managerId,
                  status: "pending",
                });
                setBooked(true);
              }}
              className="w-full bg-blue-600 text-white font-bold text-base py-3.5 rounded-2xl active:scale-95 transition-transform"
            >
              Request Booking — {room.priceLabel}
            </button>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="w-full bg-blue-600 text-white font-bold text-base py-3.5 rounded-2xl active:scale-95 transition-transform"
            >
              Sign In to Request Booking
            </button>
          )
        ) : (
          <button disabled className="w-full bg-gray-200 text-gray-400 font-bold text-base py-3.5 rounded-2xl cursor-not-allowed">
            Room Unavailable
          </button>
        )}
        <p className="text-center text-xs text-gray-400">
          Direct from manager — no agents, no extra fees
        </p>
      </div>
    </div>
  );
}

function BookingSuccessScreen({ room, hostel, onBack }: { room: Room; hostel: Hostel; onBack: () => void }) {
  // 2-hour expiry from now
  const expiry = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const expiryStr = expiry.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      className="min-h-screen bg-gray-50 flex flex-col"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="bg-blue-600 px-4 pt-14 pb-8 text-white text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-xl font-extrabold">Booking Requested!</h1>
        <p className="text-blue-100 text-sm mt-1">{room.name} · {hostel.name}</p>
        <div className="mt-3 bg-white/15 rounded-xl px-4 py-2 inline-block">
          <p className="text-xs text-blue-100">Bed held until</p>
          <p className="text-lg font-bold">{expiryStr} today</p>
          <p className="text-[10px] text-blue-200">2-hour hold — complete payment to secure</p>
        </div>
      </div>

      {/* Next Steps */}
      <div className="px-4 py-6 flex-1">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Next Steps</h2>

        <div className="space-y-3">
          {/* Step 1: Verification */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold text-amber-600">1</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Student Verification</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  We&apos;re checking your student status to confirm eligibility.
                </p>
                <div className="mt-3 space-y-2">
                  <VerificationStep
                    label="Student Email Check"
                    sublabel="Your .edu.ng email address"
                    status="in-progress"
                  />
                  <VerificationStep
                    label="ID Document"
                    sublabel="School ID or matric card"
                    status="pending"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Payment */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold text-blue-600">2</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Secure Your Bed</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pay to hold your spot before the 2-hour window closes.
                </p>
                <div className="mt-3 space-y-2">
                  <PaymentOption
                    icon="📱"
                    label="Mobile Money (MoMo)"
                    detail="Send to 0801 234 5678 · Ref: STAY-{room.id.slice(-4).toUpperCase()}"
                  />
                  <PaymentOption
                    icon="💳"
                    label="Card Payment"
                    detail="Secure online payment — coming soon"
                    disabled
                  />
                </div>
                <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className="text-amber-500 text-sm">⏱</span>
                  <p className="text-xs text-amber-700 font-medium">
                    Bed expires at {expiryStr} if payment not received
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Back button */}
      <div className="px-4 py-4 border-t border-gray-100 bg-white">
        <button
          onClick={onBack}
          className="w-full border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-2xl active:scale-95 transition-transform text-sm"
        >
          Back to Room Details
        </button>
      </div>
    </motion.div>
  );
}

function VerificationStep({ label, sublabel, status }: {
  label: string;
  sublabel: string;
  status: "pending" | "in-progress" | "done";
}) {
  const statusConfig = {
    pending: { dot: "bg-gray-300", text: "Pending", color: "text-gray-400" },
    "in-progress": { dot: "bg-amber-400 animate-pulse", text: "Checking…", color: "text-amber-600" },
    done: { dot: "bg-green-500", text: "Verified", color: "text-green-600" },
  }[status];

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
        <div>
          <p className="text-xs font-semibold text-gray-800">{label}</p>
          <p className="text-[10px] text-gray-400">{sublabel}</p>
        </div>
      </div>
      <span className={`text-[10px] font-bold ${statusConfig.color}`}>{statusConfig.text}</span>
    </div>
  );
}

function PaymentOption({ icon, label, detail, disabled }: {
  icon: string;
  label: string;
  detail: string;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${disabled ? "border-gray-100 bg-gray-50 opacity-50" : "border-blue-100 bg-blue-50"}`}>
      <span className="text-lg leading-none">{icon}</span>
      <div>
        <p className={`text-xs font-bold ${disabled ? "text-gray-400" : "text-blue-800"}`}>{label}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{detail}</p>
      </div>
      {disabled && <span className="ml-auto text-[10px] text-gray-400 font-medium shrink-0">Soon</span>}
    </div>
  );
}
