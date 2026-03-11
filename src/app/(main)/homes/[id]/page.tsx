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
import DistanceBadge from "@/components/ui/DistanceBadge";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full px-4">
          <div className="h-72 bg-gray-200 rounded-2xl" />
          <div className="h-6 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
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
    
    const messageContent = `[Inquiry for: ${property.title}]\n\n${bookingMessage || ""}`;
    
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
      // We don't fail the whole booking if just the chat message fails
    }

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

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Photo */}
      <div className="relative h-72">
        <Image
          src={property.images[0] || ""}
          alt={property.title}
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
        <Link
          href="/homes"
          className="absolute top-12 left-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        {/* Save button — hidden for admin */}
        {profile?.role !== "admin" && (
        <button
          onClick={toggleSave}
          className="absolute top-12 right-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow active:scale-90 transition-transform"
        >
          <svg
            className={`w-5 h-5 transition-colors ${saved ? "text-red-500" : "text-gray-400"}`}
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
          <div className="absolute bottom-4 right-4 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            FOR SALE
          </div>
        )}
      </div>

      {/* Main info */}
      <div className="bg-white px-4 pt-4 pb-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded w-fit capitalize">
              {property.propertyType}
            </p>
            <h1 className="text-xl font-extrabold text-gray-900 mt-1 leading-tight">{property.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{property.address}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-gray-400">{property.city}, {property.state}</p>
              <DistanceBadge lat={property.lat} lng={property.lng} />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-extrabold text-emerald-600">{property.priceLabel}</p>
            <p className="text-xs text-gray-400">{property.forSale ? "asking price" : "per month"}</p>
          </div>
        </div>

        {/* Specs */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 text-sm text-gray-600">
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
      {property.amenities && property.amenities.length > 0 && (
        <div className="px-4 py-4">
          <h2 className="text-sm font-bold text-gray-900 mb-2">Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {property.amenities.map((amenity) => (
              <span
                key={amenity}
                className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full font-medium"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-bold text-gray-900 mb-2">About this property</h2>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{property.description}</p>
      </div>

      {/* CTA — sticky bottom */}
      <div className="fixed bottom-16 left-0 right-0 px-4 py-3 bg-white border-t border-gray-100 space-y-2 max-w-lg mx-auto z-40">
        {user ? (
          bookingStep === "idle" ? (
            <button
              onClick={() => setBookingStep("request")}
              className="w-full bg-emerald-500 text-white font-bold text-base py-3.5 rounded-2xl active:scale-95 transition-transform"
            >
              Request to Book / Inquire
            </button>
          ) : bookingStep === "request" ? (
            <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xl absolute bottom-full left-4 right-4 mb-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Send Inquiry</h3>
              <div className="mb-4 space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Preferred Viewing Date (Optional)</label>
                  <input type="date" value={viewingDate} onChange={e => setViewingDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Message for Agent</label>
                  <textarea 
                    value={bookingMessage} 
                    onChange={e => setBookingMessage(e.target.value)} 
                    placeholder="Hello, I am interested in this property..."
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 resize-none" 
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
                  className="flex-1 bg-emerald-500 text-white font-bold py-3 rounded-xl active:scale-95 disabled:opacity-70 text-sm flex items-center justify-center gap-2"
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
            <button className="w-full bg-emerald-500 text-white font-bold text-base py-3.5 rounded-2xl active:scale-95 transition-transform shadow-sm flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
              Log in to Inquire
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}

function BookingSuccessScreen({ property, viewingDate, onBack }: { 
  property: Property; 
  viewingDate: string;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-emerald-500 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h1 className="text-3xl font-extrabold mb-2">Request Sent!</h1>
      <p className="text-emerald-100 font-medium mb-8 max-w-xs">
        Your inquiry for {property.title} has been sent successfully. An agent will be in touch shortly.
      </p>
      
      <div className="bg-white text-emerald-900 rounded-2xl p-6 w-full max-w-xs mb-8 shadow-xl text-left">
        <div className="mb-4">
          <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Status</p>
          <p className="font-bold text-gray-900">Pending Agent Review</p>
        </div>
        {viewingDate && (
          <div>
            <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Preferred Date</p>
            <p className="font-bold text-gray-900">{new Date(viewingDate).toLocaleDateString()}</p>
          </div>
        )}
      </div>
      
      <button onClick={onBack} className="bg-emerald-600 font-bold py-3.5 px-8 rounded-xl active:scale-95 text-sm transition-transform shadow-sm">
        Back to Listing
      </button>
    </div>
  );
}
