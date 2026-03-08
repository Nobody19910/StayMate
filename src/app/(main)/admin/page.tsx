"use client";

import { mockBookingRequests } from "@/lib/mock-data";
import type { BookingRequest, VerificationStatus } from "@/lib/types";

const VERIFICATION_CONFIG: Record<VerificationStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending: {
    label: "Pending Review",
    color: "text-gray-500",
    bg: "bg-gray-100",
    dot: "bg-gray-400",
  },
  "student-email-verified": {
    label: "Student Email Verified",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    dot: "bg-emerald-500",
  },
  "id-pending": {
    label: "ID Pending",
    color: "text-amber-700",
    bg: "bg-amber-50",
    dot: "bg-amber-400 animate-pulse",
  },
  "id-verified": {
    label: "ID Verified ✓",
    color: "text-blue-700",
    bg: "bg-blue-50",
    dot: "bg-blue-600",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-700",
    bg: "bg-red-50",
    dot: "bg-red-500",
  },
};

const PAYMENT_CONFIG = {
  unpaid: { label: "Unpaid", color: "text-amber-600", bg: "bg-amber-50" },
  paid: { label: "Paid", color: "text-emerald-700", bg: "bg-emerald-50" },
  expired: { label: "Expired", color: "text-red-600", bg: "bg-red-50" },
};

export default function AdminPage() {
  const requests = mockBookingRequests;
  const pendingCount = requests.filter((r) => r.paymentStatus === "unpaid").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <p className="text-[11px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit">
          Owner Dashboard
        </p>
        <h1 className="text-xl font-extrabold text-gray-900 mt-1">Booking Requests</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {requests.length} total · {pendingCount} awaiting payment
        </p>

        {/* Summary pills */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          <SummaryPill label="Total" value={requests.length} color="gray" />
          <SummaryPill label="Awaiting Payment" value={requests.filter((r) => r.paymentStatus === "unpaid").length} color="amber" />
          <SummaryPill label="Paid" value={requests.filter((r) => r.paymentStatus === "paid").length} color="emerald" />
        </div>
      </div>

      {/* Booking list */}
      <div className="px-4 py-4 space-y-3">
        {requests.map((req) => (
          <BookingCard key={req.id} request={req} />
        ))}
      </div>

      {/* Placeholder notice */}
      <div className="px-4 pb-8">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4 text-center">
          <p className="text-xs text-blue-600 font-semibold">Admin Dashboard — Phase 3 Preview</p>
          <p className="text-[11px] text-blue-500 mt-1">
            Full dashboard with real-time updates, push notifications, and bulk actions coming in Phase 3 with auth.
          </p>
        </div>
      </div>
    </div>
  );
}

function BookingCard({ request }: { request: BookingRequest }) {
  const vs = VERIFICATION_CONFIG[request.verificationStatus];
  const ps = PAYMENT_CONFIG[request.paymentStatus];

  const createdDate = new Date(request.createdAt);
  const expiresDate = new Date(request.expiresAt);
  const isExpired = expiresDate < new Date();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Room info */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-400 truncate">{request.hostelName}</p>
            <p className="text-sm font-bold text-gray-900 truncate">{request.roomName}</p>
          </div>
          <p className="text-sm font-extrabold text-blue-600 shrink-0">{request.priceLabel}</p>
        </div>
      </div>

      {/* Student info */}
      <div className="px-4 py-3 border-b border-gray-50">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-gray-900">{request.studentName}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{request.studentEmail}</p>
            <p className="text-[11px] text-gray-400">{request.studentPhone}</p>
          </div>
          <a
            href={`tel:${request.studentPhone}`}
            className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-xl"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            Call
          </a>
        </div>
      </div>

      {/* Status badges */}
      <div className="px-4 py-3 flex flex-wrap gap-2">
        {/* Verification */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${vs.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${vs.dot}`} />
          <span className={`text-[11px] font-semibold ${vs.color}`}>{vs.label}</span>
        </div>
        {/* Payment */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${ps.bg}`}>
          <span className={`text-[11px] font-semibold ${ps.color}`}>{ps.label}</span>
        </div>
        {/* Expiry */}
        {request.paymentStatus === "unpaid" && (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${isExpired ? "bg-red-50" : "bg-gray-50"}`}>
            <span className="text-[10px]">⏱</span>
            <span className={`text-[11px] font-semibold ${isExpired ? "text-red-600" : "text-gray-500"}`}>
              {isExpired ? "Expired" : `Hold until ${expiresDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            </span>
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div className="px-4 pb-3">
        <p className="text-[10px] text-gray-300">
          Requested {createdDate.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>
    </div>
  );
}

function SummaryPill({ label, value, color }: { label: string; value: number; color: "gray" | "amber" | "emerald" }) {
  const cls = {
    gray: "bg-gray-100 text-gray-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
  }[color];
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl shrink-0 ${cls}`}>
      <span className="text-sm font-extrabold">{value}</span>
      <span className="text-[11px] font-medium">{label}</span>
    </div>
  );
}
