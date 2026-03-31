"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  target_type: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: { full_name: string | null };
}

export interface ReviewTarget {
  type: "property" | "agent" | "concierge";
  label: string;
  description: string;
  icon: string;
  targetId?: string; // agent/admin user id (omit for property)
}

interface Props {
  propertyId: string;
  propertyType?: "home" | "hostel";
  completedBookingId?: string; // if set → show write-a-review form
  /** extra targets to rate beyond the property */
  extraTargets?: ReviewTarget[];
  /** compact mode: just the star average badge — no full list */
  compact?: boolean;
}

export function StarRow({
  rating,
  onChange,
  size = 24,
}: {
  rating: number;
  onChange?: (r: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => onChange && setHover(0)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: onChange ? "pointer" : "default",
            color: n <= (hover || rating) ? "#f59e0b" : "var(--uber-border)",
            lineHeight: 1,
          }}
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-3 text-right shrink-0" style={{ color: "var(--uber-muted)" }}>{label}</span>
      <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: "var(--uber-surface2)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#f59e0b" }} />
      </div>
      <span className="w-4 shrink-0" style={{ color: "var(--uber-muted)" }}>{count}</span>
    </div>
  );
}

/** Inline write-a-review form for one target type */
function ReviewForm({
  bookingId,
  propertyId,
  propertyType,
  target,
  onDone,
}: {
  bookingId: string;
  propertyId: string;
  propertyType: string;
  target: ReviewTarget;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Check if already reviewed this target
  const [alreadyDone, setAlreadyDone] = useState(false);
  useEffect(() => {
    if (!user) return;
    supabase
      .from("reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("target_type", target.type)
      .maybeSingle()
      .then(({ data }) => { if (data) setAlreadyDone(true); });
  }, [bookingId, target.type, user]);

  if (alreadyDone || done) {
    return (
      <div className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
        style={{ background: "rgba(6,193,103,0.08)", color: "var(--uber-green)" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {target.label} reviewed
      </div>
    );
  }

  async function submit() {
    if (!user || rating === 0) return;
    setSubmitting(true);
    await supabase.from("reviews").upsert({
      booking_id: bookingId,
      property_id: propertyId,
      property_type: propertyType,
      reviewer_id: user.id,
      rating,
      comment: comment.trim() || null,
      target_type: target.type,
      target_id: target.targetId ?? null,
    }, { onConflict: "booking_id,target_type" });
    setSubmitting(false);
    setDone(true);
    onDone();
  }

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{target.icon}</span>
        <div>
          <p className="text-xs font-bold" style={{ color: "var(--uber-text)" }}>{target.label}</p>
          <p className="text-[10px]" style={{ color: "var(--uber-muted)" }}>{target.description}</p>
        </div>
      </div>
      <StarRow rating={rating} onChange={setRating} size={28} />
      {rating > 0 && (
        <p className="text-[10px] font-semibold" style={{ color: "#f59e0b" }}>
          {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
        </p>
      )}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write a short comment… (optional)"
        rows={2}
        className="w-full rounded-lg px-3 py-2 text-xs resize-none outline-none"
        style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", color: "var(--uber-text)" }}
      />
      <button
        onClick={submit}
        disabled={rating === 0 || submitting}
        className="w-full py-2 rounded-lg text-xs font-bold"
        style={{ background: rating === 0 ? "var(--uber-surface2)" : "var(--uber-green)", color: "#fff", opacity: submitting ? 0.6 : 1 }}
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}

// ─── Compact star badge (used on listing cards / detail header) ───────────────
export function RatingBadge({ propertyId, propertyType = "home" }: { propertyId: string; propertyType?: string }) {
  const [avg, setAvg] = useState<number | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    supabase
      .from("reviews")
      .select("rating")
      .eq("property_id", propertyId)
      .eq("property_type", propertyType)
      .eq("target_type", "property")
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        setCount(data.length);
        setAvg(data.reduce((s, r) => s + r.rating, 0) / data.length);
      });
  }, [propertyId, propertyType]);

  if (avg === null) return null;

  return (
    <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: "#f59e0b" }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {avg.toFixed(1)}
      <span style={{ color: "var(--uber-muted)", fontWeight: 400 }}>({count})</span>
    </span>
  );
}

