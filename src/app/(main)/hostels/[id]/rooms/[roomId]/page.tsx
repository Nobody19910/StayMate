"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getHostelById } from "@/lib/api";
import { cachedFetch } from "@/lib/local-cache";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Hostel, Room, RoomAmenity } from "@/lib/types";
import { IconWifi, IconSnowflake, IconShower, IconFire, IconBasket, IconChair, IconDoor, IconMountain, IconUtensils, IconLock, IconCamera, IconBolt } from "@/components/ui/Icons";

const AMENITY_LABELS: Record<RoomAmenity, { label: string; icon: React.ReactNode; description: string }> = {
  wifi: { label: "High-Speed WiFi", icon: <IconWifi />, description: "Fast internet throughout the building" },
  ac: { label: "Air Conditioning", icon: <IconSnowflake />, description: "Individual AC unit in room" },
  "attached-bath": { label: "En-suite Bathroom", icon: <IconShower />, description: "Private bathroom within the room" },
  "hot-water": { label: "Hot Water", icon: <IconFire />, description: "24/7 hot water supply" },
  laundry: { label: "Laundry Access", icon: <IconBasket />, description: "In-house laundry machines available" },
  "study-desk": { label: "Study Desk & Chair", icon: <IconChair />, description: "Dedicated study area in room" },
  wardrobe: { label: "Wardrobe / Closet", icon: <IconDoor />, description: "Built-in wardrobe space" },
  balcony: { label: "Private Balcony", icon: <IconMountain />, description: "Room opens onto a private balcony" },
  "meal-included": { label: "Meals Included", icon: <IconUtensils />, description: "Daily meal plan included in rent" },
  security: { label: "24/7 Security", icon: <IconLock />, description: "Manned security gate round the clock" },
  cctv: { label: "CCTV Surveillance", icon: <IconCamera />, description: "Cameras covering common areas" },
  generator: { label: "Standby Generator", icon: <IconBolt />, description: "Generator backup during power outages" },
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  single: "Single Room", double: "Double Room", triple: "Triple Room", quad: "Quad Room", dormitory: "Dormitory",
};

interface Props {
  params: Promise<{ id: string; roomId: string }>;
}

