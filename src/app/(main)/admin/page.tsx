"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { toggleSponsored, toggleVerified, getActiveAgents } from "@/lib/api";
import AdminLocationButton from "@/components/ui/AdminLocationButton";
import { IconChart, IconBuilding, IconTie, IconIdCard, IconStar, IconTarget, IconChat, IconNeighborhood, IconWarning, IconPhone, IconPin, IconCheck, IconClose, IconBroom, IconTrash, IconCheckCircle, IconMailbox, IconShrug, IconMail } from "@/components/ui/Icons";
import OptimizedImage from "@/components/ui/OptimizedImage";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();

  const [homes, setHomes] = useState<any[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [kyc, setKyc] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<"dashboard" | "properties" | "queue" | "audit" | "leads" | "agents" | "featured">("dashboard");
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [subscribedAgents, setSubscribedAgents] = useState<any[]>([]);



  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "admin")) {
      router.push("/");
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (profile?.role !== "admin") return;

    async function fetchData() {
      setLoading(true);
      const [homesRes, hostelsRes, bookingsRes, leadsRes, kycRes, agentsRes] = await Promise.all([
        supabase.from("homes").select("*").order("created_at", { ascending: false }),
        supabase.from("hostels").select("*").order("created_at", { ascending: false }),
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("landlord_leads").select("*").order("created_at", { ascending: false }),
        supabase.from("kyc_submissions").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").neq("role", "admin"),
      ]);

      const allProfiles = agentsRes.data || [];
      const allHomes = homesRes.data || [];
      const allHostels = hostelsRes.data || [];

      // Manually join profiles + property to bookings
      const mappedBookings = (bookingsRes.data || []).map((b) => {
        const property = b.property_type === "home"
          ? allHomes.find((h: any) => h.id === b.property_id)
          : allHostels.find((h: any) => h.id === b.property_id);
        return {
          ...b,
          user: allProfiles.find(p => p.id === b.user_id) || null,
          property: property || null,
        };
      });

      const mappedKyc = (kycRes.data || []).map((k) => ({
        ...k,
        user: allProfiles.find(p => p.id === k.user_id) || null
      }));

      if (bookingsRes.error) console.error("Bookings fetch error:", bookingsRes.error);

      setHomes(homesRes.data || []);
      setHostels(hostelsRes.data || []);
      setBookings(mappedBookings);
      setLeads(leadsRes.data || []);
      setKyc(mappedKyc);
      setAgents(allProfiles);
      setLoading(false);

      // Fetch subscribed agents
      getActiveAgents().then(setSubscribedAgents).catch(() => {});
    }
    fetchData();
  }, [profile]);

  const liveHomes = useMemo(() => homes.filter(h => h.status === "approved"), [homes]);
  const pendingHomes = useMemo(() => homes.filter(h => h.status === "pending_admin"), [homes]);

  const liveHostels = useMemo(() => hostels.filter(h => h.status === "approved"), [hostels]);
  const pendingHostels = useMemo(() => hostels.filter(h => h.status === "pending_admin"), [hostels]);

  const pendingKyc = useMemo(() => kyc.filter(k => k.status === "pending"), [kyc]);

  const totalInquiries = useMemo(() => bookings.length, [bookings]);
  const activeAgentIds = useMemo(() => new Set([...homes.filter(h => h.owner_id).map(h => h.owner_id), ...hostels.filter(h => h.manager_id).map(h => h.manager_id)]), [homes, hostels]);
  const activeAgents = activeAgentIds.size;

  // Agents who have at least one listing
  const activeAgentProfiles = useMemo(() => {
    return agents.filter(a => activeAgentIds.has(a.id));
  }, [agents, activeAgentIds]);

  // Properties for a selected agent
  const agentHomes = useMemo(() => selectedAgentId ? homes.filter(h => h.owner_id === selectedAgentId) : [], [homes, selectedAgentId]);
  const agentHostels = useMemo(() => selectedAgentId ? hostels.filter(h => h.manager_id === selectedAgentId) : [], [hostels, selectedAgentId]);



  async function approveProperty(id: string, type: "home" | "hostel") {
    const adminPhone = profile?.phone || "+233 20 000 0000";
    if (type === "home") {
      await supabase.from("homes").update({ status: "approved", owner_phone: adminPhone }).eq("id", id);
      setHomes(prev => prev.map(h => h.id === id ? { ...h, status: "approved", owner_phone: adminPhone } : h));
    } else {
      await supabase.from("hostels").update({ status: "approved", manager_phone: adminPhone }).eq("id", id);
      setHostels(prev => prev.map(h => h.id === id ? { ...h, status: "approved", manager_phone: adminPhone } : h));
    }
  }

  async function rejectProperty(id: string, type: "home" | "hostel") {
    const table = type === "home" ? "homes" : "hostels";
    await supabase.from(table).update({ status: "rejected" }).eq("id", id);
    if (type === "home") setHomes(prev => prev.map(h => h.id === id ? { ...h, status: "rejected" } : h));
    else setHostels(prev => prev.map(h => h.id === id ? { ...h, status: "rejected" } : h));
  }

  async function deleteProperty(id: string, type: "home" | "hostel") {
    if (!confirm("Are you sure you want to permanently delete this listing?")) return;
    const table = type === "home" ? "homes" : "hostels";
    await supabase.from(table).delete().eq("id", id);
    if (type === "home") setHomes(prev => prev.filter(h => h.id !== id));
    else setHostels(prev => prev.filter(h => h.id !== id));
  }

  async function resolveKyc(id: string, userId: string, approve: boolean) {
    const status = approve ? "verified" : "rejected";
    await supabase.from("kyc_submissions").update({ status }).eq("id", id);
    if (approve) {
      await supabase.from("profiles").update({ kyc_status: "verified" }).eq("id", userId);
    } else {
      await supabase.from("profiles").update({ kyc_status: "unverified" }).eq("id", userId);
    }
    setKyc(prev => prev.map(k => k.id === id ? { ...k, status } : k));
  }

  async function resolveBooking(id: string, status: "accepted" | "rejected") {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (!error) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    }
  }

  async function deleteBooking(id: string) {
    if (!confirm("Are you sure you want to delete this inquiry?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (!error) {
      setBookings(prev => prev.filter(b => b.id !== id));
    } else {
      console.error("Failed to delete inquiry:", error);
      alert("Error deleting inquiry. You may need to run the SQL migration to grant delete access.");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f2f4f7" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#003580", borderTopColor: "transparent" }} />
          <p className="text-sm font-semibold" style={{ color: "#003580" }}>Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  if (!profile || profile.role !== "admin") return null;

  const attentionCount = pendingHomes.length + pendingHostels.length + pendingKyc.length;
  const adminInitials = (profile?.full_name || "SA").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f2f4f7" }}>

      {/* ── Top Header Bar ── */}
      <header className="shrink-0 flex items-center justify-between px-6" style={{ background: "#1a1a2e", height: 56, position: "sticky", top: 0, zIndex: 100 }}>
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-xl" style={{ fontFamily: "Georgia, serif", letterSpacing: "-0.5px" }}>StayMate</span>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: "#003580", color: "#7eb8f5" }}>Super Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/post"
            className="hidden md:flex items-center gap-1.5 text-white text-sm font-bold px-4 py-1.5 rounded transition-opacity hover:opacity-90"
            style={{ background: "#38a169" }}
          >
            <span className="text-base leading-none">+</span> Upload Listing
          </Link>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-extrabold shrink-0" style={{ background: "#003580" }}>
            {adminInitials}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">

        {/* ── Left Sidebar ── */}
        <aside className="hidden md:flex flex-col shrink-0 bg-white border-r" style={{ width: 224, borderColor: "#e8eaf0", position: "sticky", top: 56, height: "calc(100vh - 56px)", overflowY: "auto" }}>
          <div className="px-4 pt-5 pb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6b7280" }}>Navigation</p>
          </div>
          <nav className="flex flex-col px-2 gap-0.5 flex-1">
            <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={<IconChart />} label="Dashboard" />
            <TabButton active={tab === "properties"} onClick={() => setTab("properties")} icon={<IconBuilding />} label="Live Properties" count={liveHomes.length + liveHostels.length} />
            <TabButton active={tab === "agents"} onClick={() => { setTab("agents"); setSelectedAgentId(null); }} icon={<IconTie />} label="Active Agents" count={activeAgents} />
            <TabButton active={tab === "queue"} onClick={() => setTab("queue")} icon="⏳" label="Agent Queue" count={pendingHomes.length + pendingHostels.length} />
            <TabButton active={false} onClick={() => {}} icon={<IconIdCard />} label="KYC Audit" disabled />
            <TabButton active={tab === "featured"} onClick={() => setTab("featured")} icon={<IconStar />} label="Featured" count={homes.filter(h => h.is_sponsored).length + hostels.filter(h => h.is_sponsored).length} />
            <TabButton active={tab === "leads"} onClick={() => setTab("leads")} icon={<IconTarget />} label="Seeker Leads" count={leads.filter(l => l.status === "pending").length} />
          </nav>
          <div className="mt-auto px-4 py-4 border-t" style={{ borderColor: "#e8eaf0" }}>
            <p className="text-[10px] font-semibold" style={{ color: "#9ca3af" }}>StayMate Platform</p>
          </div>
        </aside>

        {/* ── Mobile Top Nav ── */}
        <div className="md:hidden flex gap-1 px-3 py-2 bg-white border-b overflow-x-auto HideScrollbar w-full" style={{ borderColor: "#e8eaf0", position: "sticky", top: 56, zIndex: 90 }}>
          <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={<IconChart />} label="Dashboard" />
          <TabButton active={tab === "properties"} onClick={() => setTab("properties")} icon={<IconBuilding />} label="Properties" count={liveHomes.length + liveHostels.length} />
          <TabButton active={tab === "agents"} onClick={() => { setTab("agents"); setSelectedAgentId(null); }} icon={<IconTie />} label="Agents" count={activeAgents} />
          <TabButton active={tab === "queue"} onClick={() => setTab("queue")} icon="⏳" label="Queue" count={pendingHomes.length + pendingHostels.length} />
          <TabButton active={false} onClick={() => {}} icon={<IconIdCard />} label="KYC" disabled />
          <TabButton active={tab === "featured"} onClick={() => setTab("featured")} icon={<IconStar />} label="Featured" count={homes.filter(h => h.is_sponsored).length + hostels.filter(h => h.is_sponsored).length} />
          <TabButton active={tab === "leads"} onClick={() => setTab("leads")} icon={<IconTarget />} label="Leads" count={leads.filter(l => l.status === "pending").length} />
        </div>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto" style={{ background: "#f2f4f7" }}>
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-5 pb-20 md:pb-8">

            {/* Needs Attention Banner */}
            {attentionCount > 0 && (
              <div className="flex items-center justify-between px-4 py-3 rounded-lg border-l-4" style={{ background: "#fffbeb", borderLeftColor: "#d69e2e", border: "1px solid #f6e05e", borderLeftWidth: 4 }}>
                <div className="flex items-center gap-2">
                  <IconWarning />
                  <span className="text-sm font-semibold" style={{ color: "#92400e" }}>
                    {attentionCount} item{attentionCount !== 1 ? "s" : ""} need{attentionCount === 1 ? "s" : ""} your attention
                  </span>
                </div>
                <button
                  onClick={() => setTab("queue")}
                  className="text-sm font-bold underline underline-offset-2 transition-opacity hover:opacity-70"
                  style={{ color: "#d69e2e" }}
                >
                  Review Queue →
                </button>
              </div>
            )}

            {/* ── DASHBOARD TAB ── */}
            {tab === "dashboard" && (
              <div className="flex flex-col gap-5">
                {/* KPI Tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard title="Total Inquiries" value={totalInquiries.toString()} icon={<IconChat />} accentColor="#d69e2e" />
                  <MetricCard title="Active Agents" value={activeAgents.toString()} icon={<IconTie />} accentColor="#003580" onClick={() => { setTab("agents"); setSelectedAgentId(null); }} />
                  <MetricCard title="Live Properties" value={(liveHomes.length + liveHostels.length).toString()} icon={<IconNeighborhood />} accentColor="#38a169" onClick={() => setTab("properties")} />
                  <MetricCard title="Pending Approvals" value={(pendingHomes.length + pendingHostels.length + pendingKyc.length).toString()} icon={<IconWarning />} accentColor="#e53e3e" onClick={() => setTab("queue")} />
                </div>

                {/* Recent Inquiries Panel */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: "1px solid #e8eaf0" }}>
                  <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#e8eaf0" }}>
                    <h3 className="font-bold text-sm" style={{ color: "#1a1a2e" }}>Recent Inquiries</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#eef2ff", color: "#003580" }}>{bookings.length} total</span>
                  </div>
                  <div className="divide-y" style={{ borderColor: "#f3f4f6" }}>
                    {bookings.length === 0 ? (
                      <p className="text-sm text-center py-10" style={{ color: "#9ca3af" }}>No inquiries received yet.</p>
                    ) : (
                      bookings.map((b) => (
                        <div key={b.id} className="flex flex-col md:flex-row md:items-start justify-between px-5 py-4 gap-4 hover:bg-gray-50 transition-colors">
                          {b.property?.images?.[0] && (
                            <div className="w-full md:w-20 h-16 md:h-16 rounded-lg overflow-hidden shrink-0 bg-gray-200">
                              <OptimizedImage src={b.property.images[0]} alt="" width={200} className="w-full h-full" />
                            </div>
                          )}
                          <div className="min-w-0 pr-4 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${b.property_type === 'home' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                                {b.property_type}
                              </span>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${b.status === 'accepted' ? 'bg-green-50 text-green-700' : b.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                                {b.status}
                              </span>
                            </div>
                            <p className="text-xs mb-1" style={{ color: "#6b7280" }}>
                              <span className="font-semibold" style={{ color: "#1a1a2e" }}>{b.user?.full_name || 'Unknown User'}</span>
                              {b.user?.phone && ` • ${b.user.phone}`}
                              {b.user?.email && ` • ${b.user.email}`}
                            </p>
                            {b.message && (() => {
                              const imgMatch = b.message.match(/^\[INQUIRY_IMAGE:(.*?)\]\n/);
                              const inquiryImg = imgMatch?.[1] || null;
                              const displayMsg = inquiryImg ? b.message.replace(/^\[INQUIRY_IMAGE:.*?\]\n/, "") : b.message;
                              return (
                                <div className="bg-white border rounded-lg overflow-hidden" style={{ borderColor: "#e8eaf0" }}>
                                  {inquiryImg && (
                                    <OptimizedImage src={inquiryImg} alt="Property" width={400} className="w-full h-24" />
                                  )}
                                  <div className="px-3 py-2 text-xs whitespace-pre-wrap" style={{ color: "#4b5563" }}>
                                    &ldquo;{displayMsg}&rdquo;
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "#9ca3af" }}>Pref. Date</p>
                            <p className="text-sm font-bold" style={{ color: "#1a1a2e" }}>
                              {b.viewing_date ? new Date(b.viewing_date).toLocaleDateString() : "Anytime"}
                            </p>
                            <div className="mt-3 flex flex-col md:flex-row gap-1.5 justify-end">
                              {b.user?.phone && (
                                <a href={`tel:${b.user.phone}`} className="inline-flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded border transition-colors hover:bg-gray-50" style={{ color: "#4b5563", borderColor: "#d1d5db" }}>
                                  <IconPhone /> Call
                                </a>
                              )}
                              <Link href={`/chat?seeker_id=${b.user_id}`} className="inline-flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded border transition-colors" style={{ color: "#38a169", borderColor: "#bbf7d0", background: "#f0fdf4" }}>
                                <IconChat /> Chat
                              </Link>
                              {b.property?.lat && b.property?.lng && (
                                <a
                                  href={`https://maps.google.com/?q=${b.property.lat},${b.property.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded border transition-colors"
                                  style={{ color: "#0071c2", borderColor: "#bfdbfe", background: "#eff6ff" }}
                                >
                                  <IconPin /> Map
                                </a>
                              )}
                              {b.status === "pending" && (
                                <>
                                  <button onClick={() => resolveBooking(b.id, "accepted")} className="inline-flex items-center justify-center text-xs font-bold px-3 py-1.5 rounded border transition-colors" style={{ color: "#38a169", borderColor: "#bbf7d0", background: "#f0fdf4" }}>
                                    <IconCheck /> Accept
                                  </button>
                                  <button onClick={() => resolveBooking(b.id, "rejected")} className="inline-flex items-center justify-center text-xs font-bold px-3 py-1.5 rounded border transition-colors" style={{ color: "#d69e2e", borderColor: "#fde68a", background: "#fffbeb" }}>
                                    <IconClose /> Reject
                                  </button>
                                </>
                              )}
                              <button onClick={() => deleteBooking(b.id)} className="inline-flex items-center justify-center text-xs font-bold px-3 py-1.5 rounded border transition-colors" style={{ color: "#e53e3e", borderColor: "#fecaca", background: "#fff5f5" }}>
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── QUEUE TAB ── */}
            {tab === "queue" && (
              <div className="space-y-5">
                <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: "1px solid #e8eaf0" }}>
                  <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#e8eaf0" }}>
                    <h2 className="font-bold text-sm flex items-center gap-2" style={{ color: "#1a1a2e" }}>
                      <span>⏳</span> Agent Property Queue
                    </h2>
                    {(pendingHomes.length + pendingHostels.length) > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: "#e53e3e" }}>
                        {pendingHomes.length + pendingHostels.length} pending
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    {pendingHomes.length === 0 && pendingHostels.length === 0 ? (
                      <div className="text-center py-12" style={{ color: "#9ca3af" }}>
                        <span className="text-5xl opacity-50 mb-4 block"><IconBroom className="w-12 h-12" /></span>
                        <p className="font-bold" style={{ color: "#4b5563" }}>Queue is empty!</p>
                        <p className="text-sm mt-1">All agent submissions have been reviewed.</p>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-4">
                        {[...pendingHomes.map(h => ({ ...h, type: 'home' })), ...pendingHostels.map(h => ({ ...h, type: 'hostel' }))].map((p: any) => (
                          <div key={p.id} className="rounded-xl overflow-hidden flex flex-col relative border transition-all hover:border-l-4 hover:shadow-md group" style={{ background: "#fafafa", borderColor: "#e8eaf0" }}>
                            <span className="absolute top-2 left-2 text-white text-[9px] font-bold uppercase px-2 py-1 rounded z-10" style={{ background: "rgba(0,0,0,0.65)" }}>
                              {p.type === 'home' ? 'Home/Apt' : 'Hostel'}
                            </span>
                            <div className="h-40 bg-gray-200 relative">
                              {p.images?.[0] && <OptimizedImage src={p.images[0]} alt="" width={200} className="w-full h-full" />}
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-between">
                              <div>
                                <h3 className="text-sm font-bold line-clamp-1 mb-1" style={{ color: "#1a1a2e" }}>{p.title || p.name}</h3>
                                <p className="text-xs mb-2" style={{ color: "#6b7280" }}>{p.city} • <span className="font-semibold" style={{ color: "#374151" }}>{p.owner_phone || p.manager_phone}</span></p>
                                <p className="text-[11px] line-clamp-2 bg-white p-2 rounded border" style={{ color: "#4b5563", borderColor: "#e8eaf0" }}>{p.description}</p>
                              </div>
                              <div className="mt-4 flex gap-2 pt-3 border-t" style={{ borderColor: "#e8eaf0" }}>
                                <button onClick={() => approveProperty(p.id, p.type)} className="flex-1 text-white text-xs font-bold py-2 rounded-lg transition-colors hover:opacity-90" style={{ background: "#38a169" }}>Approve</button>
                                <button onClick={() => rejectProperty(p.id, p.type)} className="flex-1 border text-xs font-bold py-2 rounded-lg transition-colors hover:bg-amber-50" style={{ color: "#d69e2e", borderColor: "#fde68a", background: "white" }}>Reject</button>
                                <button onClick={() => deleteProperty(p.id, p.type)} className="border text-xs font-bold py-2 px-3 rounded-lg transition-colors hover:bg-red-50" style={{ color: "#e53e3e", borderColor: "#fecaca", background: "white" }}><IconTrash /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── AUDIT TAB ── */}
            {tab === "audit" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: "1px solid #e8eaf0" }}>
                <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "#e8eaf0" }}>
                  <IconIdCard />
                  <h2 className="font-bold text-sm" style={{ color: "#1a1a2e" }}>KYC Audit View</h2>
                </div>
                <div className="p-5">
                  {pendingKyc.length === 0 ? (
                    <div className="text-center py-12" style={{ color: "#9ca3af" }}>
                      <span className="text-5xl opacity-50 mb-4 block"><IconCheckCircle className="w-12 h-12" /></span>
                      <p className="font-bold" style={{ color: "#4b5563" }}>No pending KYC submissions</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingKyc.map(k => (
                        <div key={k.id} className="border rounded-xl p-5 flex flex-col md:flex-row gap-6 items-start md:items-center" style={{ borderColor: "#e8eaf0", background: "#fafafa" }}>
                          <div className="w-full md:w-48 aspect-video bg-gray-200 rounded-xl relative overflow-hidden shrink-0 shadow-sm border" style={{ borderColor: "#e8eaf0" }}>
                            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: "#9ca3af", background: "white" }}>
                              No Upload Included
                            </div>
                          </div>
                          <div className="flex-1 space-y-2">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#9ca3af" }}>ID Card Name</p>
                              <p className="text-base font-extrabold" style={{ color: "#1a1a2e" }}>{k.id_card_name}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white px-3 py-2 rounded-xl border" style={{ borderColor: "#e8eaf0" }}>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#9ca3af" }}>User Profile Name</p>
                                <p className="text-sm font-bold" style={{ color: "#1a1a2e" }}>{k.user?.full_name || "N/A"}</p>
                              </div>
                              <div className="bg-white px-3 py-2 rounded-xl border" style={{ borderColor: "#e8eaf0" }}>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#9ca3af" }}>Match Status</p>
                                {k.id_card_name?.toLowerCase() === k.user?.full_name?.toLowerCase() ? (
                                  <p className="text-sm font-bold" style={{ color: "#38a169" }}>Excellent Match</p>
                                ) : (
                                  <p className="text-sm font-bold" style={{ color: "#d69e2e" }}>Possible Mismatch</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex w-full md:w-auto md:flex-col gap-2 shrink-0">
                            <button onClick={() => resolveKyc(k.id, k.user_id, true)} className="flex-1 text-white font-bold px-6 py-2.5 rounded-xl hover:opacity-90 text-sm transition-opacity" style={{ background: "#38a169" }}>Approve</button>
                            <button onClick={() => resolveKyc(k.id, k.user_id, false)} className="flex-1 border font-bold px-6 py-2.5 rounded-xl hover:bg-gray-50 text-sm transition-colors" style={{ color: "#4b5563", borderColor: "#d1d5db", background: "white" }}>Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── LEADS TAB ── */}
            {tab === "leads" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: "1px solid #e8eaf0" }}>
                <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "#e8eaf0" }}>
                  <IconTarget />
                  <h2 className="font-bold text-sm" style={{ color: "#1a1a2e" }}>Seeker Property Submissions</h2>
                </div>
                <div className="p-5">
                  {leads.length === 0 ? (
                    <div className="text-center py-12" style={{ color: "#9ca3af" }}>
                      <span className="text-5xl opacity-50 mb-4 block"><IconMailbox className="w-12 h-12" /></span>
                      <p className="font-bold" style={{ color: "#4b5563" }}>No leads from seekers.</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {leads.map(lead => (
                        <div key={lead.id} className="rounded-xl border p-4 relative flex flex-col" style={{ background: "#fafafa", borderColor: "#e8eaf0" }}>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="text-sm font-bold truncate" style={{ color: "#1a1a2e" }}>{lead.name}</p>
                              <a href={`tel:${lead.phone}`} className="text-xs font-bold hover:underline" style={{ color: "#0071c2" }}>
                                {lead.phone}
                              </a>
                            </div>
                            <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                              lead.status === "approved" ? "bg-green-50 text-green-700"
                              : lead.status === "rejected" ? "bg-red-50 text-red-600"
                              : "bg-amber-50 text-amber-700"
                            }`}>
                              {lead.status}
                            </span>
                          </div>
                          <div className="bg-white rounded-xl p-3 border flex-1" style={{ borderColor: "#e8eaf0" }}>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#9ca3af" }}>Location</p>
                            <p className="text-sm font-semibold mb-2" style={{ color: "#1a1a2e" }}>{lead.location}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#9ca3af" }}>Details</p>
                            <p className="text-xs line-clamp-3 leading-relaxed" style={{ color: "#4b5563" }}>{lead.property_details || "No details provided"}</p>
                          </div>
                          {lead.status === "pending" && (
                            <div className="flex gap-2 mt-4 pt-3 border-t" style={{ borderColor: "#e8eaf0" }}>
                              <button
                                onClick={async () => {
                                  await supabase.from("landlord_leads").update({ status: "approved" }).eq("id", lead.id);
                                  setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: "approved" } : l));
                                }}
                                className="flex-1 text-xs font-bold py-2 rounded-lg transition-colors hover:opacity-90"
                                style={{ background: "#f0fdf4", color: "#38a169", border: "1px solid #bbf7d0" }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={async () => {
                                  await supabase.from("landlord_leads").update({ status: "rejected" }).eq("id", lead.id);
                                  setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: "rejected" } : l));
                                }}
                                className="flex-1 text-xs font-bold py-2 rounded-lg transition-colors hover:bg-red-50"
                                style={{ background: "white", color: "#e53e3e", border: "1px solid #fecaca" }}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── PROPERTIES TAB ── */}
            {tab === "properties" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: "1px solid #e8eaf0" }}>
                <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "#e8eaf0" }}>
                  <IconBuilding />
                  <h2 className="font-bold text-sm" style={{ color: "#1a1a2e" }}>Live Properties</h2>
                </div>
                <div className="p-5">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#38a169" }}>Homes</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#f0fdf4", color: "#38a169" }}>{liveHomes.length}</span>
                      </div>
                      <div className="space-y-2">
                        {liveHomes.length === 0 ? <p className="text-sm" style={{ color: "#9ca3af" }}>None live.</p> : liveHomes.map(h => (
                          <div key={h.id} className="border p-3 rounded-xl hover:bg-gray-50 transition-colors" style={{ borderColor: "#e8eaf0" }}>
                            <div className="flex items-center justify-between">
                              <Link href={`/homes/${h.id}`} className="flex-1 min-w-0">
                                <p className="text-sm font-bold line-clamp-1" style={{ color: "#1a1a2e" }}>{h.title}</p>
                                <p className="text-xs font-semibold mt-0.5" style={{ color: "#6b7280" }}>{h.city} • {h.price_label}</p>
                              </Link>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <button
                                  onClick={async () => {
                                    const newVal = !h.is_verified;
                                    await toggleVerified("homes", h.id, newVal);
                                    setHomes(prev => prev.map(x => x.id === h.id ? { ...x, is_verified: newVal } : x));
                                  }}
                                  className="text-[9px] font-bold px-2 py-1 rounded-lg transition-all active:scale-95"
                                  style={h.is_verified ? { background: "#06C167", color: "white" } : { color: "#6b7280", border: "1px solid #d1d5db" }}
                                  title={h.is_verified ? "Remove verified" : "Mark as verified"}
                                >
                                  <IconCheck /> {h.is_verified ? "Verified" : "Verify"}
                                </button>
                                <button onClick={() => deleteProperty(h.id, "home")} className="transition-colors hover:text-red-500" style={{ color: "#9ca3af" }} title="Delete">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </div>
                            {(h.lat || h.lng) && (
                              <div className="mt-2">
                                <AdminLocationButton lat={h.lat} lng={h.lng} city={h.city} title={h.title} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#0071c2" }}>Hostels</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#eff6ff", color: "#0071c2" }}>{liveHostels.length}</span>
                      </div>
                      <div className="space-y-2">
                        {liveHostels.length === 0 ? <p className="text-sm" style={{ color: "#9ca3af" }}>None live.</p> : liveHostels.map(h => (
                          <div key={h.id} className="border p-3 rounded-xl hover:bg-gray-50 transition-colors" style={{ borderColor: "#e8eaf0" }}>
                            <div className="flex items-center justify-between">
                              <Link href={`/hostels/${h.id}`} className="flex-1 min-w-0">
                                <p className="text-sm font-bold line-clamp-1" style={{ color: "#1a1a2e" }}>{h.name}</p>
                                <p className="text-xs font-semibold mt-0.5" style={{ color: "#6b7280" }}>{h.city} • {h.price_range_label}</p>
                              </Link>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <button
                                  onClick={async () => {
                                    const newVal = !h.is_verified;
                                    await toggleVerified("hostels", h.id, newVal);
                                    setHostels(prev => prev.map(x => x.id === h.id ? { ...x, is_verified: newVal } : x));
                                  }}
                                  className="text-[9px] font-bold px-2 py-1 rounded-lg transition-all active:scale-95"
                                  style={h.is_verified ? { background: "#06C167", color: "white" } : { color: "#6b7280", border: "1px solid #d1d5db" }}
                                  title={h.is_verified ? "Remove verified" : "Mark as verified"}
                                >
                                  <IconCheck /> {h.is_verified ? "Verified" : "Verify"}
                                </button>
                                <button onClick={() => deleteProperty(h.id, "hostel")} className="transition-colors hover:text-red-500" style={{ color: "#9ca3af" }} title="Delete">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </div>
                            {(h.lat || h.lng) && (
                              <div className="mt-2">
                                <AdminLocationButton lat={h.lat} lng={h.lng} city={h.city} title={h.name} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── FEATURED TAB ── */}
            {tab === "featured" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: "1px solid #e8eaf0" }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: "#e8eaf0" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <IconStar />
                    <h2 className="font-bold text-sm" style={{ color: "#1a1a2e" }}>Featured / Sponsored</h2>
                  </div>
                  <p className="text-xs" style={{ color: "#6b7280" }}>Toggle up to 10 properties as &ldquo;Featured Today&rdquo;. These appear in a large carousel at the top of the browse pages.</p>
                </div>
                <div className="p-5 space-y-6">
                  {/* Homes */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest mb-3 px-1" style={{ color: "#38a169" }}>Homes</h3>
                    <div className="space-y-2">
                      {liveHomes.length === 0 ? <p className="text-sm" style={{ color: "#9ca3af" }}>No live homes.</p> : liveHomes.map(h => {
                        const isFeatured = !!h.is_sponsored;
                        const totalFeatured = homes.filter(x => x.is_sponsored).length + hostels.filter(x => x.is_sponsored).length;
                        return (
                          <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-gray-50" style={{ borderColor: "#e8eaf0" }}>
                            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-200 relative">
                              {h.images?.[0] && <OptimizedImage src={h.images[0]} alt="" width={200} className="w-full h-full" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold line-clamp-1" style={{ color: "#1a1a2e" }}>{h.title}</p>
                              <p className="text-xs" style={{ color: "#6b7280" }}>{h.city} • {h.price_label}</p>
                            </div>
                            <button
                              onClick={async () => {
                                if (!isFeatured && totalFeatured >= 10) { alert("Maximum 10 featured properties allowed."); return; }
                                await toggleSponsored("homes", h.id, !isFeatured, 7);
                                setHomes(prev => prev.map(x => x.id === h.id ? { ...x, is_sponsored: !isFeatured, sponsored_until: !isFeatured ? new Date(Date.now() + 7 * 86400000).toISOString() : null, priority_score: !isFeatured ? 100 : 0 } : x));
                              }}
                              className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                              style={isFeatured ? { background: "#D4AF37", color: "white" } : { color: "#4b5563", border: "1px solid #d1d5db", background: "white" }}
                            >
                              {isFeatured ? <><IconStar /> Featured</> : "Feature"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Hostels */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest mb-3 px-1" style={{ color: "#0071c2" }}>Hostels</h3>
                    <div className="space-y-2">
                      {liveHostels.length === 0 ? <p className="text-sm" style={{ color: "#9ca3af" }}>No live hostels.</p> : liveHostels.map(h => {
                        const isFeatured = !!h.is_sponsored;
                        const totalFeatured = homes.filter(x => x.is_sponsored).length + hostels.filter(x => x.is_sponsored).length;
                        return (
                          <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-gray-50" style={{ borderColor: "#e8eaf0" }}>
                            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-200 relative">
                              {h.images?.[0] && <OptimizedImage src={h.images[0]} alt="" width={200} className="w-full h-full" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold line-clamp-1" style={{ color: "#1a1a2e" }}>{h.name}</p>
                              <p className="text-xs" style={{ color: "#6b7280" }}>{h.city} • {h.price_range_label}</p>
                            </div>
                            <button
                              onClick={async () => {
                                if (!isFeatured && totalFeatured >= 10) { alert("Maximum 10 featured properties allowed."); return; }
                                await toggleSponsored("hostels", h.id, !isFeatured, 7);
                                setHostels(prev => prev.map(x => x.id === h.id ? { ...x, is_sponsored: !isFeatured, sponsored_until: !isFeatured ? new Date(Date.now() + 7 * 86400000).toISOString() : null, priority_score: !isFeatured ? 100 : 0 } : x));
                              }}
                              className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                              style={isFeatured ? { background: "#D4AF37", color: "white" } : { color: "#4b5563", border: "1px solid #d1d5db", background: "white" }}
                            >
                              {isFeatured ? <><IconStar /> Featured</> : "Feature"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── AGENTS TAB ── */}
            {tab === "agents" && (
              <div className="space-y-5">
                {selectedAgentId ? (
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: "1px solid #e8eaf0" }}>
                    <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: "#e8eaf0" }}>
                      <button onClick={() => setSelectedAgentId(null)} className="flex items-center gap-1.5 text-sm font-bold transition-colors hover:opacity-70" style={{ color: "#0071c2" }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        Back to Agents
                      </button>
                      <span className="text-gray-300">|</span>
                      <h2 className="text-sm font-bold" style={{ color: "#1a1a2e" }}>
                        {activeAgentProfiles.find(a => a.id === selectedAgentId)?.full_name || "Agent"}&apos;s Listings
                      </h2>
                    </div>
                    <div className="p-5">
                      {agentHomes.length === 0 && agentHostels.length === 0 ? (
                        <p className="text-sm py-8 text-center italic" style={{ color: "#9ca3af" }}>This agent has no listings.</p>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                          {agentHomes.map(h => (
                            <Link key={h.id} href={`/homes/${h.id}`} className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col" style={{ borderColor: "#e8eaf0" }}>
                              <div className="h-28 bg-gray-200 relative">
                                {h.images?.[0] && <OptimizedImage src={h.images[0]} alt="" width={200} className="w-full h-full" />}
                                <span className="absolute top-2 left-2 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: "#38a169" }}>{h.status}</span>
                              </div>
                              <div className="p-3">
                                <p className="text-sm font-bold line-clamp-1" style={{ color: "#1a1a2e" }}>{h.title}</p>
                                <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{h.city} • {h.price_label}</p>
                              </div>
                            </Link>
                          ))}
                          {agentHostels.map(h => (
                            <Link key={h.id} href={`/hostels/${h.id}`} className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col" style={{ borderColor: "#e8eaf0" }}>
                              <div className="h-28 bg-gray-200 relative">
                                {h.images?.[0] && <OptimizedImage src={h.images[0]} alt="" width={200} className="w-full h-full" />}
                                <span className="absolute top-2 left-2 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: "#0071c2" }}>{h.status}</span>
                              </div>
                              <div className="p-3">
                                <p className="text-sm font-bold line-clamp-1" style={{ color: "#1a1a2e" }}>{h.name}</p>
                                <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{h.city} • {h.price_range_label}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: "1px solid #e8eaf0" }}>
                    <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "#e8eaf0" }}>
                      <IconTie />
                      <h2 className="font-bold text-sm" style={{ color: "#1a1a2e" }}>Active Agents Directory</h2>
                    </div>
                    <div className="p-5">
                      {activeAgentProfiles.length === 0 ? (
                        <div className="text-center py-12" style={{ color: "#9ca3af" }}>
                          <span className="text-5xl opacity-50 mb-4 block"><IconShrug className="w-12 h-12" /></span>
                          <p className="font-bold" style={{ color: "#4b5563" }}>No active agents yet</p>
                          <p className="text-sm mt-1">Agents will appear here once they post listings.</p>
                        </div>
                      ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {activeAgentProfiles.map(agent => {
                            const agentHomeCount = homes.filter(h => h.owner_id === agent.id).length;
                            const agentHostelCount = hostels.filter(h => h.manager_id === agent.id).length;
                            return (
                              <button
                                key={agent.id}
                                onClick={() => setSelectedAgentId(agent.id)}
                                className="border rounded-xl p-4 flex flex-col items-start text-left transition-all group hover:shadow-md"
                                style={{ background: "#fafafa", borderColor: "#e8eaf0" }}
                              >
                                <div className="flex items-center gap-3 w-full mb-4">
                                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm shrink-0" style={{ background: "#003580" }}>
                                    {(agent.full_name || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate" style={{ color: "#1a1a2e" }}>{agent.full_name || "Unnamed"}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: agent.kyc_status === 'verified' ? "#38a169" : "#6b7280" }}>{agent.kyc_status === 'verified' ? 'Verified Agent' : 'Seeker'}</p>
                                  </div>
                                  <svg className="w-4 h-4 shrink-0 transition-colors" style={{ color: "#d1d5db" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                                </div>
                                <div className="w-full space-y-1.5">
                                  {agent.email && (
                                    <div className="flex items-center gap-2 text-xs" style={{ color: "#6b7280" }}>
                                      <IconMail />
                                      <span className="truncate">{agent.email}</span>
                                    </div>
                                  )}
                                  {agent.phone && (
                                    <div className="flex items-center gap-2 text-xs" style={{ color: "#6b7280" }}>
                                      <IconPhone />
                                      <a href={`tel:${agent.phone}`} className="font-medium hover:underline" style={{ color: "#0071c2" }} onClick={e => e.stopPropagation()}>{agent.phone}</a>
                                    </div>
                                  )}
                                  <div className="flex gap-1.5 pt-2 flex-wrap">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#f0fdf4", color: "#38a169" }}>{agentHomeCount} Home{agentHomeCount !== 1 ? 's' : ''}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#eff6ff", color: "#0071c2" }}>{agentHostelCount} Hostel{agentHostelCount !== 1 ? 's' : ''}</span>
                                    {agent.is_agent && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#fffbeb", color: "#d69e2e" }}>Subscribed Agent</span>
                                    )}
                                    {(() => {
                                      const sub = subscribedAgents.find(s => s.id === agent.id);
                                      return sub ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#faf5ff", color: "#7c3aed" }}>
                                          {sub.paidViewingCount} paid viewing{sub.paidViewingCount !== 1 ? 's' : ''}
                                        </span>
                                      ) : null;
                                    })()}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .HideScrollbar::-webkit-scrollbar { display: none; }
        .HideScrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count, disabled }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, count?: number, disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all whitespace-nowrap shrink-0 w-full text-left"
      style={
        disabled
          ? { color: "#9ca3af", cursor: "not-allowed", opacity: 0.5, background: "transparent" }
          : active
          ? { color: "#003580", background: "#eef2ff", borderLeft: "4px solid #003580", paddingLeft: 8 }
          : { color: "#4b5563", background: "transparent" }
      }
    >
      <span className="text-base opacity-80 shrink-0">{icon}</span>
      <span className="flex-1 text-left text-[13px]">{label}</span>
      {disabled && (
        <span className="px-1.5 py-0.5 text-[9px] rounded-full shrink-0" style={{ background: "#f3f4f6", color: "#9ca3af" }}>Soon</span>
      )}
      {!disabled && count !== undefined && count > 0 && (
        <span className="px-2 py-0.5 text-[10px] rounded-full shrink-0 font-bold" style={{ background: active ? "#003580" : "#eef2ff", color: active ? "white" : "#003580" }}>
          {count}
        </span>
      )}
    </button>
  );
}

function MetricCard({ title, value, icon, accentColor, onClick }: { title: string, value: string, icon: React.ReactNode, accentColor: string, onClick?: () => void }) {
  return (
    <div
      className="bg-white rounded-xl p-5 transition-all relative overflow-hidden"
      style={{
        border: "1px solid #e8eaf0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        borderLeft: `4px solid ${accentColor}`,
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      <div className="absolute top-3 right-3 opacity-20 text-xl">{icon}</div>
      <p className="text-2xl font-black tracking-tight mb-1" style={{ color: accentColor }}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest leading-snug" style={{ color: "#6b7280" }}>{title}</p>
    </div>
  );
}