// ─── Full Reviews Section (property detail page) ──────────────────────────────
export default function ReviewsSection({
  propertyId,
  propertyType = "home",
  completedBookingId,
  extraTargets = [],
  compact = false,
}: Props) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase
      .from("reviews")
      .select("*, profiles(full_name)")
      .eq("property_id", propertyId)
      .eq("property_type", propertyType)
      .eq("target_type", "property")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setReviews((data ?? []) as Review[]);
        setLoading(false);
      });
  }, [propertyId, propertyType, refreshKey]);

  const myPropertyReview = user ? reviews.find((r) => r.reviewer_id === user.id) : null;
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const counts = [5, 4, 3, 2, 1].map((n) => reviews.filter((r) => r.rating === n).length);

  const allTargets: ReviewTarget[] = [
    { type: "property", label: "The Property", description: "Rate the listing accuracy, photos, and condition", icon: "🏠" },
    ...extraTargets,
  ];

  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold" style={{ color: "var(--uber-text)" }}>
          Reviews{reviews.length > 0 && <span style={{ color: "var(--uber-muted)", fontWeight: 400 }}> ({reviews.length})</span>}
        </h2>
        {completedBookingId && !myPropertyReview && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs font-bold px-3 py-1.5 rounded-xl"
            style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
          >
            Write a review
          </button>
        )}
      </div>

      {/* Rating breakdown */}
      {reviews.length > 0 && (
        <div className="flex gap-6 mb-5">
          <div className="flex flex-col items-center justify-center shrink-0">
            <p className="text-4xl font-extrabold" style={{ color: "var(--uber-text)" }}>{avg.toFixed(1)}</p>
            <StarRow rating={Math.round(avg)} size={14} />
            <p className="text-xs mt-1" style={{ color: "var(--uber-muted)" }}>{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex-1 space-y-1.5 justify-center flex flex-col">
            {[5, 4, 3, 2, 1].map((n, i) => (
              <RatingBar key={n} label={`${n}`} count={counts[i]} total={reviews.length} />
            ))}
          </div>
        </div>
      )}

      {/* Write review forms — all targets */}
      {showForm && completedBookingId && (
        <div className="mb-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--uber-muted)" }}>
            Rate your experience
          </p>
          {allTargets.map((t) => (
            <ReviewForm
              key={t.type}
              bookingId={completedBookingId}
              propertyId={propertyId}
              propertyType={propertyType}
              target={t}
              onDone={() => setRefreshKey((k) => k + 1)}
            />
          ))}
          <button onClick={() => setShowForm(false)} className="text-xs font-semibold"
            style={{ color: "var(--uber-muted)" }}>
            Done
          </button>
        </div>
      )}

      {/* Review list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--uber-surface2)" }} />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--uber-muted)" }}>
          No reviews yet.{completedBookingId ? " Be the first to review this property." : ""}
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="pb-4" style={{ borderBottom: "0.5px solid var(--uber-border)" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: "var(--uber-btn-bg)" }}>
                  {(r.profiles?.full_name ?? "U")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: "var(--uber-text)" }}>
                    {r.profiles?.full_name ?? "Verified Guest"}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--uber-muted)" }}>
                    {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="ml-auto"><StarRow rating={r.rating} size={12} /></div>
              </div>
              {r.comment && (
                <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--uber-text)" }}>{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inline rating prompt in booking ticket (profile page) ───────────────────
export function BookingRatingPrompt({
  bookingId,
  propertyId,
  propertyType,
  agentId,
  agentName,
}: {
  bookingId: string;
  propertyId: string;
  propertyType: string;
  agentId?: string;
  agentName?: string;
}) {
  const { user } = useAuth();
  const [allDone, setAllDone] = useState(false);
  const [checked, setChecked] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const targets: ReviewTarget[] = [
    { type: "property", label: "The Property", description: "Accuracy, photos, and condition", icon: "🏠" },
    { type: "concierge", label: "StayMate Concierge", description: "Was the coordination smooth?", icon: "🤝" },
    ...(agentId ? [{ type: "agent" as const, label: agentName ? `Agent: ${agentName}` : "The Agent", description: "Response time and helpfulness", icon: "👤", targetId: agentId }] : []),
  ];

  useEffect(() => {
    if (!user) return;
    supabase
      .from("reviews")
      .select("target_type")
      .eq("booking_id", bookingId)
      .then(({ data }) => {
        const done = (data ?? []).length;
        setCompletedCount(done);
        if (done >= targets.length) setAllDone(true);
        setChecked(true);
      });
  }, [bookingId, user]); // eslint-disable-line

  if (!checked) return null;
  if (allDone) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold"
        style={{ background: "rgba(6,193,103,0.08)", color: "var(--uber-green)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Thank you for your reviews!
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "0.5px solid var(--uber-border)" }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: "rgba(245,158,11,0.08)", borderBottom: "0.5px solid var(--uber-border)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <p className="text-xs font-bold" style={{ color: "#d97706" }}>
          Rate your experience · {completedCount}/{targets.length} done
        </p>
      </div>
      <div className="p-4 space-y-3" style={{ background: "var(--uber-white)" }}>
        {targets.map((t) => (
          <ReviewForm
            key={t.type}
            bookingId={bookingId}
            propertyId={propertyId}
            propertyType={propertyType}
            target={t}
            onDone={() => setCompletedCount((c) => {
              const next = c + 1;
              if (next >= targets.length) setAllDone(true);
              return next;
            })}
          />
        ))}
      </div>
    </div>
  );
}
