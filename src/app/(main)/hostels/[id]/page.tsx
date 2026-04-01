"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getHostelById } from "@/lib/api";
import { cachedFetch } from "@/lib/local-cache";
import type { Hostel, Room, RoomAmenity } from "@/lib/types";
import DistanceBadge from "@/components/ui/DistanceBadge";
import PropertyMap from "@/components/ui/PropertyMap";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import ReviewsSection from "@/components/ui/ReviewsSection";
import SimilarProperties from "@/components/ui/SimilarProperties";
import { IconWifi, IconSnowflake, IconShower, IconFire, IconBasket, IconChair, IconDoor, IconMountain, IconUtensils, IconLock, IconCamera, IconBolt } from "@/components/ui/Icons";
import { trackView } from "@/components/ui/RecentlyViewed";

const AMENITY_LABELS: Record<RoomAmenity, { label: string; icon: React.ReactNode }> = {
  wifi: { label: "WiFi", icon: <IconWifi /> },
  ac: { label: "A/C", icon: <IconSnowflake /> },
  "attached-bath": { label: "En-suite", icon: <IconShower /> },
  "hot-water": { label: "Hot Water", icon: <IconFire /> },
  laundry: { label: "Laundry", icon: <IconBasket /> },
  "study-desk": { label: "Study Desk", icon: <IconChair /> },
  wardrobe: { label: "Wardrobe", icon: <IconDoor /> },
  balcony: { label: "Balcony", icon: <IconMountain /> },
  "meal-included": { label: "Meals", icon: <IconUtensils /> },
  security: { label: "Security", icon: <IconLock /> },
  cctv: { label: "CCTV", icon: <IconCamera /> },
  generator: { label: "Generator", icon: <IconBolt /> },
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  single: "Single", double: "Double", triple: "Triple", quad: "Quad", dormitory: "Dormitory",
};

