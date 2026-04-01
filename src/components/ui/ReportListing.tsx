"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

const REASONS = [
  { value: "fake_listing",    label: "Fake or fraudulent listing" },
  { value: "wrong_info",      label: "Wrong information (price, location, photos)" },
  { value: "already_rented",  label: "Already rented/sold but still showing" },
  { value: "scam",            label: "Suspected scam" },
  { value: "inappropriate",   label: "Inappropriate content" },
  { value: "other",           label: "Other" },
] as const;

interface Props {
  propertyId: string;
  propertyType: "home" | "hostel";
}

export default function ReportListing({ propertyId, propertyType }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function handleOpen() {
    setOpen(true);
    setReason("");
    setDetails("");
    setSuccess(false);
    setError("");
  }

  function handleClose() {
    setOpen(false);
  }

  async function handleSubmit() {
    if (!user || !reason) return;
    setSubmitting(true);
    setError("");
    const { error: err } = await supabase.from("listing_reports").insert({
      reporter_id: user.id,
      property_id: propertyId,
      property_type: propertyType,
      reason,
      details: details.trim() || null,
    });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => setOpen(false), 2000);
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-xs font-medium"
        style={{ color: "var(--uber-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        🚩 Report listing
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-4"
            style={{ background: "var(--uber-white)", maxHeight: "90vh", overflowY: "auto" }}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold" style={{ color: "var(--uber-text)" }}>Report this listing</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>Help us keep StayMate safe and accurate</p>
              </div>
              <button onClick={handleClose} style={{ color: "var(--uber-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
            </div>

            {success ? (
              <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(6,193,103,0.1)", border: "0.5px solid rgba(6,193,103,0.3)" }}>
                <p className="text-sm font-bold" style={{ color: "var(--uber-green)" }}>✓ Report submitted. We&apos;ll review it shortly.</p>
              </div>
            ) : !user ? (
              <div className="rounded-2xl p-4 text-center space-y-2" style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }}>
                <p className="text-sm" style={{ color: "var(--uber-text)" }}>Sign in to report a listing</p>
                <Link href="/login" className="inline-block text-sm font-bold" style={{ color: "var(--uber-green)" }}>Sign in →</Link>
              </div>
            ) : (
              <>
                {/* Reason radio group */}
                <div className="space-y-2">
                  {REASONS.map((r) => (
                    <label
                      key={r.value}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                      style={{
                        background: reason === r.value ? "rgba(6,193,103,0.08)" : "var(--uber-surface)",
                        border: reason === r.value ? "0.5px solid rgba(6,193,103,0.4)" : "0.5px solid var(--uber-border)",
                      }}
                    >
                      <input
                        type="radio"
                        name="report_reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="accent-green-500 shrink-0"
                      />
                      <span className="text-sm font-medium" style={{ color: "var(--uber-text)" }}>{r.label}</span>
                    </label>
                  ))}
                </div>

                {/* Details */}
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Any additional details..."
                  rows={3}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                  style={{ background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
                />

                {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={!reason || submitting}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: "var(--uber-green)", color: "#fff" }}
                >
                  {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Submit Report"}
                </button>

                <button
                  onClick={handleClose}
                  className="w-full text-sm font-semibold"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--uber-muted)" }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
