"use client";

import { useState, useEffect } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
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
  
  const [bookingStep, setBookingStep] = useState<"idle" | "request" | "success">("idle");
  const [viewingDate, setViewingDate] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");
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
    return <BookingSuccessScreen room={room} hostel={hostel} viewingDate={viewingDate} onBack={() => { setBookingStep("idle"); setViewingDate(""); setBookingMessage(""); }} />;
  }

  async function handleBookConfirm() {
    if (!hostel || !room || !user || isProcessing) return;
    setIsProcessing(true);
    setBookingError("");
    
    const messageContent = `[Inquiry for: ${hostel.name} - ${room.name} (${ROOM_TYPE_LABELS[room.roomType]})]\n\n${bookingMessage || ""}`;

    // 1. Save inquiry to 'bookings' table
    const { error: bookingError } = await supabase.from("bookings").insert({
      user_id: user.id,
      property_type: "hostel",
      property_id: "00000000-0000-0000-0000-000000000002", // Dummy UUID since mock items use strings
      status: "pending",
      viewing_date: viewingDate ? new Date(viewingDate).toISOString() : null,
      message: messageContent,
    });
    
    if (bookingError) {
      console.error("Booking error:", bookingError);
      setIsProcessing(false);
      setBookingError(`Error: ${bookingError.message} (Details: ${bookingError.details || ""} Hint: ${bookingError.hint || ""})`);
      return;
    }

    // 2. Also send as a chat message to the support inbox
    try {
      let { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("seeker_id", user.id)
        .maybeSingle();

      if (!conv) {
        const { data: created } = await supabase
          .from("conversations")
          .insert({ seeker_id: user.id })
          .select("id")
          .single();
        conv = created;
      }

      if (conv) {
        // Anchor conversation to this room/hostel
        await supabase.from("conversations").update({
          property_id: room.id,
          property_type: "room",
          property_title: `${hostel.name} — ${room.name}`,
          property_image: (room.images?.[0] ?? hostel.images?.[0]) ?? null,
          updated_at: new Date().toISOString(),
        }).eq("id", conv.id);

        await supabase.from("messages").insert({
          conversation_id: conv.id,
          sender_id: user.id,
          content: messageContent,
          is_read: false,
        });

        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conv.id);
      }
    } catch (chatErr) {
      console.error("Failed to send concurrent chat message:", chatErr);
      // We don't fail the whole booking if just the chat message fails
    }

    setIsProcessing(false);
    setBookingStep("success");
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Photo */}
      <div className="relative h-64">
        <Image
          src={room.images[0] || ""}
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
      <div className="fixed bottom-16 left-0 right-0 px-4 py-3 bg-white border-t border-gray-100 space-y-2 max-w-lg mx-auto z-40">
        {room.available ? (
          user ? (
            bookingStep === "idle" ? (
              <button
                onClick={() => setBookingStep("request")}
                className="w-full bg-blue-600 text-white font-bold text-base py-3.5 rounded-2xl active:scale-95 transition-transform"
              >
                Inquire / Book Room
              </button>
            ) : bookingStep === "request" ? (
              <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-xl absolute bottom-full left-4 right-4 mb-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Send Inquiry</h3>
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Preferred Move-in / Viewing Date</label>
                    <input type="date" value={viewingDate} onChange={e => setViewingDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Message for Agent</label>
                    <textarea 
                      value={bookingMessage} 
                      onChange={e => setBookingMessage(e.target.value)} 
                      placeholder="Hello, I would like to reserve this room..."
                      rows={3}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none" 
                    />
                  </div>
                </div>
                
                {bookingError && (
                  <p className="text-xs text-red-500 font-medium mb-3 bg-red-50 p-2 rounded-lg">{bookingError}</p>
                )}
                
                <div className="flex gap-2">
                  <button onClick={() => setBookingStep("idle")} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl active:scale-95 text-sm">Cancel</button>
                  <button 
                    onClick={handleBookConfirm}
                    disabled={isProcessing}
                    className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl active:scale-95 disabled:opacity-70 text-sm flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : "Send Request"}
                  </button>
                </div>
              </div>
            ) : null
          ) : (
            <Link href="/login">
              <button className="w-full bg-blue-600 text-white font-bold text-base py-3.5 rounded-2xl active:scale-95 transition-transform shadow-sm flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
                Log in to Book
              </button>
            </Link>
          )
        ) : (
          <button disabled className="w-full bg-gray-200 text-gray-400 font-bold text-base py-3.5 rounded-2xl cursor-not-allowed">
            Fully Booked
          </button>
        )}
      </div>
    </div>
  );
}

function BookingSuccessScreen({ room, hostel, viewingDate, onBack }: { 
  room: Room; 
  hostel: Hostel; 
  viewingDate: string;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-blue-600 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h1 className="text-3xl font-extrabold mb-2">Request Sent!</h1>
      <p className="text-blue-100 font-medium mb-8 max-w-xs">
        Your inquiry for {room.name} at {hostel.name} has been sent. An agent will be in touch shortly.
      </p>
      
      <div className="bg-white text-blue-900 rounded-2xl p-6 w-full max-w-xs mb-8 shadow-xl text-left">
        <div className="mb-4">
          <p className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Status</p>
          <p className="font-bold text-gray-900">Pending Agent Review</p>
        </div>
        {viewingDate && (
          <div>
            <p className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Preferred Date</p>
            <p className="font-bold text-gray-900">{new Date(viewingDate).toLocaleDateString()}</p>
          </div>
        )}
      </div>
      
      <button onClick={onBack} className="bg-blue-700 font-bold py-3.5 px-8 rounded-xl active:scale-95 text-sm transition-transform shadow-sm">
        Back to Room
      </button>
    </div>
  );
}