export default function HostelRoomPickerPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [stickyHeader, setStickyHeader] = useState(false);
  const [completedBookingId, setCompletedBookingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    cachedFetch<Hostel | null>(`hostel_${id}`, () => getHostelById(id)).then(async ({ data }) => {
      setHostel(data); setLoading(false);
      if (data) {
        trackView({ id: data.id, title: data.name, image: data.images?.[0] || "", city: data.city, priceLabel: data.priceRangeLabel, type: "hostel" });
        // Increment view count (fire-and-forget)
        supabase.rpc("increment_view", { p_table: "hostels", p_id: id }).then(() => {});
      }
    }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("bookings")
      .select("id")
      .eq("user_id", user.id)
      .eq("property_ref", id)
      .eq("status", "completed")
      .maybeSingle()
      .then(({ data: bk }) => {
        setCompletedBookingId(bk?.id ?? null);
      });
  }, [user, id]);

  useEffect(() => {
    const onScroll = () => setStickyHeader(window.scrollY > 260);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (loading) return <HostelSkeleton />;

  if (!hostel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "var(--uber-surface)" }}>
        <p className="text-lg font-bold" style={{ color: "var(--uber-text)" }}>Hostel not found</p>
        <Link href="/hostels" className="mt-4 px-5 py-2.5 rounded-full text-sm font-bold" style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>Back to Hostels</Link>
      </div>
    );
  }

  const availableRooms = hostel.rooms.filter((r) => r.available);
  const unavailableRooms = hostel.rooms.filter((r) => !r.available);
  const images = hostel.images || [];
  const isFull = hostel.status === "full";

  async function handleWaitlist() {
    if (!hostel || !user || isProcessing) return;
    setIsProcessing(true);
    const messageContent = `[INQUIRY_IMAGE:${hostel.images?.[0] ?? ""}]\n[Inquiry for: ${hostel.name}]\n[WAITLIST]\n\nInterested — please notify me when a room opens.`;
    await supabase.from("bookings").insert({
      user_id: user.id,
      property_type: "hostel",
      property_id: "00000000-0000-0000-0000-000000000001",
      property_ref: hostel.id,
      seeker_name: (user as any).user_metadata?.full_name ?? user.email ?? "",
      seeker_email: user.email ?? "",
      status: "waitlist",
      message: messageContent,
    });
    setIsProcessing(false);
    setWaitlistDone(true);
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: "var(--uber-surface)" }}>

      {/* Sticky header */}
      <div className="fixed top-0 left-0 right-0 z-50 transition-all duration-200"
        style={{ background: stickyHeader ? "var(--uber-white)" : "transparent", borderBottom: stickyHeader ? "0.5px solid var(--uber-border)" : "none", boxShadow: stickyHeader ? "0 2px 16px rgba(0,0,0,0.07)" : "none", opacity: stickyHeader ? 1 : 0, pointerEvents: stickyHeader ? "all" : "none" }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/hostels" className="text-sm font-semibold" style={{ color: "var(--uber-green)" }}>← Hostels</Link>
          <p className="text-sm font-bold truncate" style={{ color: "var(--uber-text)" }}>{hostel.name}</p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-2">
        <nav className="flex items-center gap-1.5 text-xs" style={{ color: "var(--uber-muted)" }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span>›</span>
          <Link href="/hostels" className="hover:underline">Hostels</Link>
          <span>›</span>
          <span style={{ color: "var(--uber-text)" }} className="font-medium truncate max-w-[200px]">{hostel.name}</span>
        </nav>
      </div>

      {/* Full banner */}
      {isFull && (
        <div className="max-w-6xl mx-auto px-4 mb-3">
          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(245,158,11,0.1)", border: "0.5px solid rgba(245,158,11,0.3)" }}>
            <span className="text-lg">🔔</span>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: "#d97706" }}>This hostel is currently full</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>Join the free waitlist and we&apos;ll notify you when a room opens.</p>
            </div>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="max-w-6xl mx-auto px-4 mb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: "#06C167", color: "#fff" }}>Student Hostel</span>
              {hostel.isVerified && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1" style={{ background: "var(--uber-surface)", color: "var(--uber-green)", border: "0.5px solid var(--uber-green)" }}>
                  ✓ Verified
                </span>
              )}
              {hostel.isSponsored && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded shimmer-gold text-[#1A1A1A]">✦ Sponsored</span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold leading-tight font-serif" style={{ color: "var(--uber-text)" }}>{hostel.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--uber-muted)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
              <p className="text-sm" style={{ color: "var(--uber-muted)" }}>{hostel.address}, {hostel.city}</p>
              <DistanceBadge lat={hostel.lat} lng={hostel.lng} />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-semibold" style={{ color: "var(--uber-muted)" }}>From</p>
            <p className="text-xl font-extrabold" style={{ color: "var(--uber-text)" }}>{hostel.priceRangeLabel}</p>
            <p className="text-xs" style={{ color: "var(--uber-muted)" }}>{hostel.availableRooms} rooms available</p>
          </div>
        </div>
      </div>

      {/* Photo mosaic */}
      <div className="max-w-6xl mx-auto px-4 mb-4">
        <div className="relative rounded-2xl overflow-hidden" style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gridTemplateRows: "1fr 1fr", gap: "4px", height: "360px" }}>
          <div className="relative cursor-pointer group" style={{ gridRow: "1 / 3" }} onClick={() => { setGalleryIndex(0); setGalleryOpen(true); }}>
            {images[0] ? <Image src={images[0]} alt={hostel.name} fill className="object-cover group-hover:brightness-95 transition-all" unoptimized /> : <div className="w-full h-full" style={{ background: "var(--uber-surface2)" }} />}
            <Link href="/hostels" className="absolute left-3 top-3 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow z-10" onClick={e => e.stopPropagation()}>
              <svg className="w-5 h-5" style={{ color: "var(--uber-text)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </Link>
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="relative cursor-pointer group" onClick={() => { setGalleryIndex(i); setGalleryOpen(true); }}>
              {images[i] ? <Image src={images[i]} alt={`${hostel.name} ${i + 1}`} fill className="object-cover group-hover:brightness-95 transition-all" unoptimized /> : <div className="w-full h-full" style={{ background: "var(--uber-surface2)" }} />}
              {i === 4 && images.length > 5 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-sm font-bold">+{images.length - 5} photos</span></div>
              )}
            </div>
          ))}
          <button onClick={() => setGalleryOpen(true)} className="absolute bottom-3 right-3 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 z-10" style={{ background: "white", color: "#1A1A1A", border: "0.5px solid rgba(0,0,0,0.15)" }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
            Show all photos
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Key stats */}
            <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-extrabold" style={{ color: "var(--uber-text)" }}>{hostel.totalRooms}</p>
                  <p className="text-xs" style={{ color: "var(--uber-muted)" }}>Total Rooms</p>
                </div>
                <div className="text-center" style={{ borderLeft: "0.5px solid var(--uber-border)", borderRight: "0.5px solid var(--uber-border)" }}>
                  <p className="text-2xl font-extrabold" style={{ color: "#06C167" }}>{hostel.availableRooms}</p>
                  <p className="text-xs" style={{ color: "var(--uber-muted)" }}>Available Now</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-extrabold" style={{ color: "var(--uber-text)" }}>{hostel.nearbyUniversities.length}</p>
                  <p className="text-xs" style={{ color: "var(--uber-muted)" }}>Nearby Universities</p>
                </div>
              </div>
            </div>

            {/* About */}
            <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <h2 className="text-base font-bold mb-3" style={{ color: "var(--uber-text)" }}>About this hostel</h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--uber-muted)" }}>{hostel.description}</p>
            </div>

            {/* Amenities */}
            {hostel.amenities && hostel.amenities.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <h2 className="text-base font-bold mb-4" style={{ color: "var(--uber-text)" }}>Hostel facilities</h2>
                <div className="grid grid-cols-2 gap-3">
                  {hostel.amenities.map((a) => (
                    <div key={a} className="flex items-center gap-2 text-sm" style={{ color: "var(--uber-text)" }}>
                      <svg className="w-4 h-4 shrink-0" style={{ color: "var(--uber-green)" }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {/* Reviews */}
            <ReviewsSection
              propertyId={hostel.id}
              propertyType="hostel"
              completedBookingId={completedBookingId}
            />

            {/* House rules */}
            <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <h2 className="text-base font-bold mb-4" style={{ color: "var(--uber-text)" }}>Hostel rules</h2>
              <div className="space-y-3">
                {[
                  { icon: "🕐", label: "Move-in time", value: "After 10:00 AM" },
                  { icon: "📅", label: "Lease term", value: "Academic year (annual)" },
                  { icon: "🔇", label: "Noise policy", value: "Quiet hours after 10 PM" },
                  { icon: "🐾", label: "Pets", value: "Not permitted" },
                  { icon: "👥", label: "Guests", value: "Daytime guests only" },
                  { icon: "🍳", label: "Cooking", value: "Communal kitchen available" },
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

            {/* Location */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "0.5px solid var(--uber-border)" }}>
              <div className="px-5 py-4" style={{ background: "var(--uber-white)" }}>
                <h2 className="text-base font-bold" style={{ color: "var(--uber-text)" }}>Location</h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--uber-muted)" }}>{hostel.address}, {hostel.city}</p>
              </div>
              <PropertyMap city={hostel.city} title={hostel.address} />
            </div>

            {/* Similar hostels */}
            <SimilarProperties currentId={hostel.id} city={hostel.city} propertyType="hostel" />

          </div>

          {/* Right column — room picker + info */}
          <div className="lg:w-80 shrink-0">
            <div className="lg:sticky lg:top-20 space-y-4">

              {/* Availability summary */}
              <div className="rounded-2xl p-5 shadow-lg" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--uber-muted)" }}>Price range</p>
                <p className="text-2xl font-extrabold" style={{ color: "var(--uber-text)" }}>{hostel.priceRangeLabel}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: hostel.availableRooms > 0 ? "#06C167" : "#DC2626" }} />
                  <p className="text-sm" style={{ color: "var(--uber-muted)" }}>
                    {hostel.availableRooms > 0 ? `${hostel.availableRooms} room${hostel.availableRooms > 1 ? "s" : ""} available` : "Fully booked"}
                  </p>
                </div>
                <div className="mt-4 pt-4" style={{ borderTop: "0.5px solid var(--uber-border)" }}>
                  {isFull ? (
                    user ? (
                      waitlistDone ? (
                        <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "rgba(6,193,103,0.08)", border: "0.5px solid rgba(6,193,103,0.2)" }}>
                          <p className="text-sm font-bold" style={{ color: "var(--uber-green)" }}>✓ You&apos;re on the waitlist!</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>We&apos;ll notify you when a room opens.</p>
                        </div>
                      ) : (
                        <button
                          onClick={handleWaitlist}
                          disabled={isProcessing}
                          className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                          style={{ background: "rgba(245,158,11,0.12)", color: "#d97706", border: "0.5px solid rgba(245,158,11,0.4)" }}
                        >
                          {isProcessing ? "Joining…" : "🔔 Join Waitlist — Free"}
                        </button>
                      )
                    ) : (
                      <p className="text-xs text-center" style={{ color: "var(--uber-muted)" }}>Sign in to join the waitlist.</p>
                    )
                  ) : (
                    <p className="text-xs" style={{ color: "var(--uber-muted)" }}>Select a room below to inquire or book. All bookings are coordinated by our concierge team.</p>
                  )}
                </div>
              </div>

              {/* Concierge assurance */}
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

        {/* Room picker section — full width below */}
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-1 font-serif" style={{ color: "var(--uber-text)" }}>Choose your room</h2>
          <p className="text-sm mb-4" style={{ color: "var(--uber-muted)" }}>Tap a room to view full details and inquire</p>

          {availableRooms.length > 0 && (
            <div className="space-y-3 mb-6">
              {availableRooms.map((room) => (
                <RoomCard key={room.id} room={room} hostelId={hostel.id} />
              ))}
            </div>
          )}

          {unavailableRooms.length > 0 && (
            <>
              <h3 className="text-sm font-bold mb-3 mt-6" style={{ color: "var(--uber-muted)" }}>Currently unavailable</h3>
              <div className="space-y-3 opacity-60">
                {unavailableRooms.map((room) => (
                  <RoomCard key={room.id} room={room} hostelId={hostel.id} unavailable />
                ))}
              </div>
            </>
          )}

          {hostel.rooms.length === 0 && (
            <div className="rounded-2xl p-8 text-center" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <p className="text-sm" style={{ color: "var(--uber-muted)" }}>No rooms listed yet. Check back soon.</p>
            </div>
          )}
        </div>
      </div>

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

