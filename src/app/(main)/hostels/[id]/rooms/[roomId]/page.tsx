"use client";

import { useState, useEffect } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { getHostelById } from "@/lib/api";
import { cachedFetch } from "@/lib/local-cache";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Hostel, Room, RoomAmenity } from "@/lib/types";
import ImageGallery from "@/components/ui/ImageGallery";
import { IconWifi, IconSnowflake, IconShower, IconFire, IconBasket, IconChair, IconDoor, IconMountain, IconUtensils, IconLock, IconCamera, IconBolt } from "@/components/ui/Icons";

const AMENITY_LABELS: Record<RoomAmenity, { label: string; emoji: React.ReactNode; description: string }> = {
  wifi: { label: "High-Speed WiFi", emoji: <IconWifi />, description: "Fast internet throughout the building" },
  ac: { label: "Air Conditioning", emoji: <IconSnowflake />, description: "Individual AC unit in room" },
  "attached-bath": { label: "En-suite Bathroom", emoji: <IconShower />, description: "Private bathroom within the room" },
  "hot-water": { label: "Hot Water", emoji: <IconFire />, description: "24/7 hot water supply" },
  laundry: { label: "Laundry Access", emoji: <IconBasket />, description: "In-house laundry machines available" },
  "study-desk": { label: "Study Desk & Chair", emoji: <IconChair />, description: "Dedicated study area in room" },
  wardrobe: { label: "Wardrobe / Closet", emoji: <IconDoor />, description: "Built-in wardrobe space" },
  balcony: { label: "Private Balcony", emoji: <IconMountain />, description: "Room opens onto a private balcony" },
  "meal-included": { label: "Meals Included", emoji: <IconUtensils />, description: "Daily meal plan included in rent" },
  security: { label: "24/7 Security", emoji: <IconLock />, description: "Manned security gate round the clock" },
  cctv: { label: "CCTV Surveillance", emoji: <IconCamera />, description: "Cameras covering common areas" },
  generator: { label: "Standby Generator", emoji: <IconBolt />, description: "Generator backup during power outages" },
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
    cachedFetch(`hostel_${resolvedParams.id}`, () => getHostelById(resolvedParams.id)).then(({ data: h }) => {
      if (!h) return;
      setHostel(h);
      const r = h.rooms.find((r: any) => r.id === resolvedParams.roomId);
      setRoom(r ?? null);
    });
  }, [resolvedParams]);

  if (!hostel || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="animate-pulse space-y-4 w-full px-4">
          <div className="h-64 rounded-2xl" style={{ background: "var(--uber-surface2)" }} />
          <div className="h-6 rounded w-2/3" style={{ background: "var(--uber-surface2)" }} />
          <div className="h-4 rounded w-1/2" style={{ background: "var(--uber-surface2)" }} />
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
    
    const roomImage = room.images?.[0] || hostel.images?.[0] || "";
    const messageContent = `[INQUIRY_IMAGE:${roomImage}]\n[Inquiry for: ${hostel.name} - ${room.name} (${ROOM_TYPE_LABELS[room.roomType]})]\n\n${bookingMessage || ""}`;

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
    }

    // Notify admin of new inquiry via push
    try {
      const { data: admin } = await supabase.from("profiles").select("id").eq("role", "admin").limit(1).maybeSingle();
      if (admin) {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch("/api/push-notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            userId: admin.id,
            title: "New Inquiry 🏫",
            body: `New hostel inquiry for: ${room.name} at ${hostel.name}`,
            url: "/chat",
          }),
        });
      }
    } catch (_) { }

    setIsProcessing(false);
    setBookingStep("success");
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--background)" }}>
      {/* Photo Gallery */}
      <ImageGallery images={room.images || []} alt={room.name} heightClass="h-64">
        <Link
          href={`/hostels/${hostel.id}`}
          className="absolute left-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow z-10"
          style={{ top: "calc(env(safe-area-inset-top, 12px) + 12px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-5 h-5" style={{ color: "var(--uber-text)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>

        <div className={`absolute right-4 text-white text-xs font-bold px-2 py-1 rounded-full z-10 ${room.available ? "bg-green-500" : "bg-red-500"}`}
          style={{ top: "calc(env(safe-area-inset-top, 12px) + 12px)" }}>
          {room.available ? "Available" : "Fully Booked"}
        </div>
      </ImageGallery>

      {/* Main content */}
      <div className="px-4 pt-4 pb-3 shadow-sm" style={{ background: "var(--uber-white)" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase text-[#06C167] bg-[#06C167]/10 px-2 py-0.5 rounded">
              {ROOM_TYPE_LABELS[room.roomType]}
            </span>
            <h1 className="text-xl font-extrabold mt-1" style={{ color: "var(--uber-text)" }}>{room.name}</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--uber-muted)" }}>{hostel.name}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold" style={{ color: "var(--uber-text)" }}>{room.priceLabel}</p>
            <p className="text-xs" style={{ color: "var(--uber-muted)" }}>per year</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 text-sm pt-3" style={{ color: "var(--uber-muted)", borderTop: "0.5px solid var(--uber-border)" }}>
          <span>Up to {room.capacity} {room.capacity === 1 ? "occupant" : "occupants"}</span>
          <span>•</span>
          <span>{hostel.city}, {hostel.state}</span>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>About this room</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--uber-muted)" }}>{room.description}</p>
      </div>

      {/* Amenities */}
      <div className="px-4 py-2">
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--uber-text)" }}>
          Amenities <span style={{ color: "var(--uber-muted)" }} className="font-normal">({room.amenities.length})</span>
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {room.amenities.map((amenity) => {
            const info = AMENITY_LABELS[amenity];
            return (
              <div key={amenity} className="flex items-start gap-2 rounded-xl p-3" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <span className="text-lg leading-none flex items-center">{info.emoji}</span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--uber-text)" }}>{info.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--uber-muted)" }}>{info.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Nearby */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>Nearby Universities</h2>
        <div className="flex flex-wrap gap-2">
          {hostel.nearbyUniversities.map((uni) => (
            <span key={uni} className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}>
              {uni}
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="fixed left-0 right-0 px-4 py-3 space-y-2 max-w-lg mx-auto z-40 bottom-nav-offset" style={{ background: "var(--uber-white)", borderTop: "0.5px solid var(--uber-border)" }}>
        {room.available ? (
          profile?.role === "admin" ? (
            <div className="text-center py-2 text-sm font-medium" style={{ color: "var(--uber-muted)" }}>
              Admin accounts cannot book rooms.
            </div>
          ) : user ? (
            bookingStep === "idle" ? (
              <button
                onClick={() => setBookingStep("request")}
                className="w-full font-bold text-base py-3.5 rounded-2xl active:scale-95 transition-transform"
                style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
              >
                Inquire / Book Room
              </button>
            ) : bookingStep === "request" ? (
              <div className="rounded-2xl p-4 shadow-xl absolute bottom-full left-4 right-4 mb-4" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <h3 className="text-sm font-bold mb-3" style={{ color: "var(--uber-text)" }}>Send Inquiry</h3>
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--uber-muted)" }}>Preferred Move-in / Viewing Date</label>
                    <input type="date" value={viewingDate} onChange={e => setViewingDate(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--uber-muted)" }}>Message for Agent</label>
                    <textarea
                      value={bookingMessage}
                      onChange={e => setBookingMessage(e.target.value)}
                      placeholder="Hello, I would like to reserve this room..."
                      rows={3}
                      className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
                      style={{ background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
                    />
                  </div>
                </div>
                
                {bookingError && (
                  <p className="text-xs text-red-500 font-medium mb-3 bg-red-50 p-2 rounded-lg">{bookingError}</p>
                )}
                
                <div className="flex gap-2">
                  <button onClick={() => setBookingStep("idle")} className="flex-1 font-bold py-3 rounded-xl active:scale-95 text-sm" style={{ background: "var(--uber-surface)", color: "var(--uber-muted)" }}>Cancel</button>
                  <button
                    onClick={handleBookConfirm}
                    disabled={isProcessing}
                    className="flex-1 font-bold py-3 rounded-xl active:scale-95 disabled:opacity-70 text-sm flex items-center justify-center gap-2"
                    style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
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
              <button className="w-full font-bold text-base py-3.5 rounded-2xl active:scale-95 transition-transform shadow-sm flex items-center justify-center gap-2" style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
                Log in to Book
              </button>
            </Link>
          )
        ) : (
          <button disabled className="w-full font-bold text-base py-3.5 rounded-2xl cursor-not-allowed" style={{ background: "var(--uber-surface2)", color: "var(--uber-muted)" }}>
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
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h1 className="text-3xl font-extrabold mb-2">Request Sent!</h1>
      <p className="text-white/70 font-medium mb-8 max-w-xs">
        Your inquiry for {room.name} at {hostel.name} has been sent. We will be in touch shortly.
      </p>

      <div className="rounded-2xl p-6 w-full max-w-xs mb-8 shadow-xl text-left" style={{ background: "var(--uber-white)", color: "var(--uber-text)" }}>
        <div className="mb-4">
          <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--uber-muted)" }}>Status</p>
          <p className="font-bold" style={{ color: "var(--uber-text)" }}>Pending Review</p>
        </div>
        {viewingDate && (
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--uber-muted)" }}>Preferred Date</p>
            <p className="font-bold" style={{ color: "var(--uber-text)" }}>{new Date(viewingDate).toLocaleDateString()}</p>
          </div>
        )}
      </div>

      <button onClick={onBack} className="bg-white text-black font-bold py-3.5 px-8 rounded-xl active:scale-95 text-sm transition-transform shadow-sm">
        Back to Room
      </button>
    </div>
  );
}
