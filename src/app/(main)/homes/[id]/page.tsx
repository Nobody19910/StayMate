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
  const [booked, setBooked] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");

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

  if (booked) {
    return <BookingSuccessScreen property={property} onBack={() => setBooked(false)} />;
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

      {/* CTA — sticky bottom, above bottom nav */}
      <div className="fixed bottom-16 left-0 right-0 px-4 py-3 bg-white border-t border-gray-100 space-y-2 max-w-lg mx-auto">
        {user ? (
          <button
            disabled={booking}
            onClick={async () => {
              if (!property || !user || booking) return;
              setBooking(true);
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
              });
              setBooking(false);
              if (error) {
                console.error("Booking error:", error);
                setBookingError(error.message);
              } else {
                setBooked(true);
              }
            }}
            className="w-full bg-emerald-500 text-white font-bold text-base py-3.5 rounded-2xl active:scale-95 transition-transform disabled:opacity-60"
          >
            {booking ? "Freezing…" : `Request to Freeze Property — ${property.priceLabel}`}
          </button>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-emerald-500 text-white font-bold text-base py-3.5 rounded-2xl active:scale-95 transition-transform"
          >
            Sign In to Freeze Property
          </button>
        )}
        {bookingError && (
          <p className="text-center text-xs text-red-500 font-medium">{bookingError}</p>
        )}
        <p className="text-center text-xs text-gray-400">
          No agents. No commission. Direct owner contact after freeze.
        </p>
      </div>
    </div>
  );
}

function BookingSuccessScreen({ property, onBack }: { property: Property; onBack: () => void }) {
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
      <div className="bg-emerald-600 px-4 pt-14 pb-8 text-white text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-xl font-extrabold">Property Frozen!</h1>
        <p className="text-emerald-100 text-sm mt-1">{property.title}</p>
        <p className="text-emerald-200 text-xs mt-0.5">{property.address}</p>
        <div className="mt-3 bg-white/15 rounded-xl px-4 py-2 inline-block">
          <p className="text-xs text-emerald-100">Hold expires at</p>
          <p className="text-lg font-bold">{expiryStr} today</p>
          <p className="text-[10px] text-emerald-200">2-hour hold — call owner to confirm</p>
        </div>
      </div>

      {/* Next Steps */}
      <div className="px-4 py-6 flex-1">
        <h2 className="text-sm font-bold text-gray-900 mb-4">What happens next?</h2>

        <div className="space-y-3">
          {/* Step 1: Call Owner */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold text-emerald-600">1</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Contact the Owner</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Your interest has been noted. Call the owner directly to discuss and confirm.
                </p>
                {property.ownerPhone && (
                  <a
                    href={`tel:${property.ownerPhone}`}
                    className="mt-3 flex items-center justify-center gap-2 w-full bg-emerald-500 text-white font-bold text-sm py-3 rounded-xl active:scale-95 transition-transform"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    Call Owner Now
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Arrange viewing */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold text-gray-500">2</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Arrange a Viewing</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Agree on a time to inspect the property in person before any payment.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: No commission */}
          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold text-emerald-600">3</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-800">No Agent. No Commission.</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  All rent goes directly to the owner. StayMate earns nothing on the transaction.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Expiry warning */}
        <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-amber-500 text-sm">⏱</span>
          <p className="text-xs text-amber-700 font-medium">
            Property hold expires at {expiryStr} — call owner before then
          </p>
        </div>
      </div>

      {/* Back button */}
      <div className="px-4 py-4 border-t border-gray-100 bg-white">
        <button
          onClick={onBack}
          className="w-full border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-2xl active:scale-95 transition-transform text-sm"
        >
          Back to Property
        </button>
      </div>
    </motion.div>
  );
}
