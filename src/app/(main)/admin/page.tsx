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

  const [tab, setTab] = useState<"pipeline" | "dashboard" | "properties" | "queue" | "audit" | "leads" | "agents" | "featured" | "applications">("pipeline");
  const [applications, setApplications] = useState<any[]>([]);
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

      // Fetch agent_applications separately — table may not exist yet
      // Use try/catch because .catch() is not available on the Supabase query builder
      let appsRes: { data: any[] | null; error: any } = { data: [], error: null };
      try {
        const res = await supabase
          .from("agent_applications")
          .select("*")
          .order("created_at", { ascending: false });
        appsRes = res;
      } catch {
        // table doesn't exist yet — silently ignore
      }

      const allProfiles = agentsRes.data || [];
      const allHomes = homesRes.data || [];
      const allHostels = hostelsRes.data || [];

      // Manually join profiles + property to bookings
      // property_ref is the actual text ID; older rows have placeholder UUID so we fall back to title match
      const titleFromMsg = (msg: string) => {
        const m = msg?.match(/\[Inquiry for:\s*([^\]]+)\]/);
        return m ? m[1].trim() : null;
      };
      const mappedBookings = (bookingsRes.data || []).map((b) => {
        const ref = b.property_ref;
        let property = null;
        if (ref) {
          property = b.property_type === "home"
            ? allHomes.find((h: any) => h.id === ref)
            : allHostels.find((h: any) => h.id === ref);
        }
        if (!property) {
          // Fallback: match by title extracted from inquiry message
          const title = titleFromMsg(b.message || "");
          if (title) {
            property = b.property_type === "home"
              ? allHomes.find((h: any) => h.title && title.startsWith(h.title))
              : allHostels.find((h: any) => h.name && title.includes(h.name));
          }
        }
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
      setApplications((appsRes.data || []).map(a => ({
        ...a,
        user: allProfiles.find(p => p.id === a.user_id) || null,
      })));
      setLoading(false);

      // Fetch subscribed agents
      getActiveAgents().then(setSubscribedAgents).catch(() => {});
    }
    fetchData().catch(err => {
      console.error("Admin fetchData error:", err);
      setLoading(false);
    });
  }, [profile]);

  const liveHomes = useMemo(() => homes.filter(h => h.status === "approved"), [homes]);
  const pendingHomes = useMemo(() => homes.filter(h => h.status === "pending_admin"), [homes]);

  const liveHostels = useMemo(() => hostels.filter(h => h.status === "approved"), [hostels]);
  const pendingHostels = useMemo(() => hostels.filter(h => h.status === "pending_admin"), [hostels]);

  const pendingKyc = useMemo(() => kyc.filter(k => k.status === "pending"), [kyc]);
  const pendingApplications = useMemo(() => applications.filter(a => a.status === "pending"), [applications]);

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

  async function resolveApplication(id: string, userId: string, approve: boolean) {
    const status = approve ? "approved" : "rejected";
    await supabase.from("agent_applications").update({ status }).eq("id", id);
    if (approve) {
      await supabase.from("profiles").update({ is_agent: true }).eq("id", userId);
    }
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a));
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f7f8fa" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#06c167", borderTopColor: "transparent" }} />
          <p className="text-sm font-semibold" style={{ color: "#06c167" }}>Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  if (!profile || profile.role !== "admin") return null;

  const attentionCount = pendingHomes.length + pendingHostels.length + pendingKyc.length + pendingApplications.length;
  const adminInitials = (profile?.full_name || "SA").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const isPipeline = tab === "pipeline" || tab === "dashboard";

  // Kanban column definitions
  const kanbanColumns = [
    { key: "pending",           label: "New",       color: "#2563eb", dot: "#2563eb",  bgLight: "#eff6ff" },
    { key: "accepted",          label: "Accepted",  color: "#d97706", dot: "#d97706",  bgLight: "#fffbeb" },
    { key: "fee_paid",          label: "Fee Paid",  color: "#7c3aed", dot: "#7c3aed",  bgLight: "#f5f3ff" },
    { key: "viewing_scheduled", label: "Viewing",   color: "#0891b2", dot: "#0891b2",  bgLight: "#ecfeff" },
    { key: "completed",         label: "Completed", color: "#06c167", dot: "#06c167",  bgLight: "#f0fdf4" },
  ];

  // Max listing count for agent progress bars
  const maxAgentListings = Math.max(1, ...activeAgentProfiles.map(a =>
    homes.filter(h => h.owner_id === a.id).length + hostels.filter(h => h.manager_id === a.id).length
  ));

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f7f8fa" }}>

      {/* ── Top Header Bar ── */}
      <header className="shrink-0 flex items-center justify-between px-6" style={{ background: "#ffffff", height: 56, position: "sticky", top: 0, zIndex: 100, borderBottom: "1px solid #e9edf2", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-xl" style={{ color: "#0f172a", letterSpacing: "-0.5px", fontFamily: "Georgia, serif" }}>StayMate</span>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md" style={{ background: "rgba(6,193,103,0.12)", color: "#06c167" }}>Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/post"
            className="hidden md:flex items-center gap-1.5 text-sm font-bold px-4 py-1.5 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: "#06c167", color: "#fff" }}
          >
            <span className="text-base leading-none">+</span> New Listing
          </Link>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0" style={{ background: "#06c167", color: "#fff" }}>
            {adminInitials}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">

        {/* ── Left Sidebar (desktop) ── */}
        <aside className="hidden md:flex flex-col shrink-0" style={{ width: 224, background: "#ffffff", borderRight: "1px solid #e9edf2", position: "sticky", top: 56, height: "calc(100vh - 56px)", overflowY: "auto" }}>

          {/* CRM Section */}
          <div className="px-4 pt-5 pb-2">
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#94a3b8" }}>CRM</p>
          </div>
          <nav className="flex flex-col px-2 gap-0.5">
            <TabButton active={isPipeline} onClick={() => setTab("pipeline")} icon={<IconChart />} label="Dashboard" />
            <TabButton active={tab === "queue"} onClick={() => setTab("queue")} icon={<span>⏳</span>} label="Bookings Pipeline" count={bookings.length} />
            <TabButton active={tab === "properties"} onClick={() => setTab("properties")} icon={<IconBuilding />} label="Live Properties" count={liveHomes.length + liveHostels.length} />
          </nav>

          {/* Review Section */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#94a3b8" }}>Review</p>
          </div>
          <nav className="flex flex-col px-2 gap-0.5">
            <TabButton active={tab === "queue"} onClick={() => setTab("queue")} icon={<span>🕐</span>} label="Pending Queue" count={pendingHomes.length + pendingHostels.length} countRed={pendingHomes.length + pendingHostels.length > 0} />
            <TabButton active={tab === "applications"} onClick={() => setTab("applications")} icon={<IconCheckCircle />} label="Applications" count={pendingApplications.length} countRed={pendingApplications.length > 0} />
            <TabButton active={false} onClick={() => {}} icon={<IconIdCard />} label="KYC Audit" disabled />
          </nav>

          {/* Tools Section */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#94a3b8" }}>Tools</p>
          </div>
          <nav className="flex flex-col px-2 gap-0.5">
            <TabButton active={tab === "featured"} onClick={() => setTab("featured")} icon={<IconStar />} label="Featured" count={homes.filter(h => h.is_sponsored).length + hostels.filter(h => h.is_sponsored).length} />
            <TabButton active={tab === "leads"} onClick={() => setTab("leads")} icon={<IconTarget />} label="Seeker Leads" count={leads.filter(l => l.status === "pending").length} />
            <TabButton active={tab === "agents"} onClick={() => { setTab("agents"); setSelectedAgentId(null); }} icon={<IconTie />} label="Agents" count={activeAgents} />
          </nav>

          <div className="mt-auto px-4 py-4" style={{ borderTop: "1px solid #e9edf2" }}>
            <p className="text-[10px] font-semibold" style={{ color: "#94a3b8" }}>StayMate Platform</p>
          </div>
        </aside>

        {/* ── Bottom Nav (mobile) ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex overflow-x-auto HideScrollbar" style={{ background: "#ffffff", borderTop: "1px solid #e9edf2" }}>
          {[
            { t: "pipeline", icon: <IconChart />, label: "Home" },
            { t: "properties", icon: <IconBuilding />, label: "Live", count: liveHomes.length + liveHostels.length },
            { t: "agents", icon: <IconTie />, label: "Agents", count: activeAgents },
            { t: "queue", icon: <span>⏳</span>, label: "Queue", count: pendingHomes.length + pendingHostels.length },
            { t: "featured", icon: <IconStar />, label: "Featured" },
            { t: "applications", icon: <IconCheckCircle />, label: "Apply", count: pendingApplications.length },
            { t: "leads", icon: <IconTarget />, label: "Leads", count: leads.filter((l: any) => l.status === "pending").length },
          ].map(({ t, icon, label, count }) => (
            <button key={t} onClick={() => { setTab(t as typeof tab); if (t === "agents") setSelectedAgentId(null); }}
              className="flex flex-col items-center gap-0.5 px-4 py-2.5 shrink-0 text-[10px] font-bold transition-colors"
              style={{ color: (tab === t || (t === "pipeline" && isPipeline)) ? "#06c167" : "#64748b", minWidth: 56 }}>
              <span className="text-lg leading-none relative">
                {icon}
                {count !== undefined && count > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full text-[8px] font-extrabold flex items-center justify-center" style={{ background: "#06c167", color: "#fff" }}>{count}</span>
                )}
              </span>
              {label}
            </button>
          ))}
        </nav>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto" style={{ background: "#f7f8fa" }}>
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-5 pb-24 md:pb-8">

            {/* Needs Attention Banner */}
            {attentionCount > 0 && (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: "#fffbeb", border: "1px solid #fde68a", borderLeft: "4px solid #d97706" }}>
                <div className="flex items-center gap-2">
                  <IconWarning />
                  <span className="text-sm font-semibold" style={{ color: "#92400e" }}>
                    {attentionCount} item{attentionCount !== 1 ? "s" : ""} need{attentionCount === 1 ? "s" : ""} your attention
                  </span>
                </div>
                <button onClick={() => setTab("queue")} className="text-sm font-bold underline underline-offset-2" style={{ color: "#d97706" }}>
                  Review Queue →
                </button>
              </div>
            )}

            {/* ── PIPELINE / DASHBOARD TAB ── */}
            {isPipeline && (
              <div className="flex flex-col gap-6">

                {/* Row 1: Stat Group Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatGroup
                    title="Platform Overview"
                    accentColor="#06c167"
                    metrics={[
                      { label: "Total Listings", value: homes.length + hostels.length },
                      { label: "Live Properties", value: liveHomes.length + liveHostels.length },
                    ]}
                    onClick={() => setTab("properties")}
                  />
                  <StatGroup
                    title="Booking Activity"
                    accentColor="#d97706"
                    metrics={[
                      { label: "Total Inquiries", value: totalInquiries },
                      { label: "Avg. Days to Close", value: "~" },
                    ]}
                  />
                  <StatGroup
                    title="Review Queue"
                    accentColor="#ef4444"
                    metrics={[
                      { label: "Pending Approvals", value: pendingHomes.length + pendingHostels.length },
                      { label: "Applications", value: pendingApplications.length },
                    ]}
                    onClick={() => setTab("queue")}
                  />
                </div>

                {/* Row 2: Bookings Kanban Pipeline */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold" style={{ color: "#0f172a" }}>Bookings Pipeline</h2>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "#e9edf2", color: "#64748b" }}>{bookings.length} total</span>
                    </div>
                    <button className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#ffffff", border: "1px solid #e9edf2", color: "#64748b" }}>
                      + New Booking
                    </button>
                  </div>

                  {/* Kanban horizontal scroll */}
                  <div className="flex gap-4 overflow-x-auto pb-4 HideScrollbar" style={{ alignItems: "flex-start" }}>
                    {kanbanColumns.map(col => {
                      const colBookings = bookings.filter(b => b.status === col.key);
                      return (
                        <KanbanColumn key={col.key} title={col.label} color={col.color} dotColor={col.dot} bgLight={col.bgLight} count={colBookings.length}>
                          {colBookings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8" style={{ color: "#94a3b8" }}>
                              <span className="text-2xl mb-2">○</span>
                              <p className="text-xs font-medium">No bookings</p>
                            </div>
                          ) : (
                            colBookings.map(b => (
                              <BookingKanbanCard
                                key={b.id}
                                booking={b}
                                accentColor={col.color}
                                onAccept={() => resolveBooking(b.id, "accepted")}
                                onReject={() => resolveBooking(b.id, "rejected")}
                                onDelete={() => deleteBooking(b.id)}
                              />
                            ))
                          )}
                        </KanbanColumn>
                      );
                    })}
                  </div>
                </div>

                {/* Row 3: Agents Leaderboard */}
                {activeAgentProfiles.length > 0 && (
                  <div className="rounded-xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid #e9edf2", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #e9edf2" }}>
                      <h3 className="font-bold text-sm" style={{ color: "#0f172a" }}>Agent Leaderboard</h3>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#f7f8fa", color: "#64748b" }}>{activeAgentProfiles.length} active</span>
                    </div>
                    <div className="divide-y" style={{ borderColor: "#e9edf2" }}>
                      {activeAgentProfiles.slice(0, 8).map(agent => {
                        const homeCount = homes.filter(h => h.owner_id === agent.id).length;
                        const hostelCount = hostels.filter(h => h.manager_id === agent.id).length;
                        const total = homeCount + hostelCount;
                        const pct = Math.round((total / maxAgentListings) * 100);
                        const initials = (agent.full_name || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                        return (
                          <div key={agent.id} className="flex items-center gap-4 px-5 py-3.5">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0" style={{ background: "rgba(6,193,103,0.12)", color: "#06c167" }}>
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-bold truncate" style={{ color: "#0f172a" }}>{agent.full_name || "Unnamed"}</p>
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: agent.kyc_status === "verified" ? "rgba(6,193,103,0.1)" : "#f1f5f9", color: agent.kyc_status === "verified" ? "#06c167" : "#94a3b8" }}>
                                  {agent.kyc_status === "verified" ? "Verified" : "Seeker"}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#e9edf2" }}>
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#06c167" }} />
                                </div>
                                <span className="text-[11px] font-bold shrink-0" style={{ color: "#64748b" }}>{homeCount}h / {hostelCount}o</span>
                              </div>
                            </div>
                            <button onClick={() => { setTab("agents"); setSelectedAgentId(agent.id); }} className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0" style={{ background: "#f7f8fa", border: "1px solid #e9edf2", color: "#64748b" }}>
                              View
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── QUEUE TAB ── */}
            {tab === "queue" && (
              <div className="space-y-5">
                <div className="rounded-xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid #e9edf2", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #e9edf2" }}>
                    <h2 className="font-bold text-sm flex items-center gap-2" style={{ color: "#0f172a" }}>
                      <span>⏳</span> Agent Property Queue
                    </h2>
                    {(pendingHomes.length + pendingHostels.length) > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
                        {pendingHomes.length + pendingHostels.length} pending
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    {pendingHomes.length === 0 && pendingHostels.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-3xl mb-3" style={{ opacity: 0.3 }}>✓</p>
                        <p className="font-bold" style={{ color: "#0f172a" }}>Queue is empty!</p>
                        <p className="text-sm mt-1" style={{ color: "#64748b" }}>All agent submissions have been reviewed.</p>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-4">
                        {[...pendingHomes.map(h => ({ ...h, type: 'home' })), ...pendingHostels.map(h => ({ ...h, type: 'hostel' }))].map((p: any) => (
                          <div key={p.id} className="rounded-xl overflow-hidden flex flex-col relative" style={{ background: "#fafbfc", border: "1px solid #e9edf2" }}>
                            <span className="absolute top-2 left-2 text-white text-[9px] font-bold uppercase px-2 py-1 rounded z-10" style={{ background: p.type === "home" ? "#06c167" : "#2563eb" }}>
                              {p.type === 'home' ? 'Home' : 'Hostel'}
                            </span>
                            <div className="h-40 relative" style={{ background: "#e9edf2" }}>
                              {p.images?.[0] && <OptimizedImage src={p.images[0]} alt="" width={200} className="w-full h-full" />}
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-between">
                              <div>
                                <h3 className="text-sm font-bold line-clamp-1 mb-1" style={{ color: "#0f172a" }}>{p.title || p.name}</h3>
                                <p className="text-xs mb-2" style={{ color: "#64748b" }}>{p.city} • <span className="font-semibold" style={{ color: "#0f172a" }}>{p.owner_phone || p.manager_phone}</span></p>
                                <p className="text-[11px] line-clamp-2 p-2 rounded-lg" style={{ color: "#64748b", background: "#ffffff", border: "1px solid #e9edf2" }}>{p.description}</p>
                              </div>
                              <div className="mt-4 flex gap-2 pt-3" style={{ borderTop: "1px solid #e9edf2" }}>
                                <button onClick={() => approveProperty(p.id, p.type)} className="flex-1 text-white text-xs font-bold py-2 rounded-lg hover:opacity-90 transition-opacity" style={{ background: "#06c167" }}>Approve</button>
                                <button onClick={() => rejectProperty(p.id, p.type)} className="flex-1 text-xs font-bold py-2 rounded-lg" style={{ color: "#d97706", border: "1px solid #fde68a", background: "#ffffff" }}>Reject</button>
                                <button onClick={() => deleteProperty(p.id, p.type)} className="text-xs font-bold py-2 px-3 rounded-lg" style={{ color: "#ef4444", border: "1px solid #fecaca", background: "#ffffff" }}><IconTrash /></button>
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
              <div className="rounded-xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid #e9edf2", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid #e9edf2" }}>
                  <IconIdCard />
                  <h2 className="font-bold text-sm" style={{ color: "#0f172a" }}>KYC Audit View</h2>
                </div>
                <div className="p-5">
                  {pendingKyc.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-3xl mb-3" style={{ opacity: 0.3 }}>✓</p>
                      <p className="font-bold" style={{ color: "#0f172a" }}>No pending KYC submissions</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingKyc.map(k => (
                        <div key={k.id} className="rounded-xl p-5 flex flex-col md:flex-row gap-6 items-start md:items-center" style={{ border: "1px solid #e9edf2", background: "#fafbfc" }}>
                          <div className="w-full md:w-48 rounded-xl relative overflow-hidden shrink-0" style={{ aspectRatio: "16/9", background: "#e9edf2" }}>
                            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: "#94a3b8", background: "#ffffff" }}>
                              No Upload Included
                            </div>
                          </div>
                          <div className="flex-1 space-y-2">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#94a3b8" }}>ID Card Name</p>
                              <p className="text-base font-extrabold" style={{ color: "#0f172a" }}>{k.id_card_name}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="px-3 py-2 rounded-xl" style={{ background: "#ffffff", border: "1px solid #e9edf2" }}>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#94a3b8" }}>User Profile Name</p>
                                <p className="text-sm font-bold" style={{ color: "#0f172a" }}>{k.user?.full_name || "N/A"}</p>
                              </div>
                              <div className="px-3 py-2 rounded-xl" style={{ background: "#ffffff", border: "1px solid #e9edf2" }}>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#94a3b8" }}>Match Status</p>
                                {k.id_card_name?.toLowerCase() === k.user?.full_name?.toLowerCase() ? (
                                  <p className="text-sm font-bold" style={{ color: "#06c167" }}>Excellent Match</p>
                                ) : (
                                  <p className="text-sm font-bold" style={{ color: "#d97706" }}>Possible Mismatch</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex w-full md:w-auto md:flex-col gap-2 shrink-0">
                            <button onClick={() => resolveKyc(k.id, k.user_id, true)} className="flex-1 text-white font-bold px-6 py-2.5 rounded-xl hover:opacity-90 text-sm transition-opacity" style={{ background: "#06c167" }}>Approve</button>
                            <button onClick={() => resolveKyc(k.id, k.user_id, false)} className="flex-1 font-bold px-6 py-2.5 rounded-xl text-sm" style={{ color: "#64748b", border: "1px solid #e9edf2", background: "#ffffff" }}>Reject</button>
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
              <div className="rounded-xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid #e9edf2", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid #e9edf2" }}>
                  <IconTarget />
                  <h2 className="font-bold text-sm" style={{ color: "#0f172a" }}>Seeker Property Submissions</h2>
                </div>
                <div className="p-5">
                  {leads.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-3xl mb-3" style={{ opacity: 0.3 }}>📬</p>
                      <p className="font-bold" style={{ color: "#0f172a" }}>No leads from seekers.</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {leads.map(lead => (
                        <div key={lead.id} className="rounded-xl p-4 relative flex flex-col" style={{ background: "#fafbfc", border: "1px solid #e9edf2" }}>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="text-sm font-bold truncate" style={{ color: "#0f172a" }}>{lead.name}</p>
                              <a href={`tel:${lead.phone}`} className="text-xs font-bold hover:underline" style={{ color: "#2563eb" }}>
                                {lead.phone}
                              </a>
                            </div>
                            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
                              style={lead.status === "approved"
                                ? { background: "rgba(6,193,103,0.1)", color: "#06c167" }
                                : lead.status === "rejected"
                                ? { background: "rgba(239,68,68,0.08)", color: "#ef4444" }
                                : { background: "rgba(217,119,6,0.1)", color: "#d97706" }}>
                              {lead.status}
                            </span>
                          </div>
                          <div className="rounded-xl p-3 flex-1" style={{ background: "#ffffff", border: "1px solid #e9edf2" }}>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#94a3b8" }}>Location</p>
                            <p className="text-sm font-semibold mb-2" style={{ color: "#0f172a" }}>{lead.location}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#94a3b8" }}>Details</p>
                            <p className="text-xs line-clamp-3 leading-relaxed" style={{ color: "#64748b" }}>{lead.property_details || "No details provided"}</p>
                          </div>
                          {lead.status === "pending" && (
                            <div className="flex gap-2 mt-4 pt-3" style={{ borderTop: "1px solid #e9edf2" }}>
                              <button
                                onClick={async () => {
                                  await supabase.from("landlord_leads").update({ status: "approved" }).eq("id", lead.id);
                                  setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: "approved" } : l));
                                }}
                                className="flex-1 text-xs font-bold py-2 rounded-lg hover:opacity-90 transition-opacity"
                                style={{ background: "rgba(6,193,103,0.1)", color: "#06c167", border: "1px solid rgba(6,193,103,0.2)" }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={async () => {
                                  await supabase.from("landlord_leads").update({ status: "rejected" }).eq("id", lead.id);
                                  setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: "rejected" } : l));
                                }}
                                className="flex-1 text-xs font-bold py-2 rounded-lg"
                                style={{ background: "#ffffff", color: "#ef4444", border: "1px solid #fecaca" }}
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
              <div className="rounded-xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid #e9edf2", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid #e9edf2" }}>
                  <IconBuilding />
                  <h2 className="font-bold text-sm" style={{ color: "#0f172a" }}>Live Properties</h2>
                </div>
                <div className="p-5">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#06c167" }}>Homes</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(6,193,103,0.1)", color: "#06c167" }}>{liveHomes.length}</span>
                      </div>
                      <div className="space-y-2">
                        {liveHomes.length === 0 ? <p className="text-sm" style={{ color: "#94a3b8" }}>None live.</p> : liveHomes.map(h => (
                          <div key={h.id} className="p-3 rounded-xl" style={{ border: "1px solid #e9edf2", background: "#fafbfc" }}>
                            <div className="flex items-center justify-between">
                              <Link href={`/homes/${h.id}`} className="flex-1 min-w-0">
                                <p className="text-sm font-bold line-clamp-1" style={{ color: "#0f172a" }}>{h.title}</p>
                                <p className="text-xs font-semibold mt-0.5" style={{ color: "#64748b" }}>{h.city} • {h.price_label}</p>
                              </Link>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <button
                                  onClick={async () => {
                                    const newVal = !h.is_verified;
                                    await toggleVerified("homes", h.id, newVal);
                                    setHomes(prev => prev.map(x => x.id === h.id ? { ...x, is_verified: newVal } : x));
                                  }}
                                  className="text-[9px] font-bold px-2 py-1 rounded-lg transition-all active:scale-95"
                                  style={h.is_verified ? { background: "#06c167", color: "white" } : { color: "#64748b", border: "1px solid #e9edf2", background: "#ffffff" }}
                                  title={h.is_verified ? "Remove verified" : "Mark as verified"}
                                >
                                  <IconCheck /> {h.is_verified ? "Verified" : "Verify"}
                                </button>
                                <button onClick={() => deleteProperty(h.id, "home")} className="transition-colors" style={{ color: "#94a3b8" }} title="Delete">
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
                        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#2563eb" }}>Hostels</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(37,99,235,0.08)", color: "#2563eb" }}>{liveHostels.length}</span>
                      </div>
                      <div className="space-y-2">
                        {liveHostels.length === 0 ? <p className="text-sm" style={{ color: "#94a3b8" }}>None live.</p> : liveHostels.map(h => (
                          <div key={h.id} className="p-3 rounded-xl" style={{ border: "1px solid #e9edf2", background: "#fafbfc" }}>
                            <div className="flex items-center justify-between">
                              <Link href={`/hostels/${h.id}`} className="flex-1 min-w-0">
                                <p className="text-sm font-bold line-clamp-1" style={{ color: "#0f172a" }}>{h.name}</p>
                                <p className="text-xs font-semibold mt-0.5" style={{ color: "#64748b" }}>{h.city} • {h.price_range_label}</p>
                              </Link>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <button
                                  onClick={async () => {
                                    const newVal = !h.is_verified;
                                    await toggleVerified("hostels", h.id, newVal);
                                    setHostels(prev => prev.map(x => x.id === h.id ? { ...x, is_verified: newVal } : x));
                                  }}
                                  className="text-[9px] font-bold px-2 py-1 rounded-lg transition-all active:scale-95"
                                  style={h.is_verified ? { background: "#06c167", color: "white" } : { color: "#64748b", border: "1px solid #e9edf2", background: "#ffffff" }}
                                  title={h.is_verified ? "Remove verified" : "Mark as verified"}
                                >
                                  <IconCheck /> {h.is_verified ? "Verified" : "Verify"}
                                </button>
                                <button onClick={() => deleteProperty(h.id, "hostel")} className="transition-colors" style={{ color: "#94a3b8" }} title="Delete">
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
              <div className="rounded-xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid #e9edf2", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <div className="px-5 py-4" style={{ borderBottom: "1px solid #e9edf2" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <IconStar />
                    <h2 className="font-bold text-sm" style={{ color: "#0f172a" }}>Featured / Sponsored</h2>
                  </div>
                  <p className="text-xs" style={{ color: "#64748b" }}>Toggle up to 10 properties as &ldquo;Featured Today&rdquo;. These appear in a large carousel at the top of the browse pages.</p>
                </div>
                <div className="p-5 space-y-6">
                  {/* Homes */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest mb-3 px-1" style={{ color: "#06c167" }}>Homes</h3>
                    <div className="space-y-2">
                      {liveHomes.length === 0 ? <p className="text-sm" style={{ color: "#94a3b8" }}>No live homes.</p> : liveHomes.map(h => {
                        const isFeatured = !!h.is_sponsored;
                        const totalFeatured = homes.filter(x => x.is_sponsored).length + hostels.filter(x => x.is_sponsored).length;
                        return (
                          <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: "1px solid #e9edf2", background: "#fafbfc" }}>
                            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 relative" style={{ background: "#e9edf2" }}>
                              {h.images?.[0] && <OptimizedImage src={h.images[0]} alt="" width={200} className="w-full h-full" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold line-clamp-1" style={{ color: "#0f172a" }}>{h.title}</p>
                              <p className="text-xs" style={{ color: "#64748b" }}>{h.city} • {h.price_label}</p>
                            </div>
                            <button
                              onClick={async () => {
                                if (!isFeatured && totalFeatured >= 10) { alert("Maximum 10 featured properties allowed."); return; }
                                await toggleSponsored("homes", h.id, !isFeatured, 7);
                                setHomes(prev => prev.map(x => x.id === h.id ? { ...x, is_sponsored: !isFeatured, sponsored_until: !isFeatured ? new Date(Date.now() + 7 * 86400000).toISOString() : null, priority_score: !isFeatured ? 100 : 0 } : x));
                              }}
                              className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                              style={isFeatured ? { background: "#D4AF37", color: "white" } : { color: "#64748b", border: "1px solid #e9edf2", background: "#ffffff" }}
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
                    <h3 className="text-xs font-bold uppercase tracking-widest mb-3 px-1" style={{ color: "#2563eb" }}>Hostels</h3>
                    <div className="space-y-2">
                      {liveHostels.length === 0 ? <p className="text-sm" style={{ color: "#94a3b8" }}>No live hostels.</p> : liveHostels.map(h => {
                        const isFeatured = !!h.is_sponsored;
                        const totalFeatured = homes.filter(x => x.is_sponsored).length + hostels.filter(x => x.is_sponsored).length;
                        return (
                          <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: "1px solid #e9edf2", background: "#fafbfc" }}>
                            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 relative" style={{ background: "#e9edf2" }}>
                              {h.images?.[0] && <OptimizedImage src={h.images[0]} alt="" width={200} className="w-full h-full" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold line-clamp-1" style={{ color: "#0f172a" }}>{h.name}</p>
                              <p className="text-xs" style={{ color: "#64748b" }}>{h.city} • {h.price_range_label}</p>
                            </div>
                            <button
                              onClick={async () => {
                                if (!isFeatured && totalFeatured >= 10) { alert("Maximum 10 featured properties allowed."); return; }
                                await toggleSponsored("hostels", h.id, !isFeatured, 7);
                                setHostels(prev => prev.map(x => x.id === h.id ? { ...x, is_sponsored: !isFeatured, sponsored_until: !isFeatured ? new Date(Date.now() + 7 * 86400000).toISOString() : null, priority_score: !isFeatured ? 100 : 0 } : x));
                              }}
                              className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                              style={isFeatured ? { background: "#D4AF37", color: "white" } : { color: "#64748b", border: "1px solid #e9edf2", background: "#ffffff" }}
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
                  <div className="rounded-xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid #e9edf2", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                    <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid #e9edf2" }}>
                      <button onClick={() => setSelectedAgentId(null)} className="flex items-center gap-1.5 text-sm font-bold transition-colors hover:opacity-70" style={{ color: "#2563eb" }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        Back to Agents
                      </button>
                      <span style={{ color: "#e9edf2" }}>|</span>
                      <h2 className="text-sm font-bold" style={{ color: "#0f172a" }}>
                        {activeAgentProfiles.find(a => a.id === selectedAgentId)?.full_name || "Agent"}&apos;s Listings
                      </h2>
                    </div>
                    <div className="p-5">
                      {agentHomes.length === 0 && agentHostels.length === 0 ? (
                        <p className="text-sm py-8 text-center italic" style={{ color: "#94a3b8" }}>This agent has no listings.</p>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                          {agentHomes.map(h => (
                            <Link key={h.id} href={`/homes/${h.id}`} className="rounded-xl overflow-hidden flex flex-col" style={{ border: "1px solid #e9edf2" }}>
                              <div className="h-28 relative" style={{ background: "#e9edf2" }}>
                                {h.images?.[0] && <OptimizedImage src={h.images[0]} alt="" width={200} className="w-full h-full" />}
                                <span className="absolute top-2 left-2 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: "#06c167" }}>{h.status}</span>
                              </div>
                              <div className="p-3" style={{ background: "#ffffff" }}>
                                <p className="text-sm font-bold line-clamp-1" style={{ color: "#0f172a" }}>{h.title}</p>
                                <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{h.city} • {h.price_label}</p>
                              </div>
                            </Link>
                          ))}
                          {agentHostels.map(h => (
                            <Link key={h.id} href={`/hostels/${h.id}`} className="rounded-xl overflow-hidden flex flex-col" style={{ border: "1px solid #e9edf2" }}>
                              <div className="h-28 relative" style={{ background: "#e9edf2" }}>
                                {h.images?.[0] && <OptimizedImage src={h.images[0]} alt="" width={200} className="w-full h-full" />}
                                <span className="absolute top-2 left-2 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: "#2563eb" }}>{h.status}</span>
                              </div>
                              <div className="p-3" style={{ background: "#ffffff" }}>
                                <p className="text-sm font-bold line-clamp-1" style={{ color: "#0f172a" }}>{h.name}</p>
                                <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{h.city} • {h.price_range_label}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid #e9edf2", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                    <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid #e9edf2" }}>
                      <IconTie />
                      <h2 className="font-bold text-sm" style={{ color: "#0f172a" }}>Active Agents Directory</h2>
                    </div>
                    <div className="p-5">
                      {activeAgentProfiles.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-3xl mb-3" style={{ opacity: 0.3 }}>👤</p>
                          <p className="font-bold" style={{ color: "#0f172a" }}>No active agents yet</p>
                          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Agents will appear here once they post listings.</p>
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
                                className="rounded-xl p-4 flex flex-col items-start text-left transition-all"
                                style={{ background: "#fafbfc", border: "1px solid #e9edf2" }}
                              >
                                <div className="flex items-center gap-3 w-full mb-4">
                                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm shrink-0" style={{ background: "#06c167" }}>
                                    {(agent.full_name || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate" style={{ color: "#0f172a" }}>{agent.full_name || "Unnamed"}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: agent.kyc_status === 'verified' ? "#06c167" : "#94a3b8" }}>{agent.kyc_status === 'verified' ? 'Verified Agent' : 'Seeker'}</p>
                                  </div>
                                  <svg className="w-4 h-4 shrink-0" style={{ color: "#e9edf2" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                                </div>
                                <div className="w-full space-y-1.5">
                                  {agent.email && (
                                    <div className="flex items-center gap-2 text-xs" style={{ color: "#64748b" }}>
                                      <IconMail />
                                      <span className="truncate">{agent.email}</span>
                                    </div>
                                  )}
                                  {agent.phone && (
                                    <div className="flex items-center gap-2 text-xs" style={{ color: "#64748b" }}>
                                      <IconPhone />
                                      <a href={`tel:${agent.phone}`} className="font-medium hover:underline" style={{ color: "#2563eb" }} onClick={e => e.stopPropagation()}>{agent.phone}</a>
                                    </div>
                                  )}
                                  <div className="flex gap-1.5 pt-2 flex-wrap">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(6,193,103,0.1)", color: "#06c167" }}>{agentHomeCount} Home{agentHomeCount !== 1 ? 's' : ''}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(37,99,235,0.08)", color: "#2563eb" }}>{agentHostelCount} Hostel{agentHostelCount !== 1 ? 's' : ''}</span>
                                    {agent.is_agent && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(217,119,6,0.1)", color: "#d97706" }}>Subscribed Agent</span>
                                    )}
                                    {(() => {
                                      const sub = subscribedAgents.find(s => s.id === agent.id);
                                      return sub ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed" }}>
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

            {/* ── APPLICATIONS TAB ── */}
            {tab === "applications" && (
              <div className="space-y-5">
                <div className="rounded-xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid #e9edf2", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #e9edf2" }}>
                    <div className="flex items-center gap-2">
                      <IconCheckCircle />
                      <h2 className="font-bold text-sm" style={{ color: "#0f172a" }}>Concierge Agent Applications</h2>
                    </div>
                    {pendingApplications.length > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
                        {pendingApplications.length} pending
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    {applications.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="font-bold text-sm mb-1" style={{ color: "#0f172a" }}>No applications yet</p>
                        <p className="text-xs" style={{ color: "#64748b" }}>Applications submitted via the /apply page will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {applications.map(app => (
                          <div key={app.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid #e9edf2", background: "#fafbfc" }}>
                            {/* Header row */}
                            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #e9edf2", background: "#ffffff" }}>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0" style={{ background: "#f1f5f9", color: "#0f172a" }}>
                                  {(app.full_name || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                                </div>
                                <div>
                                  <p className="text-sm font-bold" style={{ color: "#0f172a" }}>{app.full_name}</p>
                                  <p className="text-[11px]" style={{ color: "#64748b" }}>{app.phone}{app.email ? ` · ${app.email}` : ""}</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full"
                                style={app.status === "approved"
                                  ? { background: "rgba(6,193,103,0.1)", color: "#06c167" }
                                  : app.status === "rejected"
                                  ? { background: "rgba(239,68,68,0.08)", color: "#ef4444" }
                                  : { background: "rgba(217,119,6,0.1)", color: "#d97706" }}>
                                {app.status}
                              </span>
                            </div>

                            {/* ID info */}
                            <div className="px-4 py-3 flex gap-2 flex-wrap" style={{ borderBottom: "1px solid #e9edf2" }}>
                              <span className="text-[11px] font-semibold px-2 py-1 rounded" style={{ background: "#ffffff", border: "1px solid #e9edf2", color: "#0f172a" }}>
                                {app.id_type}
                              </span>
                              <span className="text-[11px] font-mono font-semibold px-2 py-1 rounded" style={{ background: "#ffffff", border: "1px solid #e9edf2", color: "#0f172a" }}>
                                {app.id_number}
                              </span>
                              {app.user?.full_name && app.user.full_name.toLowerCase() !== app.full_name.toLowerCase() && (
                                <span className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: "rgba(217,119,6,0.1)", color: "#d97706" }}>
                                  ⚠ Name mismatch with profile
                                </span>
                              )}
                            </div>

                            {/* Photos side by side */}
                            <div className="grid grid-cols-2 gap-3 p-4">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#94a3b8" }}>ID Document</p>
                                {app.id_photo_url ? (
                                  <a href={app.id_photo_url} target="_blank" rel="noopener noreferrer">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={app.id_photo_url} alt="ID" className="w-full rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity" style={{ aspectRatio: "16/9" }} />
                                  </a>
                                ) : (
                                  <div className="w-full rounded-lg flex items-center justify-center text-xs font-semibold" style={{ aspectRatio: "16/9", background: "#f1f5f9", color: "#94a3b8" }}>No photo</div>
                                )}
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#94a3b8" }}>Selfie</p>
                                {app.selfie_url ? (
                                  <a href={app.selfie_url} target="_blank" rel="noopener noreferrer">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={app.selfie_url} alt="Selfie" className="w-full rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity" style={{ aspectRatio: "3/4" }} />
                                  </a>
                                ) : (
                                  <div className="w-full rounded-lg flex items-center justify-center text-xs font-semibold" style={{ aspectRatio: "3/4", background: "#f1f5f9", color: "#94a3b8" }}>No photo</div>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            {app.status === "pending" && (
                              <div className="flex gap-2 px-4 pb-4">
                                <button
                                  onClick={() => resolveApplication(app.id, app.user_id, true)}
                                  className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-90"
                                  style={{ background: "#06c167", color: "#fff" }}>
                                  Approve &amp; Activate Agent
                                </button>
                                <button
                                  onClick={() => resolveApplication(app.id, app.user_id, false)}
                                  className="py-2.5 px-4 rounded-xl font-bold text-sm"
                                  style={{ background: "#f1f5f9", color: "#64748b" }}>
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

// ── TabButton ──────────────────────────────────────────────────────────────
function TabButton({
  active, onClick, icon, label, count, disabled, countRed,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  disabled?: boolean;
  countRed?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all whitespace-nowrap shrink-0 w-full text-left"
      style={
        disabled
          ? { color: "#94a3b8", cursor: "not-allowed", opacity: 0.5, background: "transparent" }
          : active
          ? { color: "#06c167", background: "rgba(6,193,103,0.08)", borderLeft: "4px solid #06c167", paddingLeft: 8 }
          : { color: "#64748b", background: "transparent" }
      }
    >
      <span className="text-base opacity-80 shrink-0">{icon}</span>
      <span className="flex-1 text-left text-[13px]">{label}</span>
      {disabled && (
        <span className="px-1.5 py-0.5 text-[9px] rounded-full shrink-0" style={{ background: "#f1f5f9", color: "#94a3b8" }}>Soon</span>
      )}
      {!disabled && count !== undefined && count > 0 && (
        <span className="px-2 py-0.5 text-[10px] rounded-full shrink-0 font-bold"
          style={countRed
            ? { background: "rgba(239,68,68,0.1)", color: "#ef4444" }
            : active
            ? { background: "#06c167", color: "white" }
            : { background: "rgba(6,193,103,0.1)", color: "#06c167" }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── StatGroup ──────────────────────────────────────────────────────────────
function StatGroup({
  title, accentColor, metrics, onClick,
}: {
  title: string;
  accentColor: string;
  metrics: { label: string; value: number | string }[];
  onClick?: () => void;
}) {
  return (
    <div
      className="rounded-xl p-5 relative overflow-hidden"
      style={{
        background: "#ffffff",
        border: "1px solid #e9edf2",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        borderLeft: `4px solid ${accentColor}`,
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: "#94a3b8" }}>{title}</p>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((m, i) => (
          <div key={i}>
            <p className="text-2xl font-black tracking-tight leading-none mb-1" style={{ color: "#0f172a" }}>{m.value}</p>
            <p className="text-[11px] font-medium leading-tight" style={{ color: "#64748b" }}>{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── KanbanColumn ───────────────────────────────────────────────────────────
function KanbanColumn({
  title, color, dotColor, bgLight, count, children,
}: {
  title: string;
  color: string;
  dotColor: string;
  bgLight: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="shrink-0 flex flex-col rounded-xl overflow-hidden"
      style={{ width: 272, background: "#f7f8fa", border: "1px solid #e9edf2" }}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-3" style={{ borderBottom: "1px solid #e9edf2", background: "#ffffff" }}>
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dotColor }} />
        <span className="text-[12px] font-bold flex-1" style={{ color: "#0f172a" }}>{title}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: bgLight, color }}>
          {count}
        </span>
      </div>
      {/* Column body */}
      <div className="p-2 space-y-2.5 overflow-y-auto HideScrollbar" style={{ maxHeight: 480 }}>
        {children}
      </div>
    </div>
  );
}

// ── BookingKanbanCard ──────────────────────────────────────────────────────
function BookingKanbanCard({
  booking: b,
  accentColor,
  onAccept,
  onReject,
  onDelete,
}: {
  booking: any;
  accentColor: string;
  onAccept: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const statusStyle = (s: string) => {
    switch (s) {
      case "pending":            return { bg: "rgba(217,119,6,0.1)",   color: "#d97706" };
      case "accepted":           return { bg: "rgba(6,193,103,0.1)",   color: "#06c167" };
      case "fee_paid":           return { bg: "rgba(124,58,237,0.1)",  color: "#7c3aed" };
      case "viewing_scheduled":  return { bg: "rgba(8,145,178,0.1)",   color: "#0891b2" };
      case "completed":          return { bg: "rgba(6,193,103,0.12)",  color: "#059669" };
      default:                   return { bg: "#f1f5f9",               color: "#64748b" };
    }
  };

  const ss = statusStyle(b.status);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "#ffffff",
        border: "1px solid #e9edf2",
        borderLeft: `3px solid ${accentColor}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Top: image + info — click opens property detail */}
      <Link
        href={b.property_type === "home" ? `/homes/${b.property_ref || b.property?.id}` : `/hostels/${b.property_ref || b.property?.id}`}
        target="_blank"
        className="flex items-start gap-2.5 p-3 pb-2 hover:bg-slate-50 transition-colors"
        style={{ display: "flex" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 relative" style={{ background: "#e9edf2" }}>
          {b.property?.images?.[0] && (
            <OptimizedImage src={b.property.images[0]} alt="" width={100} className="w-full h-full" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span
              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
              style={b.property_type === "home"
                ? { background: "rgba(6,193,103,0.1)", color: "#06c167" }
                : { background: "rgba(37,99,235,0.08)", color: "#2563eb" }}
            >
              {b.property_type === "home" ? "Home" : "Hostel"}
            </span>
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: ss.bg, color: ss.color }}>
              {b.status?.replace("_", " ")}
            </span>
          </div>
          <p className="text-[12px] font-bold line-clamp-1 leading-tight" style={{ color: "#0f172a" }}>
            {b.property?.title || b.property?.name || "—"}
          </p>
          <p className="text-[11px] font-medium leading-tight" style={{ color: "#64748b" }}>
            {b.user?.full_name || "Unknown"}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>
            {b.viewing_date ? new Date(b.viewing_date).toLocaleDateString() : "Anytime"}
          </p>
        </div>
      </Link>

      {/* Bottom: actions */}
      <div className="flex items-center gap-1 px-3 pb-3">
        {b.user?.phone && (
          <a
            href={`tel:${b.user.phone}`}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm"
            style={{ background: "#f7f8fa", color: "#64748b", border: "1px solid #e9edf2" }}
            title="Call"
          >
            <IconPhone />
          </a>
        )}
        <Link
          href={`/chat?seeker_id=${b.user_id}`}
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm"
          style={{ background: "rgba(6,193,103,0.08)", color: "#06c167", border: "1px solid rgba(6,193,103,0.15)" }}
          title="Chat"
        >
          <IconChat />
        </Link>
        {b.status === "pending" && (
          <>
            <button
              onClick={onAccept}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold"
              style={{ background: "#06c167", color: "#fff" }}
              title="Accept"
            >
              ✓
            </button>
            <button
              onClick={onReject}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold"
              style={{ background: "#f1f5f9", color: "#64748b" }}
              title="Reject"
            >
              ✕
            </button>
          </>
        )}
        <button
          onClick={onDelete}
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm ml-auto"
          style={{ background: "rgba(239,68,68,0.06)", color: "#ef4444" }}
          title="Delete"
        >
          <IconTrash />
        </button>
      </div>
    </div>
  );
}
