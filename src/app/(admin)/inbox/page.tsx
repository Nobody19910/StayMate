"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  
  const [homes, setHomes] = useState<any[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [kyc, setKyc] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [tab, setTab] = useState<"dashboard" | "properties" | "queue" | "audit" | "leads" | "agents">("dashboard");
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);



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

      // Manually join profiles to bookings and kyc
      const mappedBookings = (bookingsRes.data || []).map((b) => ({
        ...b,
        user: allProfiles.find(p => p.id === b.user_id) || null
      }));

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile || profile.role !== "admin") return null;

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col">
        <div className="max-w-6xl mx-auto space-y-8 flex-1 flex flex-col w-full pb-20 md:pb-0">
          
          {tab === "dashboard" && (
            <div className="flex flex-col flex-1 gap-8">
              {/* Metrics Header */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard title="Total Inquiries" value={totalInquiries.toString()} icon="💬" color="text-amber-500" />
                <MetricCard title="Active Agents" value={activeAgents.toString()} icon="👔" color="text-blue-500" onClick={() => { setTab("agents"); setSelectedAgentId(null); }} />
                <MetricCard title="Live Properties" value={(liveHomes.length + liveHostels.length).toString()} icon="🏘️" color="text-emerald-500" onClick={() => setTab("properties")} />
                <MetricCard title="Pending Approvals" value={(pendingHomes.length + pendingHostels.length + pendingKyc.length).toString()} icon="⚠️" color="text-red-500" onClick={() => setTab("queue")} />
              </div>

              {/* Inquiries */}
              <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm flex flex-col flex-1 min-h-[400px]">
                <div className="shrink-0 mb-4">
                  <h3 className="text-sm font-extrabold text-gray-900 bg-gray-50 inline-block px-3 py-1 rounded-lg">Recent Inquiries</h3>
                </div>
                <div className="space-y-3 overflow-y-auto pr-2 flex-1 relative min-h-0 pb-10">
                  {bookings.length === 0 ? (
                    <p className="text-sm text-gray-400 italic py-8 text-center">No inquiries received yet.</p>
                  ) : (
                    bookings.map((b) => (
                      <div key={b.id} className="flex flex-col md:flex-row md:items-start justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors gap-4">
                        <div className="min-w-0 pr-4 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${b.property_type === 'home' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                              {b.property_type}
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${b.status === 'accepted' ? 'bg-emerald-50 text-emerald-600' : b.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                              {b.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">
                            <span className="font-semibold text-gray-800">{b.user?.full_name || 'Unknown User'}</span> 
                            {b.user?.phone && ` • ${b.user.phone}`} 
                            {b.user?.email && ` • ${b.user.email}`}
                          </p>
                          {b.message && (
                            <div className="bg-white border border-gray-100 p-3 rounded-xl text-sm text-gray-700 whitespace-pre-wrap">
                              "{b.message}"
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Pref. Date</p>
                          <p className="text-sm font-bold text-gray-900">
                            {b.viewing_date ? new Date(b.viewing_date).toLocaleDateString() : "Anytime"}
                          </p>
                          <div className="mt-4 flex flex-col md:flex-row gap-2 justify-end">
                            {b.user?.phone && (
                              <a href={`tel:${b.user.phone}`} className="inline-flex items-center justify-center gap-1 text-xs font-bold text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                                📞 Call
                              </a>
                            )}
                            <Link href={`/chat?seeker_id=${b.user_id}`} className="inline-flex items-center justify-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors">
                              💬 Chat
                            </Link>
                            {b.status === "pending" && (
                              <>
                                <button onClick={() => resolveBooking(b.id, "accepted")} className="inline-flex items-center justify-center text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                                  ✓ Accept
                                </button>
                                <button onClick={() => resolveBooking(b.id, "rejected")} className="inline-flex items-center justify-center text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors">
                                  ✕ Reject
                                </button>
                              </>
                            )}
                            <button onClick={() => deleteBooking(b.id)} className="inline-flex items-center justify-center text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
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

          {tab === "queue" && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
                <h2 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="text-2xl">⏳</span> Agent Property Queue
                </h2>
                
                {pendingHomes.length === 0 && pendingHostels.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <span className="text-5xl opacity-50 mb-4 block">🧹</span>
                    <p className="font-bold text-gray-600">Queue is empty!</p>
                    <p className="text-sm mt-1">All agent submissions have been reviewed.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {[...pendingHomes.map(h => ({ ...h, type: 'home' })), ...pendingHostels.map(h => ({ ...h, type: 'hostel' }))].map((p: any) => (
                      <div key={p.id} className="border border-gray-200 rounded-2xl overflow-hidden flex flex-col relative bg-gray-50">
                        <span className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-bold uppercase px-2 py-1 rounded backdrop-blur z-10">
                          {p.type === 'home' ? 'Home/Apt' : 'Hostel'}
                        </span>
                        <div className="h-32 bg-gray-200 relative">
                          {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-gray-900 line-clamp-1 mb-1">{p.title || p.name}</h3>
                            <p className="text-xs text-gray-500 mb-2">{p.city} • <span className="font-semibold text-gray-700">{p.owner_phone || p.manager_phone}</span></p>
                            <p className="text-[11px] text-gray-600 line-clamp-2 bg-white p-2 rounded border border-gray-100">{p.description}</p>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <button onClick={() => approveProperty(p.id, p.type)} className="flex-1 bg-emerald-500 text-white text-xs font-bold py-2 rounded-xl hover:bg-emerald-600 transition-colors">Approve</button>
                            <button onClick={() => rejectProperty(p.id, p.type)} className="flex-1 bg-white border border-gray-200 text-amber-600 text-xs font-bold py-2 rounded-xl hover:bg-amber-50 transition-colors">Reject</button>
                            <button onClick={() => deleteProperty(p.id, p.type)} className="bg-white border border-gray-200 text-red-600 text-xs font-bold py-2 px-3 rounded-xl hover:bg-red-50 transition-colors">🗑️</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "audit" && (
            <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
              <h2 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-2">
                <span className="text-2xl">🪪</span> KYC Audit View
              </h2>
              
              {pendingKyc.length === 0 ? (
                 <div className="text-center py-12 text-gray-400">
                  <span className="text-5xl opacity-50 mb-4 block">✔️</span>
                  <p className="font-bold text-gray-600">No pending KYC submissions</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingKyc.map(k => (
                    <div key={k.id} className="border border-gray-200 rounded-2xl p-5 flex flex-col md:flex-row gap-6 items-start md:items-center bg-gray-50/50">
                      <div className="w-full md:w-48 aspect-[1.6] bg-gray-200 rounded-xl relative overflow-hidden shrink-0 shadow-sm border border-gray-200">
                         {/* Mock image placeholder for ID */}
                         <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-bold bg-white text-sm">
                           No Upload Included
                         </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID Card Name</p>
                          <p className="text-base font-extrabold text-gray-900">{k.id_card_name}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white px-3 py-2 rounded-xl border border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">User Profile Name</p>
                            <p className="text-sm font-bold text-gray-800">{k.user?.full_name || "N/A"}</p>
                          </div>
                          <div className="bg-white px-3 py-2 rounded-xl border border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Match Status</p>
                            {k.id_card_name?.toLowerCase() === k.user?.full_name?.toLowerCase() ? (
                              <p className="text-sm font-bold text-emerald-600">Excellent Match</p>
                            ) : (
                              <p className="text-sm font-bold text-amber-600">Possible Mismatch</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex w-full md:w-auto md:flex-col gap-2 shrink-0">
                         <button onClick={() => resolveKyc(k.id, k.user_id, true)} className="flex-1 bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-600 text-sm transition-colors">Approve</button>
                         <button onClick={() => resolveKyc(k.id, k.user_id, false)} className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold px-6 py-2.5 rounded-xl hover:bg-gray-100 text-sm transition-colors">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "leads" && (
            <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
              <h2 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-2">
                <span className="text-2xl">🎯</span> Seeker Property Submissions
              </h2>
              {leads.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <span className="text-5xl opacity-50 mb-4 block">📭</span>
                  <p className="font-bold text-gray-600">No leads from seekers.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leads.map(lead => (
                    <div key={lead.id} className="bg-gray-50 rounded-2xl border border-gray-100 shadow-sm p-4 relative flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-sm font-bold text-gray-900 truncate">{lead.name}</p>
                          <a href={`tel:${lead.phone}`} className="text-xs text-blue-600 font-bold hover:underline">
                            {lead.phone}
                          </a>
                        </div>
                        <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                          lead.status === "approved" ? "bg-emerald-100 text-emerald-800"
                          : lead.status === "rejected" ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                        }`}>
                          {lead.status}
                        </span>
                      </div>
                      <div className="bg-white rounded-xl p-3 border border-gray-100 flex-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Location</p>
                        <p className="text-sm font-semibold text-gray-900 mb-2">{lead.location}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Details</p>
                        <p className="text-xs text-gray-700 line-clamp-3 leading-relaxed">{lead.property_details || "No details provided"}</p>
                      </div>
                      {lead.status === "pending" && (
                        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                          <button
                            onClick={async () => {
                              await supabase.from("landlord_leads").update({ status: "approved" }).eq("id", lead.id);
                              setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: "approved" } : l));
                            }}
                            className="flex-1 bg-emerald-50 text-emerald-700 text-xs font-bold py-2 rounded-xl hover:bg-emerald-100 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={async () => {
                              await supabase.from("landlord_leads").update({ status: "rejected" }).eq("id", lead.id);
                              setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: "rejected" } : l));
                            }}
                            className="flex-1 bg-red-50 text-red-700 text-xs font-bold py-2 rounded-xl hover:bg-red-100 transition-colors"
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
          )}

          {tab === "properties" && (
            <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
              <h2 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-2">
                <span className="text-2xl">🏢</span> Live Properties
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4 px-1 flex justify-between">
                    <span>Homes</span> <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">{liveHomes.length}</span>
                  </h3>
                  <div className="space-y-3">
                    {liveHomes.length === 0 ? <p className="text-sm text-gray-400">None live.</p> : liveHomes.map(h => (
                      <div key={h.id} className="border border-gray-100 p-3 rounded-2xl hover:bg-gray-50 flex items-center justify-between">
                        <Link href={`/homes/${h.id}`} className="flex-1 min-w-0">
                           <p className="text-sm font-bold text-gray-900 line-clamp-1">{h.title}</p>
                           <p className="text-xs text-gray-500 font-semibold mt-0.5">{h.city} • {h.price_label}</p>
                        </Link>
                        <button onClick={() => deleteProperty(h.id, "home")} className="ml-3 text-gray-400 hover:text-red-500 transition-colors shrink-0" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 px-1 flex justify-between">
                    <span>Hostels</span> <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{liveHostels.length}</span>
                  </h3>
                  <div className="space-y-3">
                    {liveHostels.length === 0 ? <p className="text-sm text-gray-400">None live.</p> : liveHostels.map(h => (
                      <div key={h.id} className="border border-gray-100 p-3 rounded-2xl hover:bg-gray-50 flex items-center justify-between">
                        <Link href={`/hostels/${h.id}`} className="flex-1 min-w-0">
                           <p className="text-sm font-bold text-gray-900 line-clamp-1">{h.name}</p>
                           <p className="text-xs text-gray-500 font-semibold mt-0.5">{h.city} • {h.price_range_label}</p>
                        </Link>
                        <button onClick={() => deleteProperty(h.id, "hostel")} className="ml-3 text-gray-400 hover:text-red-500 transition-colors shrink-0" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "agents" && (
            <div className="space-y-6">
              {selectedAgentId ? (
                /* Agent's Properties View */
                <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
                  <button onClick={() => setSelectedAgentId(null)} className="flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-800 mb-6 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    Back to Agents
                  </button>
                  <h2 className="text-lg font-extrabold text-gray-900 mb-4">
                    {activeAgentProfiles.find(a => a.id === selectedAgentId)?.full_name || "Agent"}&apos;s Listings
                  </h2>
                  {agentHomes.length === 0 && agentHostels.length === 0 ? (
                    <p className="text-sm text-gray-400 py-8 text-center italic">This agent has no listings.</p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {agentHomes.map(h => (
                        <Link key={h.id} href={`/homes/${h.id}`} className="border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                          <div className="h-28 bg-gray-200 relative">
                            {h.images?.[0] && <img src={h.images[0]} alt="" className="w-full h-full object-cover" />}
                            <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded">{h.status}</span>
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-bold text-gray-900 line-clamp-1">{h.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{h.city} • {h.price_label}</p>
                          </div>
                        </Link>
                      ))}
                      {agentHostels.map(h => (
                        <Link key={h.id} href={`/hostels/${h.id}`} className="border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                          <div className="h-28 bg-gray-200 relative">
                            {h.images?.[0] && <img src={h.images[0]} alt="" className="w-full h-full object-cover" />}
                            <span className="absolute top-2 left-2 bg-blue-500 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded">{h.status}</span>
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-bold text-gray-900 line-clamp-1">{h.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{h.city} • {h.price_range_label}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Agents Directory */
                <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
                  <h2 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-2">
                    <span className="text-2xl">👔</span> Active Agents Directory
                  </h2>
                  {activeAgentProfiles.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <span className="text-5xl opacity-50 mb-4 block">🤷</span>
                      <p className="font-bold text-gray-600">No active agents yet</p>
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
                            className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex flex-col items-start text-left hover:border-emerald-200 hover:shadow-md transition-all group"
                          >
                            <div className="flex items-center gap-3 w-full mb-4">
                              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-extrabold text-sm shrink-0">
                                {(agent.full_name || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">{agent.full_name || "Unnamed"}</p>
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{agent.kyc_status === 'verified' ? 'Verified Agent' : 'Seeker'}</p>
                              </div>
                              <svg className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                            </div>
                            <div className="w-full space-y-2">
                              {agent.email && (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>📧</span>
                                  <span className="truncate">{agent.email}</span>
                                </div>
                              )}
                              {agent.phone && (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>📞</span>
                                  <a href={`tel:${agent.phone}`} className="text-blue-600 font-medium hover:underline" onClick={e => e.stopPropagation()}>{agent.phone}</a>
                                </div>
                              )}
                              <div className="flex gap-2 pt-2">
                                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{agentHomeCount} Home{agentHomeCount !== 1 ? 's' : ''}</span>
                                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{agentHostelCount} Hostel{agentHostelCount !== 1 ? 's' : ''}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count }: { active: boolean, onClick: () => void, icon: string, label: string, count?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap md:whitespace-normal shrink-0 border ${
        active 
        ? "bg-white text-gray-900 border-white shadow-sm" 
        : "bg-transparent text-gray-400 border-transparent hover:bg-gray-800 hover:text-white hover:border-gray-700"
      }`}
    >
      <span className="text-lg opacity-80">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`px-2 py-0.5 text-[10px] rounded-full shrink-0 ${active ? "bg-red-500 text-white" : "bg-red-500/20 text-red-500"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function MetricCard({ title, value, icon, color, onClick }: { title: string, value: string, icon: string, color: string, onClick?: () => void }) {
  return (
    <div
      className={`bg-white border border-gray-100 rounded-3xl p-5 shadow-sm transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-200 active:scale-[0.97]' : ''}`}
      onClick={onClick}
    >
       <span className="text-2xl mb-2 block opacity-80">{icon}</span>
       <p className={`text-2xl font-black ${color} tracking-tight`}>{value}</p>
       <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1 leading-snug">{title}</p>
    </div>
  );
}
