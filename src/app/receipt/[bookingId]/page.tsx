"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

interface ReceiptData {
  id: string;
  status: string;
  payment_reference: string | null;
  property_ref: string | null;
  property_type: string | null;
  seeker_name: string | null;
  seeker_email: string | null;
  created_at: string;
  message: string | null;
}

function printReceipt() {
  window.print();
}

export default function ReceiptPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user } = useAuth();
  const [booking, setBooking] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    supabase
      .from("bookings")
      .select("id, status, payment_reference, property_ref, property_type, seeker_name, seeker_email, created_at, message")
      .eq("id", bookingId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setNotFound(true); setLoading(false); return; }
        setBooking(data as ReceiptData);
        setLoading(false);
      });
  }, [bookingId]);

  // Extract property title from message
  const propertyTitle = booking?.message?.match(/\[Inquiry for:\s*([^\]]+)\]/)?.[1] ?? "Property";

  const isPaid = booking?.status === "fee_paid" || booking?.status === "viewing_scheduled" || booking?.status === "completed";

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--uber-surface)" }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--uber-green)" }} />
    </div>
  );

  if (notFound || !booking) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--uber-surface)" }}>
      <p className="text-lg font-bold" style={{ color: "var(--uber-text)" }}>Receipt not found</p>
      <Link href="/homes" className="text-sm font-semibold" style={{ color: "var(--uber-green)" }}>← Browse properties</Link>
    </div>
  );

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: "var(--uber-surface)" }}>
      <div className="max-w-lg mx-auto">
        {/* Print / back actions */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link href="/profile" className="text-sm font-semibold flex items-center gap-1" style={{ color: "var(--uber-muted)" }}>
            ← Back
          </Link>
          <button
            onClick={printReceipt}
            className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl"
            style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
            </svg>
            Print / Save PDF
          </button>
        </div>

        {/* Receipt card */}
        <div className="rounded-2xl overflow-hidden shadow-xl" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
          {/* Header */}
          <div className="px-6 pt-8 pb-6 text-center" style={{ background: isPaid ? "var(--uber-green)" : "var(--uber-surface2)" }}>
            {isPaid ? (
              <>
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-extrabold text-xl">Payment Confirmed</p>
                <p className="text-white/80 text-sm mt-1">Coordination & Viewing Fee</p>
              </>
            ) : (
              <>
                <p className="font-extrabold text-xl" style={{ color: "var(--uber-text)" }}>Booking Receipt</p>
                <p className="text-sm mt-1" style={{ color: "var(--uber-muted)" }}>Payment not yet received</p>
              </>
            )}
          </div>

          {/* Amount */}
          <div className="text-center py-6" style={{ borderBottom: "0.5px solid var(--uber-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--uber-muted)" }}>Amount Paid</p>
            <p className="text-4xl font-extrabold" style={{ color: "var(--uber-text)" }}>GH₵200.00</p>
            <p className="text-xs mt-1" style={{ color: "var(--uber-muted)" }}>Coordination & Viewing Fee · Non-refundable</p>
          </div>

          {/* Details */}
          <div className="px-6 py-5 space-y-4">
            {[
              { label: "Receipt No.", value: `SM-${booking.id.slice(0, 8).toUpperCase()}` },
              { label: "Property", value: propertyTitle },
              { label: "Payment Reference", value: booking.payment_reference ?? "N/A" },
              { label: "Payer Name", value: booking.seeker_name ?? user?.email ?? "N/A" },
              { label: "Payer Email", value: booking.seeker_email ?? user?.email ?? "N/A" },
              { label: "Date", value: new Date(booking.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) },
              { label: "Time", value: new Date(booking.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) },
              { label: "Payment Status", value: isPaid ? "Paid" : "Pending" },
              { label: "Service", value: "Property Coordination & Viewing Arrangement" },
              { label: "Provider", value: "StayMate Ghana" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start gap-4">
                <p className="text-xs font-semibold shrink-0" style={{ color: "var(--uber-muted)" }}>{label}</p>
                <p className="text-sm font-bold text-right" style={{ color: "var(--uber-text)" }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 text-center" style={{ background: "var(--uber-surface)", borderTop: "0.5px solid var(--uber-border)" }}>
            <p className="text-xs" style={{ color: "var(--uber-muted)" }}>
              This is an official receipt from StayMate Ghana.<br />
              Keep this for your records. For support: support@staymate.com.gh
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
