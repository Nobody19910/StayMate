"use client";

import { useState, useEffect } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { getHomeById } from "@/lib/api";
import { addSaved, removeSaved, isSaved } from "@/lib/saved-store";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Property } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default function HomeDetailPage({ params }: Props) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bookingStep, setBookingStep] = useState<"idle" | "dateTime" | "payment" | "success">("idle");
  const [viewingDate, setViewingDate] = useState("");
  const [viewingTime, setViewingTime] = useState("");
  const [ticketCode, setTicketCode] = useState("");
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
    return <BookingSuccessScreen property={property} ticketCode={ticketCode} viewingDate={viewingDate} viewingTime={viewingTime} onBack={() => { setBookingStep("idle"); setTicketCode(""); }} />;
  }

  async function handleBookConfirm() {
    if (!property || !user || isProcessing) return;
    setIsProcessing(true);
    setBookingError("");
    
    // 1. Simulate payment delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 2. Generate Ticket Code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // 3. Save booking
    const { error } = await supabase.from("bookings").insert({
      listing_id: property.id,
      listing_type: "home",
      listing_title: property.title,
      seeker_id: user.id,
      seeker_name: profile?.fullName ?? user.email ?? "Unknown",
      seeker_email: user.email ?? "",
      seeker_phone: profile?.phone ?? null,
      price_label: property.priceLabel,
      owner_id: property.ownerId,
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
          src={property.images[0]}
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
        {/* Save button */}
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
            <p className="text-sm text-gray-400">{property.city}, {property.state}</p>
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
        <p className="text-sm text-gray-600 leading-relaxed">{property.description}</p>
      </div>

      {/* CTA — sticky bottom */}
      <div className="fixed bottom-16 left-0 right-0 px-4 py-3 bg-white border-t border-gray-100 space-y-2 max-w-lg mx-auto z-40">
        {user ? (
          bookingStep === "idle" ? (
            <button
              onClick={() => setBookingStep("dateTime")}
              className="w-full bg-emerald-500 text-white font-bold text-base py-3.5 rounded-2xl active:scale-95 transition-transform"
            >
              Book a Viewing
            </button>
          ) : bookingStep === "dateTime" ? (
            <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xl absolute bottom-full left-4 right-4 mb-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Schedule Viewing</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Date</label>
                  <input type="date" value={viewingDate} onChange={e => setViewingDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Time</label>
                  <input type="time" value={viewingTime} onChange={e => setViewingTime(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500" required />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setBookingStep("idle")} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl active:scale-95 text-sm">Cancel</button>
                <button 
                  disabled={!viewingDate || !viewingTime} 
                  onClick={() => setBookingStep("payment")} 
                  className="flex-1 bg-emerald-500 text-white font-bold py-3 rounded-xl active:scale-95 disabled:opacity-50 text-sm"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : bookingStep === "payment" ? (
            <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xl absolute bottom-full left-4 right-4 mb-4">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Commitment Fee</h3>
              <p className="text-xs text-gray-500 mb-4">A refundable fee of GH₵50 is required to secure your viewing and deter spam.</p>
              
              <div className="bg-emerald-50 rounded-xl p-3 mb-4 flex justify-between items-center border border-emerald-100 border-dashed">
                <span className="text-sm font-bold text-emerald-800">Viewing Fee</span>
                <span className="text-lg font-extrabold text-emerald-600">GH₵ 50.00</span>
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
            className="w-full bg-emerald-500 text-white font-bold text-base py-3.5 rounded-2xl active:scale-95 transition-transform"
          >
            Sign In to Book Viewing
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

function BookingSuccessScreen({ property, ticketCode, viewingDate, viewingTime, onBack }: { property: Property; ticketCode: string; viewingDate: string; viewingTime: string; onBack: () => void }) {
  const displayDate = viewingDate ? new Date(viewingDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : "";

  return (
    <motion.div
      className="min-h-screen bg-gray-50 flex flex-col pb-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-emerald-500 px-4 pt-16 pb-24 text-center rounded-b-[40px] shadow-sm relative overflow-hidden">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <span className="text-3xl">🎫</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white">Viewing Booked!</h1>
        <p className="text-emerald-50 text-sm mt-1 font-medium max-w-xs mx-auto">
          Your viewing for {property.title} has been confirmed.
        </p>
      </div>

      <div className="px-4 -mt-16 relative z-10 flex-1 flex flex-col items-center">
        {/* The Ticket */}
        <div className="bg-white w-full max-w-sm rounded-[32px] shadow-xl border border-gray-100 p-6 flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-1/2 -left-3 w-6 h-6 bg-gray-50 rounded-full border-r border-gray-200" />
          <div className="absolute top-1/2 -right-3 w-6 h-6 bg-gray-50 rounded-full border-l border-gray-200" />
          <div className="absolute top-1/2 left-4 right-4 h-px border-b-2 border-dashed border-gray-200" />

          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">StayMate Direct</p>
          <p className="text-sm font-bold text-gray-900 text-center line-clamp-2 mb-8">{property.address}</p>
          
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
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest text-center mb-1">Your Viewing Code</p>
            <div className="bg-gray-100 rounded-2xl px-8 py-3 tracking-[0.3em] font-mono text-3xl font-black text-gray-900">
              {ticketCode}
            </div>
          </div>
          <p className="text-[10px] font-medium text-gray-400 text-center mt-2 px-4">
            Show this code to the StayMate Field Agent or Landlord upon arrival.
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
