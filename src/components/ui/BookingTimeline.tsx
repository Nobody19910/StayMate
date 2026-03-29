"use client";

import { IconCheck, IconClose, IconCreditCard, IconCalendar, IconHome } from "@/components/ui/Icons";

const STATUS_CONFIG: Record<string, { colorVar: string; icon: React.ReactNode; label: string }> = {
  pending: { colorVar: "var(--uber-muted)", icon: "⏳", label: "Pending Review" },
  accepted: { colorVar: "var(--uber-green)", icon: <IconCheck className="w-3.5 h-3.5" />, label: "Accepted" },
  rejected: { colorVar: "var(--error-text)", icon: <IconClose className="w-3.5 h-3.5" />, label: "Rejected" },
  fee_paid: { colorVar: "var(--gold)", icon: <IconCreditCard className="w-3.5 h-3.5" />, label: "Fee Paid" },
  paid: { colorVar: "var(--gold)", icon: <IconCreditCard className="w-3.5 h-3.5" />, label: "Fee Paid" },
  viewing_scheduled: { colorVar: "var(--info-text)", icon: <IconCalendar className="w-3.5 h-3.5" />, label: "Viewing Scheduled" },
  completed: { colorVar: "var(--uber-green)", icon: <IconHome className="w-3.5 h-3.5" />, label: "Completed" },
};

const TIMELINE_STEPS = ["pending", "accepted", "fee_paid", "viewing_scheduled", "completed"];

function getStepIndex(status: string): number {
  if (status === "paid") return TIMELINE_STEPS.indexOf("fee_paid");
  if (status === "rejected") return -1;
  return TIMELINE_STEPS.indexOf(status);
}

interface Booking {
  id: string;
  status: string;
  listing_title: string;
  property_type: string;
  viewing_date?: string;
  created_at: string;
  message?: string;
  payment_reference?: string;
}

export default function BookingTimeline({ bookings, onSelect, onPay, payingId }: {
  bookings: Booking[];
  onSelect: (b: Booking) => void;
  onPay?: (b: Booking) => void;
  payingId?: string | null;
}) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
        <span className="text-4xl mb-2 block"><IconHome className="w-10 h-10" /></span>
        <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>No Inquiries Found</p>
        <p className="text-xs mt-1" style={{ color: "var(--uber-muted)" }}>Book a viewing or inquire about a property to see it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {bookings.map((booking, i) => {
        const config = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
        const stepIdx = getStepIndex(booking.status);
        const isRejected = booking.status === "rejected";

        return (
          <div key={booking.id} className="flex gap-3">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: config.colorVar, color: "#fff" }}

              >
                {config.icon}
              </div>
              {i < bookings.length - 1 && (
                <div className="w-0.5 flex-1 min-h-[16px]" style={{ background: "var(--uber-border)" }} />
              )}
            </div>

            {/* Card */}
            <div
              className="flex-1 mb-4 rounded-xl p-3 cursor-pointer active:scale-[0.98] transition-all"
              style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}
              onClick={() => onSelect(booking)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold leading-tight line-clamp-1" style={{ color: "var(--uber-text)" }}>
                    {booking.listing_title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded text-white"
                      style={{ background: config.colorVar }}
                    >
                      {config.label}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--uber-muted)" }}>
                      {new Date(booking.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress track */}
              {!isRejected && (
                <div className="flex items-center gap-0.5 mt-2.5">
                  {TIMELINE_STEPS.map((step, si) => (
                    <div
                      key={step}
                      className="h-1 flex-1 rounded-full"
                      style={{
                        background: si <= stepIdx ? config.colorVar : "var(--uber-surface2)",
                        opacity: si <= stepIdx ? 1 : 0.5,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Action */}
              {booking.status === "accepted" && onPay && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPay(booking); }}
                  disabled={payingId === booking.id}
                  className="mt-2.5 w-full flex items-center justify-center gap-1 text-xs font-bold text-white px-3 py-2 rounded-lg active:scale-95 transition-all disabled:opacity-60"
                  style={{ background: "var(--uber-green)" }}
                >
                  {payingId === booking.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : <><IconCreditCard className="w-3.5 h-3.5" /> Pay GH₵ 200 Fee</>}
                </button>
              )}

              {booking.viewing_date && (
                <p className="text-[10px] mt-1.5" style={{ color: "var(--uber-muted)" }}>
                  <IconCalendar className="w-3 h-3 inline-block" /> Viewing: {new Date(booking.viewing_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
