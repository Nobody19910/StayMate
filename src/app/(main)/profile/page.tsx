"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

const ROLE_LABELS: Record<string, string> = {
  seeker: "Property Seeker",
  admin: "StayMate Admin",
};

export default function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // KYC & Agent State
  const [kycName, setKycName] = useState("");
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [kycError, setKycError] = useState("");

  useEffect(() => {
    if (!user) {
      setLoadingTickets(false);
      return;
    }

    async function fetchTickets() {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("seeker_id", user!.id)
        .order("created_at", { ascending: false });
      
      if (!error && data) {
        setTickets(data);
      }
      setLoadingTickets(false);
    }

    fetchTickets();
  }, [user]);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  async function submitKyc(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !user) return;
    setSubmittingKyc(true);
    setKycError("");

    if (kycName.toLowerCase() !== profile.fullName?.toLowerCase()) {
      setKycError("ID Card name must exactly match your profile name.");
      setSubmittingKyc(false);
      return;
    }

    // Submit mock KYC
    await supabase.from("kyc_submissions").insert({
      user_id: user.id,
      id_card_name: kycName,
      status: "pending"
    });

    // Update local profile UI state to pending
    await supabase.from("profiles").update({ kyc_status: "pending" }).eq("id", user.id);
    window.location.reload(); // Quick refresh to sync Auth Context
  }

  async function toggleAgentMode() {
    if (!profile || !user || profile.kycStatus !== 'verified') return;
    const newStatus = !profile.agentModeEnabled;
    await supabase.from("profiles").update({ agent_mode_enabled: newStatus }).eq("id", user.id);
    window.location.reload();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse w-16 h-16 bg-gray-200 rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white px-4 pt-12 pb-6 flex flex-col items-center border-b border-gray-100">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center mb-3">
            <span className="text-white text-2xl font-extrabold">?</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Welcome to StayMate</h1>
          <p className="text-sm text-gray-400 mt-0.5">Sign in to access your account</p>
        </div>
        <div className="px-4 py-6 space-y-3">
          <Link
            href="/login"
            className="block bg-emerald-500 text-white font-bold text-center py-3.5 rounded-2xl active:scale-95 transition-transform"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="block border-2 border-emerald-500 text-emerald-600 font-bold text-center py-3.5 rounded-2xl active:scale-95 transition-transform"
          >
            Create Account
          </Link>
          <div className="bg-emerald-50 rounded-xl px-4 py-3 mt-4">
            <p className="text-xs text-emerald-700 font-medium text-center">
              No agents. No commission. List your own property or find your next home directly from owners.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const initials = (profile?.fullName ?? user.email ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="bg-white px-4 pt-12 pb-6 flex flex-col items-center border-b border-gray-100">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center mb-3">
          <span className="text-white text-2xl font-extrabold">{initials}</span>
        </div>
        <h1 className="text-lg font-bold text-gray-900">{profile?.fullName ?? "Your Account"}</h1>
        {profile && (
          <span className="mt-1 text-[11px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
            {ROLE_LABELS[profile.role] ?? profile.role}
          </span>
        )}
        <p className="text-xs text-gray-400 mt-1">{user.email}</p>
      </div>

      <div className="px-4 py-6 space-y-3">
        {profile?.role === "admin" && (
          <Link
            href="/admin"
            className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100 active:scale-95 transition-transform"
          >
            <span className="text-xl">🛡️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800">Admin Dashboard</p>
              <p className="text-xs text-emerald-600">Manage listings, viewings & leads</p>
            </div>
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}

        <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 mb-6">
          <span className="text-xl">📞</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Phone</p>
            <p className="text-xs text-gray-400">{profile?.phone ?? "Not set"}</p>
          </div>
        </div>

        {/* IDENTITY VERIFICATION & AGENT MODE */}
        {profile && profile.role !== "admin" && (
          <div className="mb-6 pt-2">
            <h2 className="text-lg font-bold text-gray-900 mb-3 px-1">Agent & Identity</h2>
            
            {profile.kycStatus === "unverified" && (
              <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🪪</span>
                  <p className="text-sm font-bold text-amber-900">Verify Identity (KYC)</p>
                </div>
                <p className="text-xs text-amber-800 mb-4 font-medium">
                  We need to verify your Ghana Card to unlock Agent Mode and allow you to submit properties.
                </p>
                <form onSubmit={submitKyc} className="space-y-3">
                  <input
                    required
                    value={kycName}
                    onChange={(e) => setKycName(e.target.value)}
                    placeholder="Name exactly as on ID"
                    className="w-full border border-amber-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  />
                  <div className="w-full border border-dashed border-amber-300 rounded-xl px-3 py-3 text-center bg-white/50">
                    <p className="text-xs text-amber-700 font-bold uppercase tracking-widest">Tap to add ID Photo</p>
                  </div>
                  {kycError && <p className="text-[10px] text-red-600 font-bold">{kycError}</p>}
                  <button
                    type="submit"
                    disabled={submittingKyc}
                    className="w-full block bg-amber-500 text-white font-bold text-center py-2.5 rounded-xl active:scale-95 transition-transform text-sm"
                  >
                    {submittingKyc ? "Submitting..." : "Submit for KYC"}
                  </button>
                </form>
              </div>
            )}

            {profile.kycStatus === "pending" && (
              <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 flex items-center gap-3">
                <span className="text-2xl">⏳</span>
                <div>
                  <p className="text-sm font-bold text-blue-900">KYC Under Review</p>
                  <p className="text-xs text-blue-700 font-medium mt-0.5">We are currently verifying your Ghana Card. Please check back later.</p>
                </div>
              </div>
            )}

            {profile.kycStatus === "verified" && (
              <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="text-sm font-bold text-emerald-900">Identity Verified</p>
                      <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider mt-0.5">Agent Mode Unlocked</p>
                    </div>
                  </div>
                  <button 
                    onClick={toggleAgentMode}
                    className={`w-12 h-6 rounded-full transition-colors relative ${profile.agentModeEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${profile.agentModeEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {profile.agentModeEnabled && (
                  <div className="mt-4 pt-4 border-t border-emerald-200">
                    <p className="text-xs text-emerald-800 font-bold mb-3">Agent Quick Links</p>
                    <Link
                      href="/admin/post"
                      className="block bg-emerald-600 text-white font-bold text-center py-2.5 rounded-xl active:scale-95 transition-transform text-sm"
                    >
                      Post New Property
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mb-6 pt-2">
          <h2 className="text-lg font-bold text-gray-900 mb-3 px-1">My Viewing Tickets</h2>
          
          {loadingTickets ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse bg-white border border-gray-100 rounded-2xl p-4 h-28" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm">
              <span className="text-4xl mb-2 block">🎟️</span>
              <p className="text-sm font-bold text-gray-800">No Viewings Booked</p>
              <p className="text-xs text-gray-500 mt-1">Book a viewing on a property to get your digital ticket.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map(ticket => (
                <div key={ticket.id} className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100 relative overflow-hidden flex flex-col items-center">
                  <div className="absolute top-1/2 -left-3 w-6 h-6 bg-gray-50 rounded-full border-r border-gray-200" />
                  <div className="absolute top-1/2 -right-3 w-6 h-6 bg-gray-50 rounded-full border-l border-gray-200" />
                  <div className="absolute top-1/2 left-4 right-4 h-px border-b-2 border-dashed border-gray-200" />

                  <div className="w-full flex justify-between items-start mb-6 z-10">
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">{ticket.listing_title}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        {ticket.status}
                      </span>
                    </div>
                    {ticket.ticket_code && (
                      <div className="bg-gray-100 rounded-xl px-3 py-1.5 shrink-0 ml-4">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Code</p>
                        <p className="tracking-widest font-mono text-lg font-black text-gray-900">{ticket.ticket_code}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="w-full flex justify-between items-end mt-2 z-10 px-1">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Date</p>
                      <p className="text-sm font-bold text-gray-900">{ticket.viewing_date ? new Date(ticket.viewing_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "--"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Time</p>
                      <p className="text-sm font-bold text-gray-900">{ticket.viewing_time || "--"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100">
          <span className="text-xl">ℹ️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">About StayMate</p>
            <p className="text-xs text-gray-400">No agents. No commission.</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full mt-2 border-2 border-red-200 text-red-500 font-bold py-3 rounded-2xl active:scale-95 transition-transform text-sm"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
