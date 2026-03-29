"use client";

import { useState, useEffect, useRef } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getHomeById } from "@/lib/api";
import { cachedFetch } from "@/lib/local-cache";
import { addSaved, removeSaved, isSaved } from "@/lib/saved-store";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Property } from "@/lib/types";
import PropertyMap from "@/components/ui/PropertyMap";
import DistanceBadge from "@/components/ui/DistanceBadge";
import SponsorModal from "@/components/ui/SponsorModal";
import { IconCheck, IconStar, IconBed, IconShower, IconRuler } from "@/components/ui/Icons";

interface Props {
  params: Promise<{ id: string }>;
}

const AMENITY_ICONS: Record<string, string> = {
  AC: "❄️", Generator: "⚡", Pool: "🏊", Security: "🔒",
  Parking: "🅿️", Furnished: "🛋️", WiFi: "📶", CCTV: "📷",
  Borehole: "💧", Garden: "🌿", Gym: "🏋️", Balcony: "🏙️",
  "Serviced Apartment": "🏢", "Smart Home": "📱",
};

const AMENITY_CATEGORIES: Record<string, string[]> = {
  "Comfort & Living": ["AC", "Furnished", "Balcony", "Garden"],
  "Security": ["Security", "CCTV", "Smart Home"],
  "Utilities": ["Generator", "Borehole", "WiFi"],
  "Outdoor & Recreation": ["Pool", "Gym", "Parking"],
};

const FAQ_ITEMS = [
  { q: "How does the inquiry process work?", a: "Submit your inquiry through StayMate. Our concierge team will review it and connect you directly with the property owner within 24 hours." },
  { q: "Is there a fee to contact the owner?", a: "A GH₵ 200 coordination & viewing fee applies once your inquiry is accepted. This covers our concierge service and viewing coordination." },
  { q: "Can I negotiate the price?", a: "Yes — once connected with the owner, pricing discussions are between you and them directly. StayMate does not take any commission." },
  { q: "What does 'Verified by StayMate' mean?", a: "Our team has physically visited and confirmed the property details, photos, and ownership documentation are accurate." },
];

