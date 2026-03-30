"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null };
}

interface Props {
  propertyId: string;
  propertyType?: "home" | "hostel";
  /** If provided and status === "completed", show the "Leave a review" form */
  completedBookingId?: string;
}

function StarRow({ rating, onChange, size = 24 }: { rating: number; onChange?: (r: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
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

export default function ReviewsSection({ propertyId, propertyType = "home", completedBookingId }: Props) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    supabase
      .from("reviews")
      .select("*, profiles(full_name, avatar_url)")
      .eq("property_id", propertyId)
      .eq("property_type", propertyType)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = (data ?? []) as Review[];
        setReviews(list);
        if (user) setMyReview(list.find(r => r.reviewer_id === user.id) ?? null);
        setLoading(false);
      });
  }, [propertyId, propertyType, user, submitted]);

  async function submitReview() {
    if (!user || rating === 0 || !completedBookingId) return;
    setSubmitting(true);
    await supabase.from("reviews").insert({
      booking_id: completedBookingId,
      property_id: propertyId,
      property_type: propertyType,
      reviewer_id: user.id,
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    setSubmitted(true);
    setShowForm(false);
  }

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const counts = [5, 4, 3, 2, 1].map(n => reviews.filter(r => r.rating === n).length);

  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold" style={{ color: "var(--uber-text)" }}>
          Reviews {reviews.length > 0 && <span style={{ color: "var(--uber-muted)", fontWeight: 400 }}>({reviews.length})</span>}
        </h2>
        {completedBookingId && !myReview && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs font-bold px-3 py-1.5 rounded-xl"
            style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
          >
            Write a review
          </button>
        )}
      </div>

      {/* Average + bar chart */}
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

      {/* Write review form */}
      {showForm && (
        <div className="mb-5 p-4 rounded-xl" style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }}>
          <p className="text-sm font-bold mb-3" style={{ color: "var(--uber-text)" }}>Your review</p>
          <div className="mb-3">
            <StarRow rating={rating} onChange={setRating} size={32} />
            {rating > 0 && (
              <p className="text-xs mt-1" style={{ color: "var(--uber-muted)" }}>
                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
              </p>
            )}
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Tell future seekers what you thought… (optional)"
            rows={3}
            className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none"
            style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", color: "var(--uber-text)" }}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={submitReview}
              disabled={rating === 0 || submitting}
              className="flex-1 py-2 rounded-xl text-sm font-bold"
              style={{ background: rating === 0 ? "var(--uber-surface2)" : "var(--uber-green)", color: "#fff", opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? "Submitting…" : "Submit review"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "var(--uber-surface2)", color: "var(--uber-text)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {submitted && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: "rgba(6,193,103,0.1)", color: "var(--uber-green)" }}>
          ✓ Review submitted — thank you!
        </div>
      )}

      {/* Review list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--uber-surface2)" }} />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--uber-muted)" }}>
          No reviews yet. {completedBookingId ? "Be the first to review this property." : ""}
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
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
                <div className="ml-auto">
                  <StarRow rating={r.rating} size={12} />
                </div>
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
