"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { usePaystackScript, openPaystackPopup } from "@/lib/paystack";
import { activateAgentSubscription } from "@/lib/api";
import { AGENT_SUBSCRIPTION_PESEWAS } from "@/lib/sponsor-tiers";
import ThemeToggle from "@/components/ui/ThemeToggle";

const UBER_GREEN = "#06C167";

const ROLE_LABELS: Record<string, string> = {
  seeker:  "Property Seeker",
  owner:   "Property Owner",
  manager: "Hostel Manager",
  admin:   "StayMate Admin",
};

export default function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  usePaystackScript();

  // My Properties (for owners/managers)
  const [myProperties, setMyProperties] = useState<any[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);

  // Edit Profile
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Ticket modal
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
        const enriched = data.map(b => ({
          ...b,
          listing_title: b.property_type === "home" ? "Home Inquiry" : "Hostel Room Inquiry",
        }));
        setTickets(enriched);
      }
      setLoadingTickets(false);
    }

    async function fetchAgentProperties() {
      const [homesRes, hostelsRes] = await Promise.all([
        supabase.from("homes").select("*").eq("owner_id", user!.id),
        supabase.from("hostels").select("*").eq("manager_id", user!.id),
      ]);
      const combined = [
        ...(homesRes.data || []),
        ...(hostelsRes.data || []),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setMyProperties(combined);
      setLoadingProperties(false);
    }

    fetchTickets();
    if (profile?.role === "owner" || profile?.role === "manager") {
      fetchAgentProperties();
    } else {
      setLoadingProperties(false);
    }
  }, [user, profile?.role]);

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

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ full_name: editName, phone: editPhone })
      .eq("id", user.id);
    setIsEditingProfile(false);
    window.location.reload();
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });
    if (uploadError) { alert("Error uploading avatar"); setUploadingAvatar(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);
    setUploadingAvatar(false);
    window.location.reload();
  }

  async function handlePayCommitment(ticket: any) {
    if (!user) return;
    setPayingId(ticket.id);
    openPaystackPopup({
      email: user.email ?? "guest@staymate.app",
      amount: 20000,
      currency: "GHS",
      metadata: { booking_id: ticket.id, user_id: user.id },
      onSuccess: async (reference) => {
        await supabase
          .from("bookings")
          .update({ status: "fee_paid", payment_reference: reference })
          .eq("id", ticket.id);
        setTickets(prev =>
          prev.map(t => t.id === ticket.id ? { ...t, status: "fee_paid", payment_reference: reference } : t)
        );
        if (selectedTicket?.id === ticket.id) {
          setSelectedTicket((prev: any) => prev ? { ...prev, status: "fee_paid" } : prev);
        }
        setPayingId(null);
      },
      onClose: () => setPayingId(null),
    });
  }

  async function deleteProperty(id: string, isHostel: boolean) {
    if (!confirm("Are you sure you want to permanently delete this listing?")) return;
    const table = isHostel ? "hostels" : "homes";
    setMyProperties(prev => prev.filter(p => p.id !== id));
    await supabase.from(table).delete().eq("id", id);
  }

  async function togglePropertyStatus(id: string, isHostel: boolean, currentStatus: string) {
    const newStatus = currentStatus === "rented" ? "approved" : "rented";
    const table = isHostel ? "hostels" : "homes";
    setMyProperties(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    await supabase.from(table).update({ status: newStatus }).eq("id", id);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="animate-pulse w-16 h-16 rounded-full" style={{ background: "var(--uber-surface2)" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen" style={{ background: "var(--background)" }}>
        <div className="px-4 pb-8 flex flex-col items-center" style={{ paddingTop: "calc(env(safe-area-inset-top, 20px) + 16px)", background: "var(--uber-white)", borderBottom: "0.5px solid var(--uber-border)" }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--uber-black)" }}>
            <span className="text-white text-2xl font-extrabold">?</span>
          </div>
          <h1 className="text-lg font-bold" style={{ color: "var(--uber-text)" }}>Welcome to StayMate</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--uber-muted)" }}>Sign in to access your account</p>
        </div>
        <div className="px-4 py-6 space-y-3 max-w-sm mx-auto">
          <Link
            href="/login"
            className="block text-white font-bold text-center py-3.5 rounded-2xl active:scale-95 transition-transform"
            style={{ background: "var(--uber-black)" }}
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="block font-bold text-center py-3.5 rounded-2xl active:scale-95 transition-transform"
            style={{ background: UBER_GREEN, color: "#fff" }}
          >
            Create Account
          </Link>
          <div className="rounded-xl px-4 py-3 mt-4" style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }}>
            <p className="text-xs font-medium text-center" style={{ color: "var(--uber-muted)" }}>
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
    <div className="min-h-screen pb-28" style={{ background: "var(--background)" }}>
      {/* ── Profile Header ── */}
      <div className="px-4 pb-6 flex flex-col items-center relative" style={{ paddingTop: "calc(env(safe-area-inset-top, 20px) + 12px)", background: "var(--uber-white)", borderBottom: "0.5px solid var(--uber-border)" }}>
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="relative">
          {profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover mb-3 shadow-sm" style={{ border: "0.5px solid var(--uber-border)" }} />
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-3 shadow-sm" style={{ background: "var(--uber-black)" }}>
              <span className="text-white text-2xl font-extrabold">{initials}</span>
            </div>
          )}
          {isEditingProfile && (
            <label className="absolute bottom-3 -right-2 text-white p-1.5 rounded-full shadow-md cursor-pointer active:scale-95 transition-transform" style={{ background: UBER_GREEN }}>
              {uploadingAvatar ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingAvatar} onChange={handleAvatarUpload} />
            </label>
          )}
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleUpdateProfile} className="w-full max-w-xs space-y-3 mt-2">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--uber-muted)" }}>Full Name</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required
                className="w-full text-center font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2"
                style={{ color: "var(--uber-text)", background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--uber-muted)" }}>Phone Number</label>
              <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} required
                className="w-full text-center font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2"
                style={{ color: "var(--uber-text)", background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }} />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setIsEditingProfile(false)}
                className="flex-1 py-2 text-xs font-bold rounded-xl" style={{ color: "var(--uber-muted)", background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }}>
                Cancel
              </button>
              <button type="submit"
                className="flex-1 py-2 text-xs font-bold text-white rounded-xl"
                style={{ background: "var(--uber-black)" }}>
                Save
              </button>
            </div>
          </form>
        ) : (
          <>
            <h1 className="text-lg font-bold" style={{ color: "var(--uber-text)" }}>{profile?.fullName ?? "Your Account"}</h1>
            {profile && (
              <span className="mt-1 text-[11px] font-bold uppercase text-white px-2 py-0.5 rounded"
                style={{ background: UBER_GREEN }}>
                {ROLE_LABELS[profile.role] ?? profile.role}
              </span>
            )}
            <p className="text-xs mt-1" style={{ color: "var(--uber-muted)" }}>{user.email}</p>
            <button
              onClick={() => setIsEditingProfile(true)}
              className="mt-3 text-xs font-bold px-4 py-1.5 rounded-full active:scale-95 transition-transform"
              style={{ background: "var(--uber-surface)", color: "var(--uber-black)", border: "0.5px solid var(--uber-border)" }}
            >
              Edit Profile
            </button>
          </>
        )}
      </div>

      <div className="px-4 py-6 space-y-3 max-w-4xl mx-auto">
        {/* Contact */}
        {!isEditingProfile && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
            <span className="text-xl">📞</span>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: "var(--uber-text)" }}>Contact Number</p>
              <p className="text-xs" style={{ color: "var(--uber-muted)" }}>{profile?.phone ?? "Update your profile to set your phone number"}</p>
            </div>
          </div>
        )}

        {/* My Properties */}
        {profile?.role !== "admin" && (profile?.role === "owner" || profile?.role === "manager") && (
          <div className="mb-6 pt-2">
            <h2 className="text-lg font-bold mb-3 px-1" style={{ color: "var(--uber-text)" }}>My Hosted Properties</h2>
            {loadingProperties ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="animate-pulse rounded-2xl p-4 h-28" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }} />
                ))}
              </div>
            ) : myProperties.length === 0 ? (
              <div className="rounded-2xl p-6 text-center" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <span className="text-4xl mb-2 block">🏢</span>
                <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>No Properties Listed</p>
                <p className="text-xs mt-1" style={{ color: "var(--uber-muted)" }}>Post your first property to start receiving inquiries.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myProperties.map(property => {
                  const isHostel = "manager_id" in property;
                  return (
                    <div key={property.id} className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                      <div className="flex justify-between items-start gap-3">
                        {property.images?.[0] ? (
                          <img src={property.images[0]} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" style={{ background: "var(--uber-surface)" }} />
                        ) : (
                          <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 text-xl" style={{ background: "var(--uber-surface)" }}>🏠</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold line-clamp-1" style={{ color: "var(--uber-text)" }}>{property.name || property.title}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded" style={{ color: "var(--uber-muted)", background: "var(--uber-surface)" }}>
                              {isHostel ? "Hostel" : "Home"}
                            </span>
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                              property.status === "approved" ? "text-white" :
                              property.status === "rented"   ? "text-white" :
                              ""
                            }`}
                              style={property.status === "approved" ? { background: UBER_GREEN } :
                                     property.status === "rented"   ? { background: "var(--uber-black)" } :
                                     { color: "var(--uber-text)", background: "var(--uber-surface)" }}
                            >
                              {property.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2" style={{ borderTop: "0.5px solid var(--uber-border)" }}>
                        <Link
                          href={isHostel ? `/hostels/${property.id}` : `/homes/${property.id}`}
                          className="flex-1 py-1.5 text-center text-xs font-bold rounded-lg active:scale-95"
                          style={{ color: "var(--uber-text)", background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }}
                        >
                          View
                        </Link>
                        <button
                          onClick={() => togglePropertyStatus(property.id, isHostel, property.status)}
                          className="flex-1 py-1.5 text-[10px] uppercase tracking-wider font-extrabold text-white rounded-lg active:scale-95"
                          style={{ background: UBER_GREEN }}
                        >
                          {property.status === "rented" ? "Mark Available" : "Mark Rented"}
                        </button>
                        <button
                          onClick={() => deleteProperty(property.id, isHostel)}
                          className="flex-1 py-1.5 text-[10px] uppercase tracking-wider font-extrabold text-red-500 bg-red-50 rounded-lg active:scale-95"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Agent Subscription */}
        {profile?.role !== "admin" && (profile?.role === "owner" || profile?.role === "manager") && (
          <div className="mb-6 pt-2">
            <h2 className="text-lg font-bold mb-3 px-1" style={{ color: "var(--uber-text)" }}>Agent Subscription</h2>
            {(profile as any)?.is_agent && new Date((profile as any)?.agent_subscription_until ?? 0) > new Date() ? (
              <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#06C167" }}>
                    <span className="text-white text-lg">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>Active Agent</p>
                    <p className="text-xs" style={{ color: "var(--uber-muted)" }}>
                      Expires {new Date((profile as any).agent_subscription_until).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="text-xs mt-3" style={{ color: "var(--uber-muted)" }}>
                  Your listings are tagged as agent properties. Post unlimited listings during your subscription.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>Become an Agent</p>
                <p className="text-xs mt-1 mb-3" style={{ color: "var(--uber-muted)" }}>
                  Post unlimited listings for GH₵100/month. Your name will appear on all your property cards.
                </p>
                <ul className="space-y-1 mb-4">
                  {["Post unlimited properties", "Agent badge on all your listings", "Your name displayed on property cards", "Direct contact shared after payment confirmation"].map(perk => (
                    <li key={perk} className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--uber-muted)" }}>
                      <span style={{ color: "#06C167" }}>✓</span> {perk}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    openPaystackPopup({
                      email: user?.email ?? "",
                      amount: AGENT_SUBSCRIPTION_PESEWAS,
                      currency: "GHS",
                      ref: `agent-sub-${user?.id}-${Date.now()}`,
                      metadata: { type: "agent_subscription", user_id: user?.id },
                      onSuccess: async (reference) => {
                        try {
                          await activateAgentSubscription(user!.id, reference);
                          // Update profile display name if not set
                          if (!(profile as any)?.display_name && profile?.fullName) {
                            await supabase.from("profiles").update({ display_name: profile.fullName }).eq("id", user!.id);
                          }
                          window.location.reload();
                        } catch {
                          alert("Payment received but activation failed. Contact support.");
                        }
                      },
                      onClose: () => {},
                    });
                  }}
                  className="w-full font-bold py-3 rounded-2xl active:scale-95 transition-transform text-sm"
                  style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
                >
                  Subscribe — GH₵100/month
                </button>
              </div>
            )}
          </div>
        )}

        {/* My Inquiries */}
        {profile?.role !== "admin" && (
          <div className="mb-6 pt-2">
            <h2 className="text-lg font-bold mb-3 px-1" style={{ color: "var(--uber-text)" }}>My Inquiries & Bookings</h2>
            {loadingTickets ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="animate-pulse rounded-2xl p-4 h-28" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }} />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="rounded-2xl p-6 text-center" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <span className="text-4xl mb-2 block">🏠</span>
                <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>No Inquiries Found</p>
                <p className="text-xs mt-1" style={{ color: "var(--uber-muted)" }}>Book a viewing or inquire about a property to see it here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map(ticket => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="rounded-2xl p-4 relative overflow-hidden flex flex-col cursor-pointer active:scale-[0.98] transition-all"
                    style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}
                  >
                    <div className="w-full flex justify-between items-start mb-4">
                      <div className="flex-1 pr-4">
                        <p className="text-sm font-bold line-clamp-1" style={{ color: "var(--uber-text)" }}>{ticket.listing_title}</p>
                        <span
                          className="inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded text-white"
                          style={{ background: ticket.status === "accepted" || ticket.status === "fee_paid" ? UBER_GREEN : "var(--uber-black)" }}
                        >
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                    <div className="w-full flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--uber-muted)" }}>Preferred Date</p>
                        <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>
                          {ticket.viewing_date ? new Date(ticket.viewing_date).toLocaleDateString([], { month: "short", day: "numeric" }) : "Not Specified"}
                        </p>
                      </div>
                      {ticket.status === "accepted" && (
                        <button
                          onClick={e => { e.stopPropagation(); handlePayCommitment(ticket); }}
                          disabled={payingId === ticket.id}
                          className="flex items-center gap-1 text-xs font-bold text-white px-3 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-60"
                          style={{ background: UBER_GREEN }}
                        >
                          {payingId === ticket.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : <>💳 Pay Fee</>}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* About */}
        <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
          <span className="text-xl">ℹ️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "var(--uber-text)" }}>About StayMate</p>
            <p className="text-xs" style={{ color: "var(--uber-muted)" }}>No agents. No commission.</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full mt-2 text-red-500 font-bold py-3 rounded-2xl active:scale-95 transition-transform text-sm"
          style={{ border: "0.5px solid rgba(239,68,68,0.3)", background: "#fff5f5" }}
        >
          Sign Out
        </button>
      </div>

      {/* Ticket Detail Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="rounded-t-3xl p-6 pb-12 w-full max-h-[85vh] overflow-y-auto"
              style={{ background: "var(--uber-white)" }}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-extrabold" style={{ color: "var(--uber-text)" }}>Inquiry Details</h3>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full active:scale-95 transition-transform"
                  style={{ background: "var(--uber-surface)", color: "var(--uber-muted)" }}
                >
                  ✕
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: UBER_GREEN }}>Property</p>
                  <p className="text-lg font-bold" style={{ color: "var(--uber-text)" }}>{selectedTicket.listing_title}</p>
                  <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: "var(--uber-muted)" }}>
                    <span className="text-sm">📅</span>
                    <span className="font-medium" style={{ color: "var(--uber-text)" }}>
                      {selectedTicket.viewing_date
                        ? new Date(selectedTicket.viewing_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
                        : "No specific date provided"}
                    </span>
                  </p>
                </div>

                {selectedTicket.message && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--uber-muted)" }}>Your Message</p>
                    <div className="p-4 rounded-2xl text-sm whitespace-pre-wrap" style={{ background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}>
                      {selectedTicket.message}
                    </div>
                  </div>
                )}

                {selectedTicket.status === "accepted" && (
                  <div className="rounded-2xl p-5" style={{ background: "#FDF8E7", border: "0.5px solid rgba(212,175,55,0.3)" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">💳</span>
                      <div>
                        <p className="text-sm font-extrabold" style={{ color: "var(--uber-text)" }}>GH₵ 200 Fee Required</p>
                        <p className="text-xs font-medium" style={{ color: "var(--uber-muted)" }}>Your inquiry has been accepted! Pay to secure your spot.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handlePayCommitment(selectedTicket)}
                      disabled={payingId === selectedTicket.id}
                      className="w-full py-3 text-white font-extrabold rounded-xl active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                      style={{ background: "var(--uber-black)" }}
                    >
                      {payingId === selectedTicket.id ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : <>Pay GH₵ 200 Fee</>}
                    </button>
                  </div>
                )}

                {(selectedTicket.status === "fee_paid" || selectedTicket.status === "paid") && (
                  <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "#EAFAF1", border: "0.5px solid rgba(6,193,103,0.3)" }}>
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>Fee Paid</p>
                      <p className="text-xs" style={{ color: "var(--uber-muted)" }}>Your spot is secured. The admin will be in touch shortly.</p>
                    </div>
                  </div>
                )}

                <Link
                  href="/chat"
                  className="flex items-center justify-between p-4 rounded-2xl hover:opacity-90 transition-opacity active:scale-[0.98]"
                  style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: "var(--uber-black)" }}>
                      <span className="text-white text-sm">💬</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>Chat with Admin</p>
                      <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: UBER_GREEN }}>Open Thread</p>
                    </div>
                  </div>
                  <span className="font-bold" style={{ color: "var(--uber-muted)" }}>→</span>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