export default function HomeDetailPage({ params }: Props) {
  const { user, profile } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [saved, setSaved] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [stickyHeader, setStickyHeader] = useState(false);

  const [bookingStep, setBookingStep] = useState<"idle" | "request" | "success">("idle");
  const [viewingDate, setViewingDate] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [showSponsor, setShowSponsor] = useState(false);
  const [adminEditMode, setAdminEditMode] = useState(false);
  const [editedProperty, setEditedProperty] = useState<Partial<Property> | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    params.then(({ id }) => {
      cachedFetch<Property | null>(`home_${id}`, () => getHomeById(id)).then(({ data: p }) => {
        if (!p) { setNotFoundFlag(true); return; }
        setProperty(p);
        setSaved(isSaved(p.id));
      });
    });
  }, [params]);

  useEffect(() => {
    const onScroll = () => setStickyHeader(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (notFoundFlag) notFound();
  if (!property) return <DetailSkeleton />;
  if (bookingStep === "success") {
    return <BookingSuccessScreen property={property} viewingDate={viewingDate} onBack={() => { setBookingStep("idle"); setViewingDate(""); setBookingMessage(""); }} />;
  }

  async function handleBookConfirm() {
    if (!property || !user || isProcessing) return;
    setIsProcessing(true);
    setBookingError("");
    const messageContent = `[INQUIRY_IMAGE:${property.images?.[0] ?? ""}]\n[Inquiry for: ${property.title}]\n\n${bookingMessage || ""}`;

    const { error: bErr } = await supabase.from("bookings").insert({
      user_id: user.id, property_type: "home",
      property_id: "00000000-0000-0000-0000-000000000001",
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
        await supabase.from("conversations").update({ property_id: property.id, property_type: "home", property_title: property.title, property_image: property.images?.[0] ?? null, updated_at: new Date().toISOString() }).eq("id", conv.id);
        await supabase.from("messages").insert({ conversation_id: conv.id, sender_id: user.id, content: messageContent, is_read: false });
      }
    } catch (_) {}

    try {
      const { data: admin } = await supabase.from("profiles").select("id").eq("role", "admin").limit(1).maybeSingle();
      if (admin) {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch("/api/push-notify", { method: "POST", headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify({ userId: admin.id, title: "New Inquiry 🏠", body: `New inquiry for: ${property.title}`, url: "/chat" }) });
      }
    } catch (_) {}

    setIsProcessing(false);
    setBookingStep("success");
  }

  function toggleSave() {
    if (!property) return;
    if (saved) { removeSaved(property.id); setSaved(false); }
    else { addSaved(property.id, "home"); setSaved(true); }
  }

  async function handleAdminSaveEdit() {
    if (!property || !editedProperty || isSavingEdit) return;
    setIsSavingEdit(true); setEditError("");
    try {
      const { error } = await supabase.from("homes").update(editedProperty).eq("id", property.id);
      if (error) throw error;
      setProperty({ ...property, ...editedProperty });
      setAdminEditMode(false); setEditedProperty(null);
    } catch (err: any) { setEditError(err.message || "Failed to save"); }
    finally { setIsSavingEdit(false); }
  }

  const images = property.images || [];
  const categorizedAmenities = Object.entries(AMENITY_CATEGORIES)
    .map(([cat, list]) => ({ cat, items: list.filter(a => property.amenities?.includes(a)) }))
    .filter(c => c.items.length > 0);
  const uncategorized = (property.amenities || []).filter(a => !Object.values(AMENITY_CATEGORIES).flat().includes(a));

  return (
    <div className="min-h-screen" style={{ background: "var(--uber-surface)" }}>

      {/* ── Sticky scroll header ──────────────────────────────────────── */}
      <div
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-200"
        style={{
          background: stickyHeader ? "var(--uber-white)" : "transparent",
          borderBottom: stickyHeader ? "0.5px solid var(--uber-border)" : "none",
          boxShadow: stickyHeader ? "0 2px 16px rgba(0,0,0,0.07)" : "none",
          pointerEvents: stickyHeader ? "all" : "none",
          opacity: stickyHeader ? 1 : 0,
        }}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/homes" className="text-sm font-semibold shrink-0" style={{ color: "var(--uber-green)" }}>← Homes</Link>
            <p className="text-sm font-bold truncate" style={{ color: "var(--uber-text)" }}>{property.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm font-extrabold" style={{ color: "var(--uber-text)" }}>{property.priceLabel}</p>
            {user && profile?.role !== "admin" && property.status !== "rented" && property.status !== "sold" && (
              <button
                onClick={() => setBookingStep("request")}
                className="px-4 py-2 rounded-xl text-sm font-bold"
                style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
              >
                Inquire Now
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-2">
        <nav className="flex items-center gap-1.5 text-xs" style={{ color: "var(--uber-muted)" }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span>›</span>
          <Link href="/homes" className="hover:underline">Homes</Link>
          <span>›</span>
          <span style={{ color: "var(--uber-text)" }} className="font-medium truncate max-w-[200px]">{property.title}</span>
        </nav>
      </div>

      {/* ── Unavailable banner ─────────────────────────────────────────── */}
      {(property.status === "rented" || property.status === "sold") && (
        <div className="max-w-6xl mx-auto px-4 mb-3">
          <div className="rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2" style={{ background: "#FEE2E2", color: "#DC2626" }}>
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
            This property has been {property.status === "rented" ? "rented" : "sold"} and is no longer available.
          </div>
        </div>
      )}

      {/* ── Title + badges ─────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 mb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: "#06C167", color: "#fff" }}>
                {property.forSale ? "For Sale" : "For Rent"} · {property.propertyType}
              </span>
              {property.isVerified && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1" style={{ background: "var(--uber-surface)", color: "var(--uber-green)", border: "0.5px solid var(--uber-green)" }}>
                  <IconCheck className="w-3 h-3" /> Verified
                </span>
              )}
              {property.isSponsored && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded shimmer-gold text-[#1A1A1A] flex items-center gap-1">
                  <IconStar className="w-3 h-3" /> Sponsored
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold leading-tight font-serif" style={{ color: "var(--uber-text)" }}>{property.title}</h1>
            {property.isAgent && property.agentName && (
              <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--uber-green)" }}>Listed by {property.agentName}</p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--uber-muted)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
              <p className="text-sm" style={{ color: "var(--uber-muted)" }}>{property.address}, {property.city}, {property.state}</p>
              <DistanceBadge lat={property.lat} lng={property.lng} />
            </div>
          </div>
          {/* Score badge — Booking.com style */}
          <div className="shrink-0 flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs font-semibold" style={{ color: "var(--uber-muted)" }}>StayMate Pick</p>
              <p className="text-xs" style={{ color: "var(--uber-muted)" }}>Curated listing</p>
            </div>
            <div className="w-12 h-12 rounded-tl-xl rounded-tr-xl rounded-br-xl flex items-center justify-center text-white text-lg font-extrabold" style={{ background: "var(--uber-btn-bg)" }}>
              ✦
            </div>
          </div>
        </div>
      </div>

      {/* ── Photo mosaic ───────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 mb-4">
        <div className="relative rounded-2xl overflow-hidden" style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gridTemplateRows: "1fr 1fr", gap: "4px", height: "420px" }}>
          {/* Main large photo */}
          <div
            className="relative cursor-pointer group"
            style={{ gridRow: "1 / 3" }}
            onClick={() => { setGalleryIndex(0); setGalleryOpen(true); }}
          >
            {images[0] ? (
              <Image src={images[0]} alt={property.title} fill className="object-cover group-hover:brightness-95 transition-all" unoptimized />
            ) : (
              <div className="w-full h-full" style={{ background: "var(--uber-surface2)" }} />
            )}
            {/* Back button */}
            <Link
              href="/homes"
              className="absolute left-3 top-3 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-5 h-5" style={{ color: "var(--uber-text)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            {/* Save */}
            {profile?.role !== "admin" && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleSave(); }}
                className="absolute right-3 top-3 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow active:scale-90 transition-transform z-10"
              >
                <svg className={`w-5 h-5 ${saved ? "text-red-500" : ""}`} style={saved ? undefined : { color: "var(--uber-muted)" }} fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>
            )}
            {property.forSale && (
              <div className="absolute bottom-3 left-3 text-white text-xs font-bold px-2 py-1 rounded-full z-10" style={{ background: "#000" }}>FOR SALE</div>
            )}
          </div>

          {/* 4 smaller photos */}
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="relative cursor-pointer group"
              onClick={() => { setGalleryIndex(i); setGalleryOpen(true); }}
            >
              {images[i] ? (
                <Image src={images[i]} alt={`${property.title} ${i + 1}`} fill className="object-cover group-hover:brightness-95 transition-all" unoptimized />
              ) : (
                <div className="w-full h-full" style={{ background: "var(--uber-surface2)" }} />
              )}
              {/* "Show all" overlay on last thumb */}
              {i === 4 && images.length > 5 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">+{images.length - 5} photos</span>
                </div>
              )}
            </div>
          ))}

          {/* Show all photos button */}
          <button
            onClick={() => setGalleryOpen(true)}
            className="absolute bottom-3 right-3 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 z-10"
            style={{ background: "white", color: "#1A1A1A", border: "0.5px solid rgba(0,0,0,0.15)" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
            Show all photos
          </button>
        </div>
      </div>

      {/* ── 2-column layout ────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pb-24 lg:pb-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── LEFT COLUMN ────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Key specs strip */}
            <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <div className="grid grid-cols-3 divide-x" style={{ borderColor: "var(--uber-border)" }}>
                <div className="flex flex-col items-center gap-1 px-4 py-1">
                  <IconBed className="w-5 h-5" style={{ color: "var(--uber-green)" }} />
                  <p className="text-lg font-extrabold" style={{ color: "var(--uber-text)" }}>{property.beds}</p>
                  <p className="text-xs" style={{ color: "var(--uber-muted)" }}>{property.beds === 1 ? "Bedroom" : "Bedrooms"}</p>
                </div>
                <div className="flex flex-col items-center gap-1 px-4 py-1">
                  <IconShower className="w-5 h-5" style={{ color: "var(--uber-green)" }} />
                  <p className="text-lg font-extrabold" style={{ color: "var(--uber-text)" }}>{property.baths}</p>
                  <p className="text-xs" style={{ color: "var(--uber-muted)" }}>{property.baths === 1 ? "Bathroom" : "Bathrooms"}</p>
                </div>
                <div className="flex flex-col items-center gap-1 px-4 py-1">
                  <IconRuler className="w-5 h-5" style={{ color: "var(--uber-green)" }} />
                  <p className="text-lg font-extrabold" style={{ color: "var(--uber-text)" }}>{property.sqft.toLocaleString()}</p>
                  <p className="text-xs" style={{ color: "var(--uber-muted)" }}>sqft</p>
                </div>
              </div>
            </div>

            {/* Popular facilities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <h2 className="text-base font-bold mb-4" style={{ color: "var(--uber-text)" }}>Most popular facilities</h2>
                <div className="flex flex-wrap gap-3">
                  {property.amenities.slice(0, 8).map((a) => (
                    <div key={a} className="flex items-center gap-2 text-sm" style={{ color: "var(--uber-text)" }}>
                      <span>{AMENITY_ICONS[a] || "✓"}</span>
                      <span>{a}</span>
                    </div>
                  ))}
                  {property.amenities.length > 8 && (
                    <span className="text-sm font-medium" style={{ color: "var(--uber-green)" }}>+{property.amenities.length - 8} more</span>
                  )}
                </div>
              </div>
            )}

            {/* Property description */}
            <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <h2 className="text-base font-bold mb-3" style={{ color: "var(--uber-text)" }}>About this property</h2>
              {property.condition && (
                <div className="flex items-center gap-2 mb-3 p-3 rounded-xl" style={{ background: "var(--uber-surface)" }}>
                  <span className="text-sm">🏗️</span>
                  <p className="text-sm" style={{ color: "var(--uber-text)" }}>
                    <span className="font-semibold">Condition:</span> {property.condition.charAt(0).toUpperCase() + property.condition.slice(1)}
                    {property.furnishing && <> · <span className="font-semibold">Furnishing:</span> {property.furnishing.replace("-", " ")}</>}
                  </p>
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--uber-muted)" }}>{property.description}</p>
              {property.lifestyleTags && property.lifestyleTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4" style={{ borderTop: "0.5px solid var(--uber-border)" }}>
                  {property.lifestyleTags.map((tag) => (
                    <span key={tag} className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: "var(--uber-surface)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Facilities — categorized */}
            {(categorizedAmenities.length > 0 || uncategorized.length > 0) && (
              <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <h2 className="text-base font-bold mb-4" style={{ color: "var(--uber-text)" }}>Facilities</h2>
                <div className="space-y-5">
                  {categorizedAmenities.map(({ cat, items }) => (
                    <div key={cat}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--uber-muted)" }}>{cat}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {items.map((a) => (
                          <div key={a} className="flex items-center gap-2 text-sm" style={{ color: "var(--uber-text)" }}>
                            <svg className="w-4 h-4 shrink-0" style={{ color: "var(--uber-green)" }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                            {a}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {uncategorized.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--uber-muted)" }}>Other</p>
                      <div className="grid grid-cols-2 gap-2">
                        {uncategorized.map((a) => (
                          <div key={a} className="flex items-center gap-2 text-sm" style={{ color: "var(--uber-text)" }}>
                            <svg className="w-4 h-4 shrink-0" style={{ color: "var(--uber-green)" }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                            {a}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Property rules */}
            <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <h2 className="text-base font-bold mb-4" style={{ color: "var(--uber-text)" }}>Property rules</h2>
              <div className="space-y-3">
                {[
                  { icon: "🕐", label: "Move-in", value: "Flexible — by arrangement" },
                  { icon: "📅", label: "Lease term", value: property.forSale ? "Freehold / outright purchase" : "Minimum 6 months" },
                  { icon: "💰", label: "Negotiable", value: property.isNegotiable ? "Yes — price is negotiable" : "No — fixed price" },
                  { icon: "🐾", label: "Pets", value: "Contact owner to confirm" },
                  { icon: "🚬", label: "Smoking", value: "Not permitted indoors" },
                  { icon: "👥", label: "Subletting", value: "Not permitted" },
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
                <p className="text-sm mt-0.5" style={{ color: "var(--uber-muted)" }}>{property.address}, {property.city}, {property.state}</p>
              </div>
              <PropertyMap city={property.city} title={property.address} />
            </div>

            {/* FAQs */}
            <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <h2 className="text-base font-bold mb-4" style={{ color: "var(--uber-text)" }}>Frequently asked questions</h2>
              <div className="space-y-2">
                {FAQ_ITEMS.map((item, i) => (
                  <div key={i} style={{ border: "0.5px solid var(--uber-border)", borderRadius: "12px", overflow: "hidden" }}>
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                      style={{ background: openFaq === i ? "var(--uber-surface)" : "transparent" }}
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    >
                      <p className="text-sm font-semibold pr-4" style={{ color: "var(--uber-text)" }}>{item.q}</p>
                      <svg className={`w-4 h-4 shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} style={{ color: "var(--uber-muted)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </button>
                    {openFaq === i && (
                      <div className="px-4 pb-3">
                        <p className="text-sm leading-relaxed" style={{ color: "var(--uber-muted)" }}>{item.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN — Booking widget (desktop sticky) ─────────── */}
          <div className="lg:w-80 shrink-0">
            <div className="lg:sticky lg:top-20 space-y-3">

              {/* Price + inquiry widget */}
              <div className="rounded-2xl p-5 shadow-lg" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-extrabold" style={{ color: "var(--uber-text)" }}>{property.priceLabel}</p>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>{property.forSale ? "asking price · freehold" : "per month · excluding utilities"}</p>
                  {property.serviceCharge && (
                    <p className="text-xs mt-1" style={{ color: "var(--uber-muted)" }}>Service charge: GH₵{property.serviceCharge.toLocaleString()}/mo</p>
                  )}
                </div>

                {property.status !== "rented" && property.status !== "sold" ? (
                  profile?.role === "admin" ? (
                    adminEditMode ? (
                      <AdminEditPanel
                        property={property}
                        editedProperty={editedProperty || property}
                        onPropertyChange={(key, value) => setEditedProperty({ ...(editedProperty || property), [key]: value })}
                        onSave={handleAdminSaveEdit}
                        onCancel={() => { setAdminEditMode(false); setEditedProperty(null); setEditError(""); }}
                        isSaving={isSavingEdit}
                        error={editError}
                      />
                    ) : (
                      <button
                        onClick={() => { setAdminEditMode(true); setEditedProperty(null); }}
                        className="w-full font-bold text-sm py-3 rounded-2xl"
                        style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
                      >
                        Edit Property Details
                      </button>
                    )
                  ) : user ? (
                    bookingStep === "idle" ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--uber-muted)" }}>Preferred Viewing Date</label>
                          <input
                            type="date"
                            value={viewingDate}
                            onChange={e => setViewingDate(e.target.value)}
                            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                            style={{ background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--uber-muted)" }}>Message (optional)</label>
                          <textarea
                            value={bookingMessage}
                            onChange={e => setBookingMessage(e.target.value)}
                            placeholder="Hello, I am interested in this property..."
                            rows={3}
                            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                            style={{ background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
                          />
                        </div>
                        {bookingError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{bookingError}</p>}
                        <button
                          onClick={handleBookConfirm}
                          disabled={isProcessing}
                          className="w-full font-bold text-sm py-3.5 rounded-2xl disabled:opacity-70 flex items-center justify-center gap-2"
                          style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
                        >
                          {isProcessing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</> : "Request to Book / Inquire"}
                        </button>
                        <button onClick={() => { setViewingDate(""); setBookingMessage(""); }} className="w-full text-xs py-1" style={{ color: "var(--uber-muted)" }}>Clear form</button>
                      </div>
                    ) : null
                  ) : (
                    <Link href="/login">
                      <button className="w-full font-bold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2" style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
                        Log in to Inquire
                      </button>
                    </Link>
                  )
                ) : (
                  <div className="rounded-xl px-4 py-3 text-sm font-bold text-center" style={{ background: "#FEE2E2", color: "#DC2626" }}>
                    No longer available
                  </div>
                )}

                {/* What's included */}
                <div className="mt-4 pt-4 space-y-2" style={{ borderTop: "0.5px solid var(--uber-border)" }}>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--uber-muted)" }}>What's included</p>
                  {["Free concierge service", "Viewing coordination", "Direct owner contact", "No hidden commission"].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--uber-green)" }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      <p className="text-xs" style={{ color: "var(--uber-muted)" }}>{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sponsor boost widget (owner only) */}
              {user && property.ownerId === user.id && profile?.role !== "admin" && (
                property.isSponsored ? (
                  <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(212,175,55,0.08)", border: "0.5px solid rgba(212,175,55,0.3)" }}>
                    <div className="flex items-center gap-2">
                      <IconStar className="w-4 h-4" style={{ color: "#D4AF37" }} />
                      <div>
                        <p className="text-xs font-bold" style={{ color: "var(--uber-text)" }}>Sponsored until</p>
                        <p className="text-xs" style={{ color: "var(--uber-muted)" }}>{new Date(property.sponsoredUntil || "").toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSponsor(true)}
                    className="w-full font-bold text-sm py-3 rounded-2xl flex items-center justify-center gap-2"
                    style={{ background: "#D4AF37", color: "#fff" }}
                  >
                    <IconStar className="w-4 h-4" /> Boost This Listing
                  </button>
                )
              )}

              {/* Concierge assurance box */}
              <div className="rounded-2xl px-4 py-4" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-base" style={{ background: "var(--uber-surface)" }}>🛡️</div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>StayMate Guarantee</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--uber-muted)" }}>We verify every listing. If the property doesn't match its description, we'll help you find an alternative.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky CTA ──────────────────────────────────────────── */}
      {property.status !== "rented" && property.status !== "sold" && (
        <div className="lg:hidden fixed left-0 right-0 bottom-nav-offset z-40 px-4 py-3" style={{ background: "var(--uber-white)", borderTop: "0.5px solid var(--uber-border)" }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-extrabold" style={{ color: "var(--uber-text)" }}>{property.priceLabel}</p>
              <p className="text-xs" style={{ color: "var(--uber-muted)" }}>{property.forSale ? "asking price" : "per month"}</p>
            </div>
            {user && profile?.role !== "admin" ? (
              <button
                onClick={() => { const el = document.querySelector(".lg\\:w-80"); el?.scrollIntoView({ behavior: "smooth" }); setBookingStep("request"); }}
                className="px-5 py-3 rounded-2xl font-bold text-sm flex-shrink-0"
                style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
              >
                Request to Book
              </button>
            ) : !user ? (
              <Link href="/login">
                <button className="px-5 py-3 rounded-2xl font-bold text-sm" style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>
                  Log in to Inquire
                </button>
              </Link>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Full-screen gallery lightbox ───────────────────────────────── */}
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

      {/* Sponsor modal */}
      {user && property.ownerId === user.id && (
        <SponsorModal
          open={showSponsor}
          onClose={() => setShowSponsor(false)}
          onSuccess={() => { setShowSponsor(false); setProperty({ ...property, isSponsored: true, sponsoredUntil: new Date(Date.now() + 10 * 86400000).toISOString() }); }}
          propertyId={property.id}
          propertyType="homes"
          propertyTitle={property.title}
          userEmail={user.email ?? ""}
          userId={user.id}
        />
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: "var(--uber-surface)" }}>
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="h-3 w-48 rounded mb-4" style={{ background: "var(--uber-surface2)" }} />
        <div className="h-7 w-3/4 rounded mb-2" style={{ background: "var(--uber-surface2)" }} />
        <div className="h-4 w-1/2 rounded mb-4" style={{ background: "var(--uber-surface2)" }} />
        <div className="h-96 rounded-2xl mb-4 animate-pulse" style={{ background: "var(--uber-surface2)" }} />
        <div className="flex gap-4">
          <div className="flex-1 space-y-4">
            <div className="h-24 rounded-2xl" style={{ background: "var(--uber-surface2)" }} />
            <div className="h-40 rounded-2xl" style={{ background: "var(--uber-surface2)" }} />
            <div className="h-56 rounded-2xl" style={{ background: "var(--uber-surface2)" }} />
          </div>
          <div className="w-80 space-y-4 hidden lg:block">
            <div className="h-64 rounded-2xl" style={{ background: "var(--uber-surface2)" }} />
            <div className="h-24 rounded-2xl" style={{ background: "var(--uber-surface2)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Booking success ────────────────────────────────────────────────────────────
function BookingSuccessScreen({ property, viewingDate, onBack }: { property: Property; viewingDate: string; onBack: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: "var(--uber-btn-bg)" }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: "var(--uber-btn-text)/20" }}>
        <svg className="w-10 h-10" style={{ color: "var(--uber-btn-text)" }} fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h1 className="text-3xl font-extrabold mb-2" style={{ color: "var(--uber-btn-text)" }}>Request Sent!</h1>
      <p className="mb-8 max-w-xs font-medium" style={{ color: "var(--uber-btn-text)", opacity: 0.7 }}>
        Your inquiry for {property.title} has been sent. We'll be in touch shortly.
      </p>
      <div className="rounded-2xl p-6 w-full max-w-xs mb-8 shadow-xl text-left" style={{ background: "var(--uber-white)" }}>
        <div className="mb-4">
          <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--uber-muted)" }}>Status</p>
          <p className="font-bold" style={{ color: "var(--uber-text)" }}>Pending Review</p>
        </div>
        {viewingDate && (
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--uber-muted)" }}>Preferred Viewing Date</p>
            <p className="font-bold" style={{ color: "var(--uber-text)" }}>{new Date(viewingDate).toLocaleDateString()}</p>
          </div>
        )}
      </div>
      <button onClick={onBack} className="font-bold py-3.5 px-8 rounded-xl text-sm" style={{ background: "var(--uber-white)", color: "var(--uber-text)" }}>
        Back to Listing
      </button>
    </div>
  );
}

// ── Admin edit panel ───────────────────────────────────────────────────────────
function AdminEditPanel({ property, editedProperty, onPropertyChange, onSave, onCancel, isSaving, error }: {
  property: Property; editedProperty: Partial<Property>; onPropertyChange: (key: string, value: any) => void;
  onSave: () => void; onCancel: () => void; isSaving: boolean; error: string;
}) {
  const amenities = editedProperty.amenities || [];
  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      <h3 className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>Edit Property</h3>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-medium">{error}</div>}
      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--uber-text)" }}>Title</label>
        <input type="text" value={editedProperty.title || ""} onChange={(e) => onPropertyChange("title", e.target.value)} className="w-full rounded-lg px-2 py-2 text-xs focus:outline-none" style={{ border: "0.5px solid var(--uber-border)", color: "var(--uber-text)", background: "var(--uber-surface)" }} />
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--uber-text)" }}>Price (GH₵)</label>
        <input type="number" value={editedProperty.price || 0} onChange={(e) => { const price = parseInt(e.target.value) || 0; onPropertyChange("price", price); onPropertyChange("price_label", `GH₵${price.toLocaleString()}${editedProperty.forSale ? "" : "/mo"}`); }} className="w-full rounded-lg px-2 py-2 text-xs focus:outline-none" style={{ border: "0.5px solid var(--uber-border)", color: "var(--uber-text)", background: "var(--uber-surface)" }} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["beds", "baths", "sqft"] as const).map((key) => (
          <div key={key}>
            <label className="block text-xs font-semibold mb-1 capitalize" style={{ color: "var(--uber-text)" }}>{key}</label>
            <input type="number" value={(editedProperty as any)[key] || 0} onChange={(e) => onPropertyChange(key, parseInt(e.target.value) || 0)} className="w-full rounded-lg px-2 py-2 text-xs focus:outline-none" style={{ border: "0.5px solid var(--uber-border)", color: "var(--uber-text)", background: "var(--uber-surface)" }} />
          </div>
        ))}
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--uber-text)" }}>Description</label>
        <textarea rows={3} value={editedProperty.description || ""} onChange={(e) => onPropertyChange("description", e.target.value)} className="w-full rounded-lg px-2 py-2 text-xs focus:outline-none resize-none" style={{ border: "0.5px solid var(--uber-border)", color: "var(--uber-text)", background: "var(--uber-surface)" }} />
      </div>
      <div>
        <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--uber-text)" }}>Amenities</label>
        <div className="flex flex-wrap gap-1">
          {["AC", "Generator", "Pool", "Security", "Parking", "Furnished", "WiFi", "CCTV", "Borehole"].map((a) => (
            <button key={a} onClick={() => onPropertyChange("amenities", amenities.includes(a) ? amenities.filter((x) => x !== a) : [...amenities, a])} className="text-[10px] font-medium px-2 py-1 rounded-full transition-colors" style={amenities.includes(a) ? { background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" } : { background: "var(--uber-surface)", color: "var(--uber-muted)" }}>{a}</button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} disabled={isSaving} className="flex-1 font-bold py-2 rounded-lg text-xs" style={{ background: "var(--uber-surface)", color: "var(--uber-muted)" }}>Cancel</button>
        <button onClick={onSave} disabled={isSaving} className="flex-1 font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1" style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>
          {isSaving ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</> : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
