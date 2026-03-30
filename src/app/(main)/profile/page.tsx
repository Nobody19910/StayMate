"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { usePaystackScript, openPaystackPopup } from "@/lib/paystack";
import { activateAgentSubscription, sponsorProperty } from "@/lib/api";
import { AGENT_SUBSCRIPTION_PESEWAS, SPONSOR_TIERS } from "@/lib/sponsor-tiers";
import { useVisibilityRefresh } from "@/lib/use-visibility-refresh";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { IconPhone, IconHome, IconMailbox, IconCheck, IconCreditCard, IconCalendar, IconCheckCircle, IconChat, IconClose, IconStar } from "@/components/ui/Icons";

const ROLE_LABELS: Record<string, string> = {
  seeker:  "Property Seeker",
  owner:   "Property Owner",
  manager: "Property Owner",   // legacy — display same as owner
  admin:   "StayMate Admin",
  agent:   "StayMate Agent",
};

/* ── status helpers ── */
type ListingStatus = "active" | "rented" | "sponsored";

function getListingGroup(p: any): ListingStatus {
  const isSponsoredActive = p.is_sponsored && new Date(p.sponsored_until ?? 0) > new Date();
  if (isSponsoredActive) return "sponsored";
  if (p.status === "rented" || p.status === "sold" || p.status === "full") return "rented";
  return "active";
}

const STATUS_ORDER: ListingStatus[] = ["sponsored", "active", "rented"];

