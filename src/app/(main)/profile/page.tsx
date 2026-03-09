"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Viewing Ticket Modal State
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      setLoadingTickets(false);
      return;
    }

    async function fetchTickets() {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      
      if (!error && data) {
        // Simple map to give a generic title
        const enriched = data.map(b => ({
          ...b,
          listing_title: b.property_type === 'home' ? 'Home Inquiry' : 'Hostel Room Inquiry'
        }));
        setTickets(enriched);
      }
      setLoadingTickets(false);
    }

    fetchTickets();
  }, [user]);

  useEffect(() => {
    if (profile) {
      setEditName(profile.fullName || "");
      setEditPhone(profile.phone || "");
    }
  }, [profile]);

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

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    await supabase.from("profiles").update({
      full_name: editName,
      phone: editPhone
    }).eq("id", user.id);
    setIsEditingProfile(false);
    window.location.reload();
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert('Error uploading avatar');
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);

    setUploadingAvatar(false);
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
      <div className="bg-white px-4 pt-12 pb-6 flex flex-col items-center border-b border-gray-100 relative">
        <div className="relative">
          {profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover mb-3 shadow-sm border border-gray-100" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center mb-3 shadow-sm">
              <span className="text-white text-2xl font-extrabold">{initials}</span>
            </div>
          )}
          {isEditingProfile && (
            <label className="absolute bottom-3 -right-2 bg-emerald-500 text-white p-1.5 rounded-full shadow-md cursor-pointer active:scale-95 transition-transform">
              {uploadingAvatar ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              )}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingAvatar} onChange={handleAvatarUpload} />
            </label>
          )}
        </div>
        
        {isEditingProfile ? (
          <form onSubmit={handleUpdateProfile} className="w-full max-w-xs space-y-3 mt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required className="w-full text-center font-bold text-gray-900 border-b-2 border-emerald-500 focus:outline-none bg-emerald-50/50 rounded-t-xl px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Phone Number</label>
              <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} required className="w-full text-center font-bold text-gray-900 border-b-2 border-emerald-500 focus:outline-none bg-emerald-50/50 rounded-t-xl px-3 py-2" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 py-2 text-xs font-bold text-gray-500 bg-gray-100 rounded-xl">Cancel</button>
              <button type="submit" className="flex-1 py-2 text-xs font-bold text-white bg-emerald-500 rounded-xl">Save</button>
            </div>
          </form>
        ) : (
          <>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {profile?.fullName ?? "Your Account"}
            </h1>
            {profile && (
              <span className="mt-1 text-[11px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                {ROLE_LABELS[profile.role] ?? profile.role}
              </span>
            )}
            <p className="text-xs text-gray-400 mt-1">{user.email}</p>
            <button
              onClick={() => setIsEditingProfile(true)}
              className="mt-3 text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full active:scale-95 transition-transform"
            >
              Edit Profile
            </button>
          </>
        )}
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

        {/* Phone display moved to Edit Mode */}
        {!isEditingProfile && (
          <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 mb-6">
            <span className="text-xl">📞</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">Contact Number</p>
              <p className="text-xs text-gray-400">{profile?.phone ?? "Update your profile to set your phone number"}</p>
            </div>
          </div>
        )}

        {/* IDENTITY VERIFICATION & AGENT MODE (Hiding KYC UI for now based on user request) */}
        {profile && profile.role !== "admin" && profile.kycStatus === 'verified' && (
          <div className="mb-6 pt-2">
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
          </div>
        )}

        <div className="mb-6 pt-2">
          <h2 className="text-lg font-bold text-gray-900 mb-3 px-1">My Inquiries & Bookings</h2>
          
          {loadingTickets ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse bg-white border border-gray-100 rounded-2xl p-4 h-28" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm">
              <span className="text-4xl mb-2 block">🏠</span>
              <p className="text-sm font-bold text-gray-800">No Inquiries Found</p>
              <p className="text-xs text-gray-500 mt-1">Book a viewing or inquire about a property to see it here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map(ticket => (
                <div 
                  key={ticket.id} 
                  onClick={() => setSelectedTicket(ticket)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100 relative overflow-hidden flex flex-col cursor-pointer active:scale-[0.98] transition-all"
                >
                  <div className="w-full flex justify-between items-start mb-4">
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">{ticket.listing_title}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="w-full flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Preferred Date</p>
                      <p className="text-sm font-bold text-gray-900">{ticket.viewing_date ? new Date(ticket.viewing_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "Not Specified"}</p>
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

      {/* VIEWING TICKET FULL VIEW MODAL */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-t-3xl p-6 pb-12 w-full max-h-[85vh] overflow-y-auto"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-extrabold text-gray-900">Inquiry Details</h3>
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-500 rounded-full active:scale-95 transition-transform"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Property</p>
                  <p className="text-lg font-bold text-gray-900">{selectedTicket.listing_title}</p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                    <span className="text-sm">📅</span>
                    <span className="font-medium text-gray-700">
                      {selectedTicket.viewing_date ? new Date(selectedTicket.viewing_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : 'No specific date provided'}
                    </span>
                  </p>
                </div>

                {selectedTicket.message && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Your Message</p>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedTicket.message}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-lg">💬</div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Chat with Admin</p>
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">Available Soon</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