export default function RoomDetailPage({ params }: Props) {
  const { user, profile } = useAuth();
  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const [bookingStep, setBookingStep] = useState<"idle" | "success">("idle");
  const [viewingDate, setViewingDate] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingError, setBookingError] = useState("");

  const [resolvedParams, setResolvedParams] = useState<{ id: string; roomId: string } | null>(null);

  useEffect(() => { params.then((p) => setResolvedParams(p)); }, [params]);

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--uber-surface)" }}>
        <div className="animate-pulse space-y-4 w-full px-4 max-w-6xl mx-auto">
          <div className="h-3 w-48 rounded" style={{ background: "var(--uber-surface2)" }} />
          <div className="h-7 w-2/3 rounded" style={{ background: "var(--uber-surface2)" }} />
          <div className="h-72 rounded-2xl" style={{ background: "var(--uber-surface2)" }} />
          <div className="h-48 rounded-2xl" style={{ background: "var(--uber-surface2)" }} />
        </div>
      </div>
    );
  }

  if (bookingStep === "success") {
    return <BookingSuccessScreen room={room} hostel={hostel} viewingDate={viewingDate} onBack={() => { setBookingStep("idle"); setViewingDate(""); setBookingMessage(""); }} />;
  }

  async function handleBookConfirm() {
    if (!hostel || !room || !user || isProcessing) return;
    setIsProcessing(true); setBookingError("");
    const roomImage = room.images?.[0] || hostel.images?.[0] || "";
    const messageContent = `[INQUIRY_IMAGE:${roomImage}]\n[Inquiry for: ${hostel.name} - ${room.name} (${ROOM_TYPE_LABELS[room.roomType]})]\n\n${bookingMessage || ""}`;

    const { error: bErr } = await supabase.from("bookings").insert({
      user_id: user.id, property_type: "hostel",
      property_id: "00000000-0000-0000-0000-000000000002",
      property_ref: hostel.id,
      owner_id: (hostel as any).manager_id ?? null,
      seeker_name: (user as any).user_metadata?.full_name ?? user.email ?? "",
      seeker_email: user.email ?? "",
      status: "pending",
      viewing_date: viewingDate ? new Date(viewingDate).toISOString() : null,
      message: messageContent,
    });
    if (bErr) { setIsProcessing(false); setBookingError(bErr.message); return; }

    try {
      let { data: conv } = await supabase.from("conversations").select("id").eq("seeker_id", user.id).maybeSingle();
      if (!conv) {
        const { data: created } = await supabase.from("conversations").insert({ seeker_id: user.id }).select("id").single();
        conv = created;
      }
      if (conv) {
        await supabase.from("conversations").update({ property_id: room.id, property_type: "room", property_title: `${hostel.name} — ${room.name}`, property_image: (room.images?.[0] ?? hostel.images?.[0]) ?? null, updated_at: new Date().toISOString() }).eq("id", conv.id);
        await supabase.from("messages").insert({ conversation_id: conv.id, sender_id: user.id, content: messageContent, is_read: false });
        await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conv.id);
      }
    } catch (_) {}

    try {
      const { data: admin } = await supabase.from("profiles").select("id").eq("role", "admin").limit(1).maybeSingle();
      if (admin) {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch("/api/push-notify", { method: "POST", headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify({ userId: admin.id, title: "New Inquiry 🏫", body: `New hostel inquiry for: ${room.name} at ${hostel.name}`, url: "/chat" }) });
      }
    } catch (_) {}

    setIsProcessing(false);
    setBookingStep("success");
  }

  const images = room.images?.length ? room.images : hostel.images || [];

  return (
    <div className="min-h-screen pb-8" style={{ background: "var(--uber-surface)" }}>

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-2">
        <nav className="flex items-center gap-1.5 text-xs" style={{ color: "var(--uber-muted)" }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span>›</span>
          <Link href="/hostels" className="hover:underline">Hostels</Link>
          <span>›</span>
          <Link href={`/hostels/${hostel.id}`} className="hover:underline truncate max-w-[120px]">{hostel.name}</Link>
          <span>›</span>
          <span style={{ color: "var(--uber-text)" }} className="font-medium">{room.name}</span>
        </nav>
      </div>

      {/* Title */}
      <div className="max-w-6xl mx-auto px-4 mb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: "#06C167", color: "#fff" }}>
                {ROOM_TYPE_LABELS[room.roomType] || room.roomType}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${room.available ? "text-green-700" : "text-red-700"}`} style={{ background: room.available ? "#dcfce7" : "#fee2e2" }}>
                {room.available ? "Available" : "Fully Booked"}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold leading-tight font-serif" style={{ color: "var(--uber-text)" }}>{room.name}</h1>
            <Link href={`/hostels/${hostel.id}`} className="text-sm font-medium mt-0.5 inline-block hover:underline" style={{ color: "var(--uber-green)" }}>
              {hostel.name}
            </Link>
            <p className="text-sm mt-0.5" style={{ color: "var(--uber-muted)" }}>{hostel.address}, {hostel.city}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-3xl font-extrabold" style={{ color: "var(--uber-text)" }}>{room.priceLabel}</p>
            <p className="text-xs" style={{ color: "var(--uber-muted)" }}>per academic year</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>Up to {room.capacity} {room.capacity === 1 ? "person" : "people"}</p>
          </div>
        </div>
      </div>

      {/* Photo mosaic */}
      <div className="max-w-6xl mx-auto px-4 mb-4">
        <div className="relative rounded-2xl overflow-hidden" style={{ display: "grid", gridTemplateColumns: images.length > 1 ? "3fr 2fr" : "1fr", gridTemplateRows: "1fr 1fr", gap: "4px", height: "360px" }}>
          <div className="relative cursor-pointer group" style={{ gridRow: images.length > 1 ? "1 / 3" : undefined }} onClick={() => { setGalleryIndex(0); setGalleryOpen(true); }}>
            {images[0] ? <Image src={images[0]} alt={room.name} fill className="object-cover group-hover:brightness-95 transition-all" unoptimized /> : <div className="w-full h-full" style={{ background: "var(--uber-surface2)" }} />}
            <Link href={`/hostels/${hostel.id}`} className="absolute left-3 top-3 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow z-10" onClick={e => e.stopPropagation()}>
              <svg className="w-5 h-5" style={{ color: "var(--uber-text)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </Link>
          </div>
          {images.length > 1 && [1, 2, 3, 4].map((i) => (
            <div key={i} className="relative cursor-pointer group" onClick={() => { setGalleryIndex(i); setGalleryOpen(true); }}>
              {images[i] ? <Image src={images[i]} alt={`${room.name} ${i + 1}`} fill className="object-cover group-hover:brightness-95 transition-all" unoptimized /> : <div className="w-full h-full" style={{ background: "var(--uber-surface2)" }} />}
              {i === 4 && images.length > 5 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-sm font-bold">+{images.length - 5} photos</span></div>
              )}
            </div>
          ))}
          {images.length > 1 && (
            <button onClick={() => setGalleryOpen(true)} className="absolute bottom-3 right-3 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 z-10" style={{ background: "white", color: "#1A1A1A", border: "0.5px solid rgba(0,0,0,0.15)" }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              Show all photos
            </button>
          )}
        </div>
      </div>

      {/* 2-column layout */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* About room */}
            <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <h2 className="text-base font-bold mb-3" style={{ color: "var(--uber-text)" }}>About this room</h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--uber-muted)" }}>{room.description || "A comfortable room at " + hostel.name + "."}</p>
            </div>

            {/* Amenities grid */}
            <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <h2 className="text-base font-bold mb-4" style={{ color: "var(--uber-text)" }}>What's included <span className="text-sm font-normal" style={{ color: "var(--uber-muted)" }}>({room.amenities.length} amenities)</span></h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {room.amenities.map((amenity) => {
                  const info = AMENITY_LABELS[amenity];
                  return (
                    <div key={amenity} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }}>
                      <span className="text-xl leading-none flex items-center shrink-0">{info.icon}</span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--uber-text)" }}>{info.label}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--uber-muted)" }}>{info.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Nearby universities */}
            <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <h2 className="text-base font-bold mb-3" style={{ color: "var(--uber-text)" }}>Nearby universities</h2>
              <div className="space-y-2">
                {hostel.nearbyUniversities.map((uni) => (
                  <div key={uni} className="flex items-center gap-3 py-2" style={{ borderBottom: "0.5px solid var(--uber-border)" }}>
                    <span className="text-lg">🎓</span>
                    <p className="text-sm font-medium" style={{ color: "var(--uber-text)" }}>{uni}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* House rules */}
            <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <h2 className="text-base font-bold mb-4" style={{ color: "var(--uber-text)" }}>Room rules</h2>
              <div className="space-y-3">
                {[
                  { icon: "🕐", label: "Move-in", value: "After 10:00 AM on agreed date" },
                  { icon: "📅", label: "Lease", value: "Full academic year" },
                  { icon: "🔇", label: "Noise", value: "Quiet hours after 10 PM" },
                  { icon: "🐾", label: "Pets", value: "Not permitted" },
                  { icon: "👥", label: "Guests", value: "Daytime only" },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: "0.5px solid var(--uber-border)" }}>
                    <div className="flex items-center gap-2">
                      <span>{icon}</span>
                      <p className="text-sm font-semibold" style={{ color: "var(--uber-text)" }}>{label}</p>
                    </div>
                    <p className="text-sm" style={{ color: "var(--uber-muted)" }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right — booking widget */}
          <div className="lg:w-80 shrink-0">
            <div className="lg:sticky lg:top-20 space-y-3">

              <div className="rounded-2xl p-5 shadow-lg" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <div className="mb-4">
                  <p className="text-3xl font-extrabold" style={{ color: "var(--uber-text)" }}>{room.priceLabel}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>per academic year · {ROOM_TYPE_LABELS[room.roomType]}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>Up to {room.capacity} {room.capacity === 1 ? "occupant" : "occupants"}</p>
                </div>

                {room.available ? (
                  profile?.role === "admin" ? (
                    <p className="text-sm text-center py-2" style={{ color: "var(--uber-muted)" }}>Admin accounts cannot book rooms.</p>
                  ) : user ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--uber-muted)" }}>Preferred Move-in / Viewing Date</label>
                        <input type="date" value={viewingDate} onChange={e => setViewingDate(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--uber-muted)" }}>Message (optional)</label>
                        <textarea value={bookingMessage} onChange={e => setBookingMessage(e.target.value)} placeholder="Hello, I would like to reserve this room..." rows={3} className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none" style={{ background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }} />
                      </div>
                      {bookingError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{bookingError}</p>}
                      <button onClick={handleBookConfirm} disabled={isProcessing} className="w-full font-bold text-sm py-3.5 rounded-2xl disabled:opacity-70 flex items-center justify-center gap-2" style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>
                        {isProcessing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</> : "Inquire / Book Room"}
                      </button>
                    </div>
                  ) : (
                    <Link href="/login">
                      <button className="w-full font-bold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2" style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
                        Log in to Book
                      </button>
                    </Link>
                  )
                ) : (
                  <div className="rounded-xl px-4 py-3 text-sm font-bold text-center" style={{ background: "#FEE2E2", color: "#DC2626" }}>Fully Booked</div>
                )}

                <div className="mt-4 pt-4 space-y-2" style={{ borderTop: "0.5px solid var(--uber-border)" }}>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--uber-muted)" }}>What's included</p>
                  {["Free concierge service", "Viewing coordination", "Direct hostel contact", "No hidden commission"].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--uber-green)" }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      <p className="text-xs" style={{ color: "var(--uber-muted)" }}>{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl px-4 py-4" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-base" style={{ background: "var(--uber-surface)" }}>🛡️</div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>StayMate Guarantee</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--uber-muted)" }}>We verify all student hostels. What you see is what you get.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile sticky bar */}
      {room.available && (
        <div className="lg:hidden fixed left-0 right-0 bottom-nav-offset z-40 px-4 py-3" style={{ background: "var(--uber-white)", borderTop: "0.5px solid var(--uber-border)" }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-extrabold" style={{ color: "var(--uber-text)" }}>{room.priceLabel}</p>
              <p className="text-xs" style={{ color: "var(--uber-muted)" }}>per year</p>
            </div>
            {user && profile?.role !== "admin" ? (
              <button onClick={handleBookConfirm} disabled={isProcessing} className="px-5 py-3 rounded-2xl font-bold text-sm disabled:opacity-70 flex items-center gap-2" style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>
                {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Book Room"}
              </button>
            ) : !user ? (
              <Link href="/login">
                <button className="px-5 py-3 rounded-2xl font-bold text-sm" style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>Log in to Book</button>
              </Link>
            ) : null}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {galleryOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setGalleryOpen(false)} className="text-white/80 hover:text-white text-sm font-medium flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              Close
            </button>
            <p className="text-white/70 text-sm">{galleryIndex + 1} / {images.length}</p>
          </div>
          <div className="flex-1 relative">
            {images[galleryIndex] && <Image src={images[galleryIndex]} alt="" fill className="object-contain" unoptimized />}
          </div>
          <div className="flex items-center justify-center gap-3 px-4 py-3">
            <button onClick={() => setGalleryIndex(i => Math.max(0, i - 1))} disabled={galleryIndex === 0} className="w-10 h-10 rounded-full bg-white/20 disabled:opacity-30 flex items-center justify-center text-white">‹</button>
            <div className="flex gap-1.5 overflow-x-auto max-w-xs">
              {images.map((img, i) => (
                <button key={i} onClick={() => setGalleryIndex(i)} className={`relative w-12 h-12 shrink-0 rounded-lg overflow-hidden ${i === galleryIndex ? "ring-2 ring-white" : "opacity-50"}`}>
                  <Image src={img} alt="" fill className="object-cover" unoptimized />
                </button>
              ))}
            </div>
            <button onClick={() => setGalleryIndex(i => Math.min(images.length - 1, i + 1))} disabled={galleryIndex === images.length - 1} className="w-10 h-10 rounded-full bg-white/20 disabled:opacity-30 flex items-center justify-center text-white">›</button>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingSuccessScreen({ room, hostel, viewingDate, onBack }: { room: Room; hostel: Hostel; viewingDate: string; onBack: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: "var(--uber-btn-bg)" }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: "rgba(255,255,255,0.15)" }}>
        <svg className="w-10 h-10" style={{ color: "var(--uber-btn-text)" }} fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
      </div>
      <h1 className="text-3xl font-extrabold mb-2" style={{ color: "var(--uber-btn-text)" }}>Request Sent!</h1>
      <p className="mb-8 max-w-xs font-medium" style={{ color: "var(--uber-btn-text)", opacity: 0.7 }}>Your inquiry for {room.name} at {hostel.name} has been sent. We'll be in touch shortly.</p>
      <div className="rounded-2xl p-6 w-full max-w-xs mb-8 shadow-xl text-left" style={{ background: "var(--uber-white)" }}>
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
      <button onClick={onBack} className="font-bold py-3.5 px-8 rounded-xl text-sm" style={{ background: "var(--uber-white)", color: "var(--uber-text)" }}>Back to Room</button>
    </div>
  );
}
