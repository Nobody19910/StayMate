"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

const REFUND_REASONS = [
  "Viewing was not arranged",
  "Property was misrepresented",
  "Changed my mind",
  "Agent was unresponsive",
  "Other",
];

interface Props {
  bookingId: string;
  paymentReference?: string;
}

export default function RefundRequest({ bookingId }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REFUND_REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function handleOpen() {
    setOpen(true);
    setReason(REFUND_REASONS[0]);
    setDetails("");
    setSuccess(false);
    setError("");
  }

  function handleClose() {
    setOpen(false);
  }

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);
    setError("");
    const { error: err } = await supabase.from("refund_requests").insert({
      user_id: user.id,
      booking_id: bookingId,
      reason,
      details: details.trim() || null,
    });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(true);
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="w-full py-3 rounded-2xl font-bold text-sm"
        style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)", color: "var(--uber-text)", cursor: "pointer" }}
      >
        Request Refund
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
                <h2 className="text-lg font-bold" style={{ color: "var(--uber-text)" }}>Request a refund</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>GH₵200 coordination fee</p>
              </div>
              <button onClick={handleClose} style={{ color: "var(--uber-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
            </div>

            {success ? (
              <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(6,193,103,0.1)", border: "0.5px solid rgba(6,193,103,0.3)" }}>
                <p className="text-sm font-bold" style={{ color: "var(--uber-green)" }}>✓ Refund request submitted. We&apos;ll review within 24–48 hours.</p>
              </div>
            ) : (
              <>
                {/* Info banner */}
                <div className="rounded-xl p-3" style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }}>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--uber-muted)" }}>
                    Refund requests are reviewed by our team within 24–48 hours. If approved, the fee will be returned to your original payment method.
                  </p>
                </div>

                {/* Reason select */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--uber-muted)" }}>Reason</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
                  >
                    {REFUND_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Details */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--uber-muted)" }}>Additional details (optional)</label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Describe your situation..."
                    rows={3}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                    style={{ background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
                  />
                </div>

                {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: "var(--uber-green)", color: "#fff" }}
                >
                  {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Submit Request"}
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