function RoomCard({ room, hostelId, unavailable = false }: { room: Room; hostelId: string; unavailable?: boolean }) {
  const card = (
    <div className="rounded-2xl overflow-hidden transition-all" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}>
      <div className="flex">
        <div className="relative w-32 h-28 shrink-0">
          <Image src={room.images?.[0] || "/placeholder.png"} alt={room.name} fill className="object-cover" unoptimized />
          {unavailable && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: "var(--uber-muted)", background: "var(--uber-white)" }}>FULL</span>
            </div>
          )}
          {!unavailable && (
            <div className="absolute top-2 left-2 w-2 h-2 rounded-full" style={{ background: "#06C167" }} />
          )}
        </div>
        <div className="flex-1 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: "#06C167", color: "#fff" }}>
                {ROOM_TYPE_LABELS[room.roomType] || room.roomType}
              </span>
              <p className="text-sm font-bold mt-1 leading-tight" style={{ color: "var(--uber-text)" }}>{room.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>Up to {room.capacity} {room.capacity === 1 ? "person" : "people"}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-extrabold" style={{ color: "var(--uber-text)" }}>{room.priceLabel}</p>
              <p className="text-[10px]" style={{ color: "var(--uber-muted)" }}>per year</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {(room.amenities || []).slice(0, 4).map((a) => {
              const info = AMENITY_LABELS[a];
              if (!info) return null;
              return (
                <span key={a} className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: "var(--uber-surface)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" }}>
                  {info.icon} {info.label}
                </span>
              );
            })}
            {(room.amenities || []).length > 4 && (
              <span className="text-[10px] px-1 py-0.5" style={{ color: "var(--uber-muted)" }}>+{room.amenities.length - 4} more</span>
            )}
          </div>
        </div>
        {!unavailable && (
          <div className="flex items-center pr-3" style={{ color: "var(--uber-muted)" }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </div>
        )}
      </div>
    </div>
  );

  if (unavailable) return card;
  return <Link href={`/hostels/${hostelId}/rooms/${room.id}`}>{card}</Link>;
}

function HostelSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: "var(--uber-surface)" }}>
      <div className="max-w-6xl mx-auto px-4 pt-4 space-y-4 animate-pulse">
        <div className="h-3 w-48 rounded" style={{ background: "var(--uber-surface2)" }} />
        <div className="h-7 w-3/4 rounded" style={{ background: "var(--uber-surface2)" }} />
        <div className="h-72 rounded-2xl" style={{ background: "var(--uber-surface2)" }} />
        <div className="h-40 rounded-2xl" style={{ background: "var(--uber-surface2)" }} />
        <div className="h-40 rounded-2xl" style={{ background: "var(--uber-surface2)" }} />
      </div>
    </div>
  );
}
