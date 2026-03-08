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
  const [bookingStep, setBookingStep] = useState<"idle" | "dateTime" | "payment" | "success">("idle");
  const [viewingDate, setViewingDate] = useState("");
  const [viewingTime, setViewingTime] = useState("");
  const [ticketCode, setTicketCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingError, setBookingError] = useState("");
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

  if (bookingStep === "success") {
    return <BookingSuccessScreen room={room} hostel={hostel} ticketCode={ticketCode} viewingDate={viewingDate} viewingTime={viewingTime} onBack={() => { setBookingStep("idle"); setTicketCode(""); }} />;
  }

  async function handleBookConfirm() {
    if (!hostel || !room || !user || isProcessing) return;
    setIsProcessing(true);
    setBookingError("");
    
    // 1. Simulate payment delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 2. Generate Ticket Code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // 3. Save booking
    const { error } = await supabase.from("bookings").insert({
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
      payment_status: "paid",
      ticket_code: code,
      viewing_date: viewingDate,
      viewing_time: viewingTime,
    });
    
    setIsProcessing(false);
    if (error) {
      console.error("Booking error:", error);
      setBookingError(error.message);
    } else {
      setTicketCode(code);
      setBookingStep("success");
    }
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
      <div className="sticky bottom-0 px-4 py-3 bg-white border-t border-gray-100 space-y-2 z-40">
        {room.available ? (
          user ? (
            bookingStep === "idle" ? (
              <button
                onClick={() => setBookingStep("dateTime")}
                className="w-full bg-blue-600 text-white font-bold text-base py-3.5 rounded-2xl active:scale-95 transition-transform"
              >
                Book a Viewing
              </button>
            ) : bookingStep === "dateTime" ? (
              <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-xl absolute bottom-full left-4 right-4 mb-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Schedule Viewing</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Date</label>
                    <input type="date" value={viewingDate} onChange={e => setViewingDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Time</label>
                    <input type="time" value={viewingTime} onChange={e => setViewingTime(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" required />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setBookingStep("idle")} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl active:scale-95 text-sm">Cancel</button>
                  <button 
                    disabled={!viewingDate || !viewingTime} 
                    onClick={() => setBookingStep("payment")} 
                    className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl active:scale-95 disabled:opacity-50 text-sm"
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : bookingStep === "payment" ? (
              <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-xl absolute bottom-full left-4 right-4 mb-4">
                <h3 className="text-sm font-bold text-gray-900 mb-1">Commitment Fee</h3>
                <p className="text-xs text-gray-500 mb-4">A refundable fee of GH₵50 is required to secure your viewing and deter spam.</p>
                
                <div className="bg-blue-50 rounded-xl p-3 mb-4 flex justify-between items-center border border-blue-100 border-dashed">
                  <span className="text-sm font-bold text-blue-800">Viewing Fee</span>
                  <span className="text-lg font-extrabold text-blue-600">GH₵ 50.00</span>
                </div>
                
                <button 
                  onClick={handleBookConfirm}
                  disabled={isProcessing}
                  className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-75 transition-transform"
                >
                  {isProcessing ? "Processing..." : "Pay with Mobile Money (Mock)"}
                </button>
                <button onClick={() => setBookingStep("dateTime")} disabled={isProcessing} className="w-full mt-2 text-xs font-bold text-gray-400 py-2">Back</button>
              </div>
            ) : null
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="w-full bg-blue-600 text-white font-bold text-base py-3.5 rounded-2xl active:scale-95 transition-transform"
            >
              Sign In to Book Viewing
            </button>
          )
        ) : (
          <button disabled className="w-full bg-gray-200 text-gray-400 font-bold text-base py-3.5 rounded-2xl cursor-not-allowed">
            Room Unavailable
          </button>
        )}
        {bookingError && (
          <p className="text-center text-xs text-red-500 font-medium">{bookingError}</p>
        )}
        {bookingStep === "idle" && (
          <p className="text-center text-[10px] font-bold text-gray-400 tracking-wider uppercase mt-2">
            StayMate Verified Listings
          </p>
        )}
      </div>
    </div>
  );
}

function BookingSuccessScreen({ room, hostel, ticketCode, viewingDate, viewingTime, onBack }: { room: Room; hostel: Hostel; ticketCode: string; viewingDate: string; viewingTime: string; onBack: () => void }) {
  const displayDate = viewingDate ? new Date(viewingDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : "";

  return (
    <motion.div
      className="min-h-screen bg-gray-50 flex flex-col pb-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-blue-600 px-4 pt-16 pb-24 text-center rounded-b-[40px] shadow-sm relative overflow-hidden">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <span className="text-3xl">🎫</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white">Viewing Booked!</h1>
        <p className="text-blue-50 text-sm mt-1 font-medium max-w-xs mx-auto">
          Your viewing for {room.name} at {hostel.name} has been confirmed.
        </p>
      </div>

      <div className="px-4 -mt-16 relative z-10 flex-1 flex flex-col items-center">
        {/* The Ticket */}
        <div className="bg-white w-full max-w-sm rounded-[32px] shadow-xl border border-gray-100 p-6 flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-1/2 -left-3 w-6 h-6 bg-gray-50 rounded-full border-r border-gray-200" />
          <div className="absolute top-1/2 -right-3 w-6 h-6 bg-gray-50 rounded-full border-l border-gray-200" />
          <div className="absolute top-1/2 left-4 right-4 h-px border-b-2 border-dashed border-gray-200" />

          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">StayMate Direct</p>
          <p className="text-sm font-bold text-gray-900 text-center line-clamp-2 mb-8">{hostel.address}</p>
          
          <div className="w-full flex justify-between items-end mb-8">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Date</p>
              <p className="text-sm font-bold text-gray-900">{displayDate}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Time</p>
              <p className="text-sm font-bold text-gray-900">{viewingTime}</p>
            </div>
          </div>
          
          <div className="mt-8 mb-2">
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest text-center mb-1">Your Viewing Code</p>
            <div className="bg-gray-100 rounded-2xl px-8 py-3 tracking-[0.3em] font-mono text-3xl font-black text-gray-900">
              {ticketCode}
            </div>
          </div>
          <p className="text-[10px] font-medium text-gray-400 text-center mt-2 px-4">
            Show this code to the StayMate Field Agent or Manager upon arrival.
          </p>
        </div>

        <button
          onClick={onBack}
          className="w-full max-w-sm bg-gray-900 text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform mt-8 shadow-md"
        >
          Back to Listings
        </button>
      </div>
    </motion.div>
  );
}