/* ── Booking badge ── */
function BookingStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { background: string; color: string }> = {
    pending: { background: "var(--warning-bg)", color: "var(--warning-text)" },
    accepted: { background: "var(--success-bg)", color: "var(--uber-green)" },
    confirmed: { background: "var(--uber-surface2)", color: "var(--uber-text)" },
    fee_paid: { background: "var(--success-bg)", color: "var(--uber-green)" },
    cancelled: { background: "var(--error-bg)", color: "var(--error-text)" },
    rejected: { background: "var(--error-bg)", color: "var(--error-text)" },
    completed: { background: "var(--info-bg)", color: "var(--info-text)" },
  };
  const s = styles[status] ?? { background: "var(--uber-surface2)", color: "var(--uber-muted)" };
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={s}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  usePaystackScript();

  /* ── State ── */
  const [myProperties, setMyProperties] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Edit profile
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Sponsorship
  const [sponsoringId, setSponsoringId] = useState<string | null>(null);
  const [payingSponsor, setPayingSponsor] = useState(false);

  // Dashboard tab
  const [dashTab, setDashTab] = useState<"listings" | "bookings" | "analytics">("listings");

  // Listing sort
  const [sortBy, setSortBy] = useState<"newest" | "price" | "status">("newest");

  // Ticket modal
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Deleting
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* ── Data fetching ── */
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    const isAdmin = profile?.role === "admin";
    const isOwnerOrManager = profile?.role === "owner" || profile?.role === "manager" || profile?.role === "agent";

    const promises: Promise<any>[] = [];

    // Fetch properties (owner/manager/admin)
    if (isOwnerOrManager || isAdmin) {
      const homesQ = supabase.from("homes").select("*");
      const hostelsQ = supabase.from("hostels").select("*");
      const bookingsQ = supabase.from("bookings").select("*").order("created_at", { ascending: false });

      if (!isAdmin) {
        homesQ.eq("owner_id", user.id);
        hostelsQ.eq("manager_id", user.id);
        bookingsQ.eq("owner_id", user.id);
      }

      promises.push(
        Promise.all([homesQ, hostelsQ, bookingsQ]).then(([h, ho, b]) => {
          const combined = [
            ...(h.data || []).map((x: any) => ({ ...x, _type: "home" })),
            ...(ho.data || []).map((x: any) => ({ ...x, _type: "hostel" })),
          ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setMyProperties(combined);
          setBookings(b.data ?? []);
        })
      );
    } else {
      setMyProperties([]);
      setBookings([]);
    }

    // Fetch seeker tickets (inquiries)
    if (!isAdmin) {
      promises.push(
        supabase
          .from("bookings")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .then(({ data }) => {
            setTickets(
              (data ?? []).map((b: any) => ({
                ...b,
                listing_title: b.property_type === "home" ? "Home Inquiry" : "Hostel Room Inquiry",
              }))
            );
          })
      );
    }

    await Promise.all(promises);
    setLoadingData(false);
  }, [user, profile?.role]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Jiji-style: refetch on tab focus / navigate-back
  useVisibilityRefresh(fetchAll, { enabled: !!user });

  useEffect(() => {
    if (profile) {
      setEditName(profile.fullName || "");
      setEditPhone(profile.phone || "");
    }
  }, [profile]);

  /* ── Grouped & sorted listings ── */
  const groupedListings = useMemo(() => {
    const groups: Record<ListingStatus, any[]> = { sponsored: [], active: [], rented: [] };
    myProperties.forEach((p) => groups[getListingGroup(p)].push(p));

    // Sort within each group
    const sortFn = (a: any, b: any) => {
      if (sortBy === "price") return (b.price ?? b.price_range_max ?? 0) - (a.price ?? a.price_range_max ?? 0);
      if (sortBy === "status") return (a.status ?? "").localeCompare(b.status ?? "");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    };
    Object.values(groups).forEach((arr) => arr.sort(sortFn));
    return groups;
  }, [myProperties, sortBy]);

  /* ── Analytics / earnings ── */
  const analytics = useMemo(() => {
    const paidBookings = bookings.filter((b: any) => b.status === "fee_paid" || b.status === "completed");
    const totalEarnings = paidBookings.length * 200; // GH₵200 per paid booking
    const pendingCount = bookings.filter((b: any) => b.status === "pending").length;
    const confirmedCount = bookings.filter((b: any) => b.status === "confirmed" || b.status === "accepted").length;
    const completedCount = bookings.filter((b: any) => b.status === "completed").length;
    const sponsoredCount = myProperties.filter(
      (p) => p.is_sponsored && new Date(p.sponsored_until ?? 0) > new Date()
    ).length;
    const daysListed = myProperties.length > 0
      ? Math.round(
          myProperties.reduce((sum, p) => sum + (Date.now() - new Date(p.created_at).getTime()), 0) /
            myProperties.length /
            86400000
        )
      : 0;
    return { totalEarnings, paidBookings: paidBookings.length, pendingCount, confirmedCount, completedCount, sponsoredCount, daysListed };
  }, [bookings, myProperties]);

  /* ── Handlers ── */
  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    await supabase.from("profiles").update({ full_name: editName, phone: editPhone }).eq("id", user.id);
    setIsEditingProfile(false);
    window.location.reload();
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) {
      alert("Error uploading avatar");
      setUploadingAvatar(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);
    setUploadingAvatar(false);
    window.location.reload();
  }

  async function deleteProperty(id: string, isHostel: boolean) {
    if (!confirm("Are you sure you want to permanently delete this listing?")) return;
    setDeletingId(id);
    const table = isHostel ? "hostels" : "homes";
    await supabase.from(table).delete().eq("id", id);
    setMyProperties((prev) => prev.filter((p) => p.id !== id));
    setDeletingId(null);
  }

  async function updateListingStatus(id: string, isHostel: boolean, status: string) {
    const table = isHostel ? "hostels" : "homes";
    const { error } = await supabase.from(table).update({ status }).eq("id", id);
    if (error) {
      alert(`Failed to update: ${error.message}`);
      return;
    }
    setMyProperties((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }

  async function updateBookingStatus(id: string, status: string) {
    await supabase.from("bookings").update({ status }).eq("id", id);
    setBookings((prev) => prev.map((b: any) => (b.id === id ? { ...b, status } : b)));
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
        await supabase.from("bookings").update({ status: "fee_paid", payment_reference: reference }).eq("id", ticket.id);
        setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status: "fee_paid", payment_reference: reference } : t)));
        if (selectedTicket?.id === ticket.id) {
          setSelectedTicket((prev: any) => (prev ? { ...prev, status: "fee_paid" } : prev));
        }
        setPayingId(null);
      },
      onClose: () => setPayingId(null),
    });
  }

  /* ── Loading / auth guards ── */
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
          <Link href="/login" className="block text-white font-bold text-center py-3.5 rounded-2xl active:scale-95 transition-transform" style={{ background: "var(--uber-black)" }}>
            Sign In
          </Link>
          <Link href="/signup" className="block font-bold text-center py-3.5 rounded-2xl active:scale-95 transition-transform" style={{ background: "var(--uber-green)", color: "#fff" }}>
            Create Account
          </Link>
          <div className="rounded-xl px-4 py-3 mt-4" style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }}>
            <p className="text-xs font-medium text-center" style={{ color: "var(--uber-muted)" }}>
              List your property or find your next home — premium listings across Ghana.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const initials = (profile?.fullName ?? user.email ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const isOwnerOrManager = profile?.role === "owner" || profile?.role === "manager" || profile?.role === "agent" || profile?.role === "admin";

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
            <label className="absolute bottom-3 -right-2 text-white p-1.5 rounded-full shadow-md cursor-pointer active:scale-95 transition-transform" style={{ background: "var(--uber-green)" }}>
              {uploadingAvatar ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
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
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required className="w-full text-center font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2" style={{ color: "var(--uber-text)", background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--uber-muted)" }}>Phone Number</label>
              <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required className="w-full text-center font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2" style={{ color: "var(--uber-text)", background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }} />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 py-2 text-xs font-bold rounded-xl" style={{ color: "var(--uber-muted)", background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }}>
                Cancel
              </button>
              <button type="submit" className="flex-1 py-2 text-xs font-bold text-white rounded-xl" style={{ background: "var(--uber-black)" }}>
                Save
              </button>
            </div>
          </form>
        ) : (
          <>
            <h1 className="text-lg font-bold" style={{ color: "var(--uber-text)" }}>{profile?.fullName ?? "Your Account"}</h1>
            {profile && (
              <span className="mt-1 text-[11px] font-bold uppercase text-white px-2 py-0.5 rounded" style={{ background: (profile as any).is_agent ? "#7c3aed" : "var(--uber-green)" }}>
                {(profile as any).is_agent ? "StayMate Agent" : (ROLE_LABELS[profile.role] ?? profile.role)}
              </span>
            )}
            <p className="text-xs mt-1" style={{ color: "var(--uber-muted)" }}>{user.email}</p>
            <button onClick={() => setIsEditingProfile(true)} className="mt-3 text-xs font-bold px-4 py-1.5 rounded-full active:scale-95 transition-transform" style={{ background: "var(--uber-surface)", color: "var(--uber-black)", border: "0.5px solid var(--uber-border)" }}>
              Edit Profile
            </button>
          </>
        )}
      </div>

      <div className="px-4 py-6 space-y-3 max-w-4xl mx-auto">
        {/* Contact */}
        {!isEditingProfile && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-2" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
            <IconPhone />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: "var(--uber-text)" }}>Contact Number</p>
              <p className="text-xs" style={{ color: "var(--uber-muted)" }}>{profile?.phone ?? "Update your profile to set your phone number"}</p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── OWNER / MANAGER DASHBOARD (merged inline) ── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {isOwnerOrManager && (
          <div className="pt-2">
            {/* Dashboard shortcut */}
            <Link href="/dashboard" className="flex items-center justify-between px-4 py-3 rounded-2xl mb-4"
              style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>My Dashboard</p>
                <p className="text-xs" style={{ color: "var(--uber-muted)" }}>Pipeline, properties & pending queue</p>
              </div>
              <span className="text-lg" style={{ color: "var(--uber-green)" }}>→</span>
            </Link>
            {/* Stats bar */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <p className="text-2xl font-extrabold" style={{ color: "var(--uber-text)" }}>{myProperties.length}</p>
                <p className="text-[9px] font-semibold mt-0.5" style={{ color: "var(--uber-muted)" }}>Listings</p>
              </div>
              <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "var(--warning-bg)", border: "0.5px solid rgba(245,158,11,0.15)" }}>
                <p className="text-2xl font-extrabold" style={{ color: "var(--warning-text)" }}>{analytics.pendingCount}</p>
                <p className="text-[9px] font-semibold mt-0.5" style={{ color: "var(--warning-text)" }}>Pending</p>
              </div>
              <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "var(--success-bg)", border: "0.5px solid rgba(var(--uber-green-rgb),0.15)" }}>
                <p className="text-2xl font-extrabold" style={{ color: "var(--uber-green)" }}>{analytics.completedCount}</p>
                <p className="text-[9px] font-semibold mt-0.5" style={{ color: "var(--uber-green)" }}>Completed</p>
              </div>
              <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "var(--gold-light)", border: "0.5px solid rgba(212,175,55,0.15)" }}>
                <p className="text-2xl font-extrabold" style={{ color: "var(--gold)" }}>{analytics.sponsoredCount}</p>
                <p className="text-[9px] font-semibold mt-0.5" style={{ color: "var(--gold)" }}>Sponsored</p>
              </div>
            </div>

            {/* Dashboard tabs */}
            <div className="flex gap-1 rounded-xl p-1 mb-4" style={{ background: "var(--uber-surface)" }}>
              {(["listings", "bookings", "analytics"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDashTab(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors capitalize ${dashTab === t ? "shadow-sm" : ""}`}
                  style={dashTab === t ? { background: "var(--uber-white)", color: "var(--uber-text)" } : { color: "var(--uber-muted)" }}
                >
                  {t}
                  {t === "bookings" && analytics.pendingCount > 0 && (
                    <span className="ml-1 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--warning-text)" }}>
                      {analytics.pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Listings Tab ── */}
            {dashTab === "listings" && (
              <>
                {/* Sort + New listing */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-1">
                    {(["newest", "price", "status"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSortBy(s)}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg capitalize transition-colors"
                        style={sortBy === s ? { background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" } : { color: "var(--uber-muted)", background: "var(--uber-surface)" }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => router.push("/post")}
                    className="font-bold text-xs px-3 py-1.5 rounded-xl active:scale-95 transition-transform"
                    style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
                  >
                    + New
                  </button>
                </div>

                {myProperties.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <IconHome className="w-12 h-12" />
                    <p className="text-base font-semibold" style={{ color: "var(--uber-muted)" }}>No listings yet</p>
                    <p className="text-sm mt-1" style={{ color: "var(--uber-muted)" }}>Post your first property to get started</p>
                    <button onClick={() => router.push("/post")} className="mt-4 font-bold px-6 py-3 rounded-2xl text-sm active:scale-95 transition-transform" style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>
                      Post a Listing
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {STATUS_ORDER.map((group) => {
                      const items = groupedListings[group];
                      if (items.length === 0) return null;
                      return (
                        <div key={group}>
                          <div className="flex items-center gap-2 mb-2 px-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{
                                background: group === "sponsored" ? "var(--gold)" : group === "active" ? "var(--uber-green)" : "var(--error-text)",
                              }}
                            />
                            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--uber-muted)" }}>
                              {group === "sponsored" ? "Sponsored" : group === "active" ? "Active" : "Rented / Sold / Full"} ({items.length})
                            </p>
                          </div>
                          {items.map((property: any, i: number) => (
                            <PropertyCard
                              key={property.id}
                              property={property}
                              index={i}
                              user={user}
                              sponsoringId={sponsoringId}
                              setSponsoringId={setSponsoringId}
                              payingSponsor={payingSponsor}
                              setPayingSponsor={setPayingSponsor}
                              deletingId={deletingId}
                              onDelete={deleteProperty}
                              onStatusChange={updateListingStatus}
                              onSponsor={async (propertyId, isHostel, tier) => {
                                setPayingSponsor(true);
                                openPaystackPopup({
                                  email: user?.email ?? "",
                                  amount: tier.pricePesewas,
                                  currency: "GHS",
                                  ref: `sponsor-${propertyId}-${tier.tier}-${Date.now()}`,
                                  metadata: { type: "sponsor", property_id: propertyId, tier: tier.tier },
                                  onSuccess: async (reference) => {
                                    try {
                                      await sponsorProperty(isHostel ? "hostels" : "homes", propertyId, tier.tier, tier.durationDays, reference, user!.id);
                                      setMyProperties((prev) =>
                                        prev.map((p) =>
                                          p.id === propertyId
                                            ? { ...p, is_sponsored: true, sponsor_tier: tier.tier, sponsored_until: new Date(Date.now() + tier.durationDays * 86400000).toISOString() }
                                            : p
                                        )
                                      );
                                      setSponsoringId(null);
                                    } catch {
                                      alert("Payment received but sponsorship activation failed. Contact support.");
                                    }
                                    setPayingSponsor(false);
                                  },
                                  onClose: () => setPayingSponsor(false),
                                });
                              }}
                              router={router}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── Bookings Tab ── */}
            {dashTab === "bookings" && (
              <div className="space-y-3">
                {bookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <IconMailbox className="w-12 h-12" />
                    <p className="text-base font-semibold" style={{ color: "var(--uber-muted)" }}>No booking requests yet</p>
                    <p className="text-sm mt-1" style={{ color: "var(--uber-muted)" }}>Requests will appear here when seekers inquire about your properties</p>
                  </div>
                ) : (
                  bookings.map((booking: any, i: number) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="rounded-2xl p-4"
                      style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>{booking.listing_title ?? "Property Inquiry"}</p>
                          <p className="text-xs font-semibold" style={{ color: "var(--uber-text)" }}>{booking.price_label}</p>
                        </div>
                        <BookingStatusBadge status={booking.status} />
                      </div>
                      {(booking.seeker_name || booking.seeker_email) && (
                        <div className="rounded-xl px-3 py-2 space-y-1 mb-3" style={{ background: "var(--background)" }}>
                          {booking.seeker_name && <p className="text-xs font-semibold" style={{ color: "var(--uber-text)" }}>{booking.seeker_name}</p>}
                          {booking.seeker_email && <p className="text-[11px]" style={{ color: "var(--uber-muted)" }}>{booking.seeker_email}</p>}
                          {booking.seeker_phone && (
                            <a href={`tel:${booking.seeker_phone}`} className="text-[11px] font-semibold" style={{ color: "var(--uber-text)" }}>
                              <IconPhone /> {booking.seeker_phone}
                            </a>
                          )}
                        </div>
                      )}
                      {booking.status === "pending" && (
                        <div className="flex gap-2">
                          <button onClick={() => updateBookingStatus(booking.id, "confirmed")} className="flex-1 font-bold text-xs py-2.5 rounded-xl active:scale-95 transition-transform" style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>
                            Confirm
                          </button>
                          <button onClick={() => updateBookingStatus(booking.id, "cancelled")} className="flex-1 font-bold text-xs py-2.5 rounded-xl active:scale-95 transition-transform" style={{ border: "0.5px solid var(--error-border)", color: "var(--error-text)" }}>
                            Decline
                          </button>
                        </div>
                      )}
                      {booking.status === "confirmed" && (
                        <button onClick={() => updateBookingStatus(booking.id, "completed")} className="w-full font-bold text-xs py-2.5 rounded-xl active:scale-95 transition-transform" style={{ background: "var(--info-bg)", color: "var(--info-text)" }}>
                          Mark as Completed (Payment Received)
                        </button>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* ── Analytics Tab ── */}
            {dashTab === "analytics" && (
              <div className="space-y-4">
                {/* Earnings card */}
                <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--uber-muted)" }}>Total Earnings</p>
                  <p className="text-3xl font-extrabold" style={{ color: "var(--uber-text)" }}>
                    GH₵ {analytics.totalEarnings.toLocaleString()}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--uber-muted)" }}>
                    From {analytics.paidBookings} paid {analytics.paidBookings === 1 ? "booking" : "bookings"} (GH₵ 200 each)
                  </p>
                </div>

                {/* Performance grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-4" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--uber-muted)" }}>Active Listings</p>
                    <p className="text-2xl font-extrabold mt-1" style={{ color: "var(--uber-text)" }}>{groupedListings.active.length + groupedListings.sponsored.length}</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--uber-muted)" }}>Avg Days Listed</p>
                    <p className="text-2xl font-extrabold mt-1" style={{ color: "var(--uber-text)" }}>{analytics.daysListed}</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--uber-muted)" }}>Total Inquiries</p>
                    <p className="text-2xl font-extrabold mt-1" style={{ color: "var(--uber-text)" }}>{bookings.length}</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--uber-muted)" }}>Conversion Rate</p>
                    <p className="text-2xl font-extrabold mt-1" style={{ color: "var(--uber-text)" }}>
                      {bookings.length > 0 ? Math.round((analytics.paidBookings / bookings.length) * 100) : 0}%
                    </p>
                  </div>
                </div>

                {/* Sponsorship spend */}
                <div className="rounded-2xl p-5" style={{ background: "var(--gold-light)", border: "0.5px solid rgba(212,175,55,0.15)" }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--gold)" }}>Sponsored Listings</p>
                  <p className="text-xl font-extrabold" style={{ color: "var(--uber-text)" }}>
                    {analytics.sponsoredCount} active
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--uber-muted)" }}>
                    {analytics.sponsoredCount > 0
                      ? "Your sponsored listings appear first in browse results"
                      : "Sponsor a listing to boost visibility and get more inquiries"}
                  </p>
                </div>

                {/* Booking funnel */}
                <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--uber-muted)" }}>Booking Funnel</p>
                  {[
                    { label: "Pending", count: analytics.pendingCount, color: "var(--warning-text)" },
                    { label: "Confirmed", count: analytics.confirmedCount, color: "var(--info-text)" },
                    { label: "Paid", count: analytics.paidBookings, color: "var(--uber-green)" },
                    { label: "Completed", count: analytics.completedCount, color: "#8B5CF6" },
                  ].map((step) => (
                    <div key={step.label} className="flex items-center gap-3 mb-2 last:mb-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: step.color }} />
                      <p className="flex-1 text-xs font-semibold" style={{ color: "var(--uber-text)" }}>{step.label}</p>
                      <p className="text-sm font-extrabold" style={{ color: step.color }}>{step.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Agent Subscription ── */}
        {profile?.role !== "admin" && (
          <div className="mb-6 pt-2">
            <h2 className="text-lg font-bold mb-3 px-1" style={{ color: "var(--uber-text)" }}>Agent Subscription</h2>
            {(profile as any)?.is_agent && new Date((profile as any)?.agent_subscription_until ?? 0) > new Date() ? (
              <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--uber-green)" }}>
                    <IconCheck />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>Active Agent</p>
                    <p className="text-xs" style={{ color: "var(--uber-muted)" }}>Expires {new Date((profile as any).agent_subscription_until).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="text-xs mt-3" style={{ color: "var(--uber-muted)" }}>Your listings are tagged as agent properties. Post unlimited listings during your subscription.</p>
                <button
                  onClick={async () => {
                    if (!confirm("Cancel your agent subscription? You'll keep access until the current period ends, but won't be renewed.")) return;
                    await supabase.from("profiles").update({ is_agent: false, agent_subscription_until: null }).eq("id", user!.id);
                    await supabase.from("profiles").update({ role: "owner" }).eq("id", user!.id);
                    fetchAll();
                  }}
                  className="mt-3 text-xs font-semibold underline"
                  style={{ color: "var(--uber-muted)" }}
                >
                  Cancel subscription
                </button>
              </div>
            ) : (
              <div className="rounded-2xl p-5" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>Become a Concierge Agent</p>
                <p className="text-xs mt-1 mb-3" style={{ color: "var(--uber-muted)" }}>Subscribe for GH₵100/month, then complete a quick ID verification. Once approved, you'll be a verified StayMate Agent.</p>
                <ul className="space-y-1 mb-4">
                  {["Post unlimited properties", "Agent badge on all your listings", "Your name displayed on property cards", "Direct contact shared after payment confirmation"].map((perk) => (
                    <li key={perk} className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--uber-muted)" }}>
                      <IconCheck /> {perk}
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
                          if (!(profile as any)?.display_name && profile?.fullName) {
                            await supabase.from("profiles").update({ display_name: profile.fullName }).eq("id", user!.id);
                          }
                          fetchAll();
                          router.push("/apply");
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

        {/* ── My Inquiries (seeker view) ── */}
        {profile?.role !== "admin" && (
          <div className="mb-6 pt-2">
            <h2 className="text-lg font-bold mb-3 px-1" style={{ color: "var(--uber-text)" }}>My Inquiries & Bookings</h2>
            {loadingData ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse rounded-2xl p-4 h-28" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }} />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="rounded-2xl p-6 text-center" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <IconHome className="w-12 h-12" />
                <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>No Inquiries Found</p>
                <p className="text-xs mt-1" style={{ color: "var(--uber-muted)" }}>Book a viewing or inquire about a property to see it here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="rounded-2xl p-4 relative overflow-hidden flex flex-col cursor-pointer active:scale-[0.98] transition-all"
                    style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}
                  >
                    <div className="w-full flex justify-between items-start mb-4">
                      <div className="flex-1 pr-4">
                        <p className="text-sm font-bold line-clamp-1" style={{ color: "var(--uber-text)" }}>{ticket.listing_title}</p>
                        <span className="inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded text-white" style={{ background: ticket.status === "accepted" || ticket.status === "fee_paid" ? "var(--uber-green)" : "var(--uber-black)" }}>
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
                          onClick={(e) => { e.stopPropagation(); handlePayCommitment(ticket); }}
                          disabled={payingId === ticket.id}
                          className="flex items-center gap-1 text-xs font-bold text-white px-3 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-60"
                          style={{ background: "var(--uber-green)" }}
                        >
                          {payingId === ticket.id ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><IconCreditCard /> Pay Fee</>}
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
            <p className="text-xs" style={{ color: "var(--uber-muted)" }}>Property listings & sales across Ghana.</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full mt-2 text-red-500 font-bold py-3 rounded-2xl active:scale-95 transition-transform text-sm"
          style={{ border: "0.5px solid var(--error-border)", background: "var(--error-bg)" }}
        >
          Sign Out
        </button>
      </div>

      {/* ── Ticket Detail Modal ── */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="rounded-t-3xl p-6 pb-12 w-full max-h-[85vh] overflow-y-auto"
              style={{ background: "var(--uber-white)" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-extrabold" style={{ color: "var(--uber-text)" }}>Inquiry Details</h3>
                <button onClick={() => setSelectedTicket(null)} className="w-8 h-8 flex items-center justify-center rounded-full active:scale-95 transition-transform" style={{ background: "var(--uber-surface)", color: "var(--uber-muted)" }}>
                  <IconClose />
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--uber-green)" }}>Property</p>
                  <p className="text-lg font-bold" style={{ color: "var(--uber-text)" }}>{selectedTicket.listing_title}</p>
                  <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: "var(--uber-muted)" }}>
                    <IconCalendar />
                    <span className="font-medium" style={{ color: "var(--uber-text)" }}>
                      {selectedTicket.viewing_date ? new Date(selectedTicket.viewing_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : "No specific date provided"}
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
                  <div className="rounded-2xl p-5" style={{ background: "color-mix(in srgb, var(--gold) 15%, var(--uber-surface))", border: "0.5px solid rgba(212,175,55,0.3)" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <IconCreditCard />
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
                      {payingId === selectedTicket.id ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Pay GH₵ 200 Fee</>}
                    </button>
                  </div>
                )}
                {(selectedTicket.status === "fee_paid" || selectedTicket.status === "paid") && (
                  <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "color-mix(in srgb, var(--uber-green) 12%, var(--uber-surface))", border: "0.5px solid rgba(var(--uber-green-rgb),0.3)" }}>
                    <IconCheckCircle />
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>Fee Paid</p>
                      <p className="text-xs" style={{ color: "var(--uber-muted)" }}>Your spot is secured. The admin will be in touch shortly.</p>
                    </div>
                  </div>
                )}
                <Link href="/chat" className="flex items-center justify-between p-4 rounded-2xl hover:opacity-90 transition-opacity active:scale-[0.98]" style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: "var(--uber-black)" }}>
                      <IconChat />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>Chat with Admin</p>
                      <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--uber-green)" }}>Open Thread</p>
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

/* ══════════════════════════════════════════════════════════════════════════════ */
/* ── Property Card Component ── */
/* ══════════════════════════════════════════════════════════════════════════════ */

function PropertyCard({
  property,
  index,
  user,
  sponsoringId,
  setSponsoringId,
  payingSponsor,
  setPayingSponsor,
  deletingId,
  onDelete,
  onStatusChange,
  onSponsor,
  router,
}: {
  property: any;
  index: number;
  user: any;
  sponsoringId: string | null;
  setSponsoringId: (id: string | null) => void;
  payingSponsor: boolean;
  setPayingSponsor: (v: boolean) => void;
  deletingId: string | null;
  onDelete: (id: string, isHostel: boolean) => void;
  onStatusChange: (id: string, isHostel: boolean, status: string) => void;
  onSponsor: (id: string, isHostel: boolean, tier: any) => void;
  router: any;
}) {
  const isHostel = property._type === "hostel";
  const isSponsoredActive = property.is_sponsored && new Date(property.sponsored_until ?? 0) > new Date();
  const showSponsorPicker = sponsoringId === property.id;
  const isRentedOrSold = property.status === "rented" || property.status === "sold" || property.status === "full";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-2xl p-4 mb-3"
      style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}
    >
      <div className="flex gap-3">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0" style={{ background: "var(--uber-surface)" }}>
          {property.images?.[0] ? (
            <Image src={property.images[0]} alt="" fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><IconHome /></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight truncate" style={{ color: "var(--uber-text)" }}>
            {property.name || property.title}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded" style={{ color: "var(--uber-muted)", background: "var(--uber-surface)" }}>
              {isHostel ? "Hostel" : "Home"}
            </span>
            {isRentedOrSold && (
              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded text-white" style={{ background: "var(--error-text)" }}>
                {property.status}
              </span>
            )}
            {!isRentedOrSold && (
              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded text-white" style={{ background: "var(--uber-green)" }}>
                {property.status ?? "active"}
              </span>
            )}
            {isSponsoredActive && (
              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded shimmer-gold" style={{ color: "var(--uber-black)" }}><IconStar /> Sponsored</span>
            )}
          </div>
          <p className="text-xs font-semibold mt-1" style={{ color: "var(--uber-text)" }}>
            {property.price_label || property.price_range_label}
          </p>
          <p className="text-[10px]" style={{ color: "var(--uber-muted)" }}>
            {property.city}
            {isHostel && ` · ${property.available_rooms ?? 0}/${property.total_rooms ?? 0} rooms`}
          </p>
        </div>
      </div>

      {/* Sponsor tier picker */}
      <AnimatePresence>
        {showSponsorPicker && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-3 mt-3 space-y-2" style={{ borderTop: "0.5px solid var(--uber-border)" }}>
              <p className="text-xs font-bold" style={{ color: "var(--uber-text)" }}>Choose a Sponsorship Plan</p>
              {SPONSOR_TIERS.map((tier) => (
                <button
                  key={tier.tier}
                  disabled={payingSponsor}
                  onClick={() => onSponsor(property.id, isHostel, tier)}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-xl active:scale-[0.98] transition-all disabled:opacity-60"
                  style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }}
                >
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold" style={{ color: "var(--uber-text)" }}>{tier.label}</p>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "var(--uber-surface2)", color: "var(--uber-muted)" }}>
                        {tier.durationDays} days
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {tier.perks.map((perk) => (
                        <p key={perk} className="text-[10px] flex items-center gap-1" style={{ color: "var(--uber-muted)" }}>
                          <IconCheck /> {perk}
                        </p>
                      ))}
                    </div>
                  </div>
                  <span className="text-sm font-extrabold shrink-0 ml-3" style={{ color: "var(--gold)" }}>GH₵{tier.price}</span>
                </button>
              ))}
              <button onClick={() => setSponsoringId(null)} className="w-full text-xs font-bold py-1.5" style={{ color: "var(--uber-muted)" }}>
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-2 pt-3 mt-3" style={{ borderTop: showSponsorPicker ? "none" : "0.5px solid var(--uber-border)" }}>
        <Link
          href={isHostel ? `/hostels/${property.id}` : `/homes/${property.id}`}
          className="flex-1 py-1.5 text-center text-[10px] font-bold rounded-lg active:scale-95"
          style={{ color: "var(--uber-text)", background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }}
        >
          View
        </Link>
        <button
          onClick={() => router.push(`/edit/${property.id}?type=${isHostel ? "hostel" : "home"}`)}
          className="flex-1 py-1.5 text-[10px] font-bold rounded-lg active:scale-95"
          style={{ background: "var(--info-bg)", color: "var(--info-text)" }}
        >
          Edit
        </button>
        {!isSponsoredActive && !showSponsorPicker && (
          <button
            onClick={() => setSponsoringId(property.id)}
            className="flex-1 py-1.5 text-[10px] uppercase tracking-wider font-extrabold rounded-lg active:scale-95"
            style={{ background: "var(--gold)", color: "var(--uber-black)" }}
          >
            <IconStar /> Sponsor
          </button>
        )}
        {!isRentedOrSold ? (
          <button
            onClick={() => onStatusChange(property.id, isHostel, isHostel ? "full" : property.for_sale ? "sold" : "rented")}
            className="py-1.5 px-2 text-[10px] font-bold rounded-lg active:scale-95"
            style={{ background: "var(--uber-surface2)", color: "var(--uber-muted)" }}
          >
            {isHostel ? "Full" : property.for_sale ? "Sold" : "Rented"}
          </button>
        ) : (
          <button
            onClick={() => onStatusChange(property.id, isHostel, "approved")}
            className="py-1.5 px-2 text-[10px] font-bold rounded-lg active:scale-95"
            style={{ background: "var(--success-bg)", color: "var(--uber-green)" }}
          >
            Re-activate
          </button>
        )}
        <button
          onClick={() => onDelete(property.id, isHostel)}
          disabled={deletingId === property.id}
          className="py-1.5 px-2 text-[10px] font-bold rounded-lg active:scale-95 disabled:opacity-50"
          style={{ background: "var(--error-bg)", color: "var(--error-text)" }}
        >
          {deletingId === property.id ? "…" : <IconClose />}
        </button>
      </div>
    </motion.div>
  );
}
