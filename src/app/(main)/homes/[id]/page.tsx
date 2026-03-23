"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getHomeById } from "@/lib/api";
import { addSaved, removeSaved, isSaved } from "@/lib/saved-store";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Property } from "@/lib/types";
import PropertyMap from "@/components/ui/PropertyMap";
import DistanceBadge from "@/components/ui/DistanceBadge";
import ImageGallery from "@/components/ui/ImageGallery";
import SponsorModal from "@/components/ui/SponsorModal";

interface Props {
  params: Promise<{ id: string }>;
}

export default function HomeDetailPage({ params }: Props) {
  const { user, profile } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [saved, setSaved] = useState(false);

  const [bookingStep, setBookingStep] = useState<"idle" | "request" | "success">("idle");
  const [viewingDate, setViewingDate] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Sponsor modal
  const [showSponsor, setShowSponsor] = useState(false);

  // Admin edit mode
  const [adminEditMode, setAdminEditMode] = useState(false);
  const [editedProperty, setEditedProperty] = useState<Partial<Property> | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  useEffect(() => {
    params.then(({ id }) => {
      getHomeById(id).then((p) => {
        if (!p) { setNotFoundFlag(true); return; }
        setProperty(p);
        setSaved(isSaved(p.id));
      });
    });
  }, [params]);

  if (notFoundFlag) notFound();

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="animate-pulse space-y-4 w-full px-4">
          <div className="h-72 rounded-2xl" style={{ background: "var(--uber-surface2)" }} />
          <div className="h-6 rounded w-2/3" style={{ background: "var(--uber-surface2)" }} />
          <div className="h-4 rounded w-1/2" style={{ background: "var(--uber-surface2)" }} />
        </div>
      </div>
    );
  }

  if (bookingStep === "success") {
    return <BookingSuccessScreen property={property} viewingDate={viewingDate} onBack={() => { setBookingStep("idle"); setViewingDate(""); setBookingMessage(""); }} />;
  }

  async function handleBookConfirm() {
    if (!property || !user || isProcessing) return;
    setIsProcessing(true);
    setBookingError("");

    const messageContent = `[INQUIRY_IMAGE:${property.images?.[0] ?? ""}]\n[Inquiry for: ${property.title}]\n\n${bookingMessage || ""}`;

    // 1. Save inquiry to 'bookings' table
    const { error: bookingError } = await supabase.from("bookings").insert({
      user_id: user.id,
      property_type: "home",
      property_id: "00000000-0000-0000-0000-000000000001", // Dummy UUID since mock items use strings
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
        // Anchor conversation to this property
        await supabase.from("conversations").update({
          property_id: property.id,
          property_type: "home",
          property_title: property.title,
          property_image: property.images?.[0] ?? null,
          updated_at: new Date().toISOString(),
        }).eq("id", conv.id);

        await supabase.from("messages").insert({
          conversation_id: conv.id,
          sender_id: user.id,
          content: messageContent,
          is_read: false,
        });
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
            title: "New Inquiry 🏠",
            body: `New inquiry for: ${property.title}`,
            url: "/chat",
          }),
        });
      }
    } catch (_) { }

    setIsProcessing(false);
    setBookingStep("success");
  }

  function toggleSave() {
    if (!property) return;
    if (saved) {
      removeSaved(property.id);
      setSaved(false);
    } else {
      addSaved(property.id, "home");
      setSaved(true);
    }
  }

  async function handleAdminSaveEdit() {
    if (!property || !editedProperty || isSavingEdit) return;
    setIsSavingEdit(true);
    setEditError("");

    try {
      const { error } = await supabase.from("homes").update(editedProperty).eq("id", property.id);
      if (error) throw error;

      // Update local state
      setProperty({ ...property, ...editedProperty });
      setAdminEditMode(false);
      setEditedProperty(null);
    } catch (err: any) {
      console.error("Edit error:", err);
      setEditError(err.message || "Failed to save changes");
    } finally {
      setIsSavingEdit(false);
    }
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--background)" }}>
      {/* Photo Gallery */}
      <ImageGallery images={property.images || []} alt={property.title} heightClass="h-72">
        <Link
          href="/homes"
          className="absolute left-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow z-10"
          style={{ top: "calc(env(safe-area-inset-top, 12px) + 12px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-5 h-5" style={{ color: "var(--uber-text)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        {profile?.role !== "admin" && (
        <button
          onClick={(e) => { e.stopPropagation(); toggleSave(); }}
          className="absolute right-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow active:scale-90 transition-transform z-10"
          style={{ top: "calc(env(safe-area-inset-top, 12px) + 12px)" }}
        >
          <svg
            className={`w-5 h-5 transition-colors ${saved ? "text-red-500" : ""}`}
            style={saved ? undefined : { color: "var(--uber-muted)" }}
            fill={saved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
        )}
        {property.forSale && (
          <div className="absolute bottom-8 right-4 text-white text-xs font-bold px-2 py-1 rounded-full z-10" style={{ background: "#000000" }}>
            FOR SALE
          </div>
        )}
      </ImageGallery>

      {/* Closed banner */}
      {(property.status === "rented" || property.status === "sold") && (
        <div className="px-4 py-3 text-center font-bold text-sm" style={{ background: "#FEE2E2", color: "#DC2626" }}>
          This property has been {property.status === "rented" ? "rented" : "sold"} and is no longer available.
        </div>
      )}

      {/* Main info */}
      <div className="px-4 pt-4 pb-3 shadow-sm" style={{ background: "var(--uber-white)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[11px] font-bold uppercase text-[#06C167] bg-[#06C167]/10 px-2 py-0.5 rounded w-fit capitalize">
                {property.propertyType}
              </p>
              {property.isVerified && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "#06C167", color: "#fff" }}>
                  ✓ Verified by StayMate
                </span>
              )}
              {property.isSponsored && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded shimmer-gold text-[#1A1A1A]">
                  ✦ Sponsored
                </span>
              )}
            </div>
            {property.isAgent && property.agentName && (
              <p className="text-xs font-semibold mt-1" style={{ color: "var(--uber-green)" }}>
                Listed by {property.agentName}
              </p>
            )}
            <h1 className="text-xl font-extrabold mt-1 leading-tight font-serif" style={{ color: "var(--uber-text)" }}>{property.title}</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--uber-muted)" }}>{property.address}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm" style={{ color: "var(--uber-muted)" }}>{property.city}, {property.state}</p>
              <DistanceBadge lat={property.lat} lng={property.lng} />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-extrabold" style={{ color: "var(--uber-text)" }}>{property.priceLabel}</p>
            <p className="text-xs" style={{ color: "var(--uber-muted)" }}>{property.forSale ? "asking price" : "per month"}</p>
          </div>
        </div>

        {/* Specs */}
        <div className="flex items-center gap-4 mt-3 pt-3 text-sm" style={{ color: "var(--uber-muted)", borderTop: "0.5px solid var(--uber-border)" }}>
          <span className="flex items-center gap-1">
            <span className="text-base">🛏</span> {property.beds} {property.beds === 1 ? "bed" : "beds"}
          </span>
          <span className="flex items-center gap-1">
            <span className="text-base">🚿</span> {property.baths} {property.baths === 1 ? "bath" : "baths"}
          </span>
          <span className="flex items-center gap-1">
            <span className="text-base">📐</span> {property.sqft.toLocaleString()} sqft
          </span>
        </div>
      </div>

      {/* Amenities */}

      {/* Map */}
      <div className="px-4 py-4">
        <PropertyMap city={property.city} title={property.address} />
      </div>
      {property.amenities && property.amenities.length > 0 && (
        <div className="px-4 py-4">
          <h2 className="text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {property.amenities.map((amenity) => (
              <span
                key={amenity}
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{ background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>About this property</h2>
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--uber-muted)" }}>{property.description}</p>
      </div>

      {/* CTA — sticky bottom (hidden when closed) */}
      {property.status !== "rented" && property.status !== "sold" && (
      <div className="fixed bottom-16 left-0 right-0 px-4 py-3 space-y-2 max-w-lg mx-auto z-40" style={{ background: "var(--uber-white)", borderTop: "0.5px solid var(--uber-border)" }}>
        {/* Owner sponsor button */}
        {user && property.ownerId === user.id && profile?.role !== "admin" && (
          property.isSponsored ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(212,175,55,0.08)", border: "0.5px solid rgba(212,175,55,0.3)" }}>
              <span style={{ color: "#D4AF37" }}>✦</span>
              <p className="text-xs font-bold" style={{ color: "var(--uber-text)" }}>
                Sponsored until {new Date(property.sponsoredUntil || "").toLocaleDateString()}
              </p>
            </div>
          ) : (
            <button
              onClick={() => setShowSponsor(true)}
              className="w-full font-bold text-sm py-3 rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2"
              style={{ background: "#D4AF37", color: "#fff" }}
            >
              <span>✦</span> Boost This Listing
            </button>
          )
        )}
        {profile?.role === "admin" ? (
          // Admin view: edit panel
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
              className="w-full font-bold text-base py-3.5 rounded-2xl active:scale-95 transition-transform"
              style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
            >
              Edit Property Details
            </button>
          )
        ) : user ? (
          bookingStep === "idle" ? (
            <button
              onClick={() => setBookingStep("request")}
              className="w-full font-bold text-base py-3.5 rounded-2xl active:scale-95 transition-transform"
              style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
            >
              Request to Book / Inquire
            </button>
          ) : bookingStep === "request" ? (
            <div className="rounded-2xl p-4 shadow-xl absolute bottom-full left-4 right-4 mb-4" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: "var(--uber-text)" }}>Send Inquiry</h3>
              <div className="mb-4 space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--uber-muted)" }}>Preferred Viewing Date (Optional)</label>
                  <input type="date" value={viewingDate} onChange={e => setViewingDate(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--uber-muted)" }}>Message for Agent</label>
                  <textarea
                    value={bookingMessage}
                    onChange={e => setBookingMessage(e.target.value)}
                    placeholder="Hello, I am interested in this property..."
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
              Log in to Inquire
            </button>
          </Link>
        )}
      </div>
      )}

      {/* Sponsor modal for owners */}
      {user && property.ownerId === user.id && (
        <SponsorModal
          open={showSponsor}
          onClose={() => setShowSponsor(false)}
          onSuccess={() => {
            setShowSponsor(false);
            setProperty({ ...property, isSponsored: true, sponsoredUntil: new Date(Date.now() + 10 * 86400000).toISOString() });
          }}
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

function BookingSuccessScreen({ property, viewingDate, onBack }: {
  property: Property;
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
        Your inquiry for {property.title} has been sent successfully. We will be in touch shortly.
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
        Back to Listing
      </button>
    </div>
  );
}

function AdminEditPanel({
  property,
  editedProperty,
  onPropertyChange,
  onSave,
  onCancel,
  isSaving,
  error,
}: {
  property: Property;
  editedProperty: Partial<Property>;
  onPropertyChange: (key: string, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  error: string;
}) {
  const amenities = editedProperty.amenities || [];

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      <h3 className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>Edit Property</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-medium">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--uber-text)" }}>Title</label>
        <input
          type="text"
          value={editedProperty.title || ""}
          onChange={(e) => onPropertyChange("title", e.target.value)}
          className="w-full rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-black/20" style={{ border: "0.5px solid var(--uber-border)", color: "var(--uber-text)", background: "var(--uber-surface)" }}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--uber-text)" }}>Price (GH₵)</label>
        <input
          type="number"
          value={editedProperty.price || 0}
          onChange={(e) => {
            const price = parseInt(e.target.value) || 0;
            onPropertyChange("price", price);
            onPropertyChange("price_label", `GH₵${price.toLocaleString()}${editedProperty.for_sale ? "" : "/mo"}`);
          }}
          className="w-full rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-black/20" style={{ border: "0.5px solid var(--uber-border)", color: "var(--uber-text)", background: "var(--uber-surface)" }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--uber-text)" }}>Beds</label>
          <input
            type="number"
            value={editedProperty.beds || 0}
            onChange={(e) => onPropertyChange("beds", parseInt(e.target.value) || 0)}
            className="w-full rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-black/20" style={{ border: "0.5px solid var(--uber-border)", color: "var(--uber-text)", background: "var(--uber-surface)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--uber-text)" }}>Baths</label>
          <input
            type="number"
            value={editedProperty.baths || 0}
            onChange={(e) => onPropertyChange("baths", parseInt(e.target.value) || 0)}
            className="w-full rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-black/20" style={{ border: "0.5px solid var(--uber-border)", color: "var(--uber-text)", background: "var(--uber-surface)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--uber-text)" }}>Sqft</label>
          <input
            type="number"
            value={editedProperty.sqft || 0}
            onChange={(e) => onPropertyChange("sqft", parseInt(e.target.value) || 0)}
            className="w-full rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-black/20" style={{ border: "0.5px solid var(--uber-border)", color: "var(--uber-text)", background: "var(--uber-surface)" }}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--uber-text)" }}>Description</label>
        <textarea
          rows={3}
          value={editedProperty.description || ""}
          onChange={(e) => onPropertyChange("description", e.target.value)}
          className="w-full rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-black/20 resize-none" style={{ border: "0.5px solid var(--uber-border)", color: "var(--uber-text)", background: "var(--uber-surface)" }}
        />
      </div>

      <div>
        <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--uber-text)" }}>Amenities</label>
        <div className="flex flex-wrap gap-1">
          {["AC", "Generator", "Pool", "Security", "Parking", "Furnished", "WiFi", "CCTV", "Borehole"].map((a) => (
            <button
              key={a}
              onClick={() => {
                if (amenities.includes(a)) {
                  onPropertyChange("amenities", amenities.filter((x) => x !== a));
                } else {
                  onPropertyChange("amenities", [...amenities, a]);
                }
              }}
              className="text-[10px] font-medium px-2 py-1 rounded-full transition-colors"
              style={
                amenities.includes(a)
                  ? { background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }
                  : { background: "var(--uber-surface)", color: "var(--uber-muted)" }
              }
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 font-bold py-2 rounded-lg text-xs active:scale-95 disabled:opacity-60"
          style={{ background: "var(--uber-surface)", color: "var(--uber-muted)" }}
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 font-bold py-2 rounded-lg text-xs active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1"
          style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
        >
          {isSaving ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </div>
  );
}
