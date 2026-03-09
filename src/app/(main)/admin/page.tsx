"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { motion } from "framer-motion";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  
  const [homes, setHomes] = useState<any[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [kyc, setKyc] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [tab, setTab] = useState<"dashboard" | "properties" | "queue" | "audit" | "leads">("dashboard");
  const [searchCity, setSearchCity] = useState("");

  const [verifyCode, setVerifyCode] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "admin")) {
      router.push("/");
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (profile?.role !== "admin") return;

    async function fetchData() {
      setLoading(true);
      const [homesRes, hostelsRes, bookingsRes, leadsRes, kycRes] = await Promise.all([
        supabase.from("homes").select("*").order("created_at", { ascending: false }),
        supabase.from("hostels").select("*").order("created_at", { ascending: false }),
        supabase.from("bookings").select("*").eq("payment_status", "paid").order("viewing_date", { ascending: true }),
        supabase.from("landlord_leads").select("*").order("created_at", { ascending: false }),
        supabase.from("kyc_submissions").select("*, user:profiles(id, full_name, email)").order("created_at", { ascending: false }),
      ]);
      setHomes(homesRes.data || []);
      setHostels(hostelsRes.data || []);
      setBookings(bookingsRes.data || []);
      setLeads(leadsRes.data || []);
      setKyc(kycRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, [profile]);

  const liveHomes = useMemo(() => homes.filter(h => h.status === "approved" || !h.status), [homes]);
  const pendingHomes = useMemo(() => homes.filter(h => h.status === "pending_admin"), [homes]);
  
  const liveHostels = useMemo(() => hostels.filter(h => h.status === "approved" || !h.status), [hostels]);
  const pendingHostels = useMemo(() => hostels.filter(h => h.status === "pending_admin"), [hostels]);

  const pendingKyc = useMemo(() => kyc.filter(k => k.status === "pending"), [kyc]);

  const totalViewingFees = useMemo(() => bookings.length * 50, [bookings]);
  const activeAgents = useMemo(() => new Set([...homes.filter(h => h.owner_id).map(h => h.owner_id), ...hostels.filter(h => h.manager_id).map(h => h.manager_id)]).size, [homes, hostels]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifyStatus("loading");
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("ticket_code", verifyCode.toUpperCase())
      .single();

    if (error || !booking || booking.status === "completed") {
      setVerifyStatus("error");
      setTimeout(() => setVerifyStatus("idle"), 3000);
      return;
    }

    await supabase.from("bookings").update({ status: "completed" }).eq("id", booking.id);
    setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: "completed" } : b));
    setVerifyStatus("success");
    setVerifyCode("");
    setTimeout(() => setVerifyStatus("idle"), 3000);
  }

  async function approveProperty(id: string, type: "home" | "hostel") {
    await supabase.from(type === "home" ? "homes" : "hostels").update({ status: "approved" }).eq("id", id);
    if (type === "home") setHomes(prev => prev.map(h => h.id === id ? { ...h, status: "approved" } : h));
    if (type === "hostel") setHostels(prev => prev.map(h => h.id === id ? { ...h, status: "approved" } : h));
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile || profile.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar for Desktop / Top Nav for Mobile */}
      <div className="bg-gray-900 text-white md:w-64 shrink-0 flex flex-col md:h-screen sticky top-0 md:border-r border-gray-800 z-50">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">StayMate Command</h1>
          <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Super Admin</p>
        </div>
        <div className="flex flex-row md:flex-col p-4 gap-2 overflow-x-auto md:overflow-y-auto HideScrollbar">
          <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon="📊" label="Dashboard" />
          <TabButton active={tab === "properties"} onClick={() => setTab("properties")} icon="🏢" label="Live Properties" count={liveHomes.length + liveHostels.length} />
          <TabButton active={tab === "queue"} onClick={() => setTab("queue")} icon="⏳" label="Agent Queue" count={pendingHomes.length + pendingHostels.length} />
          <TabButton active={tab === "audit"} onClick={() => setTab("audit")} icon="🪪" label="KYC Audit" count={pendingKyc.length} />
          <TabButton active={tab === "leads"} onClick={() => setTab("leads")} icon="🎯" label="Seeker Leads" count={leads.filter(l => l.status === "pending").length} />
          
          <div className="hidden md:block mt-auto pt-6 border-t border-gray-800">
            <Link 
              href="/admin/post"
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform"
            >
              <span>+</span> Upload Listing
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {tab === "dashboard" && (
            <>
              {/* Metrics Header */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard title="Total Viewing Revenue" value={`GH₵ ${totalViewingFees}`} icon="💰" color="text-amber-500" />
                <MetricCard title="Active Agents" value={activeAgents.toString()} icon="👔" color="text-blue-500" />
                <MetricCard title="Live Properties" value={(liveHomes.length + liveHostels.length).toString()} icon="🏘️" color="text-emerald-500" />
                <MetricCard title="Pending Approvals" value={(pendingHomes.length + pendingHostels.length + pendingKyc.length).toString()} icon="⚠️" color="text-red-500" />
              </div>

              {/* Quick Actions & Viewings */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-3xl">🎫</span>
                    <div>
                      <h2 className="text-lg font-extrabold text-gray-900">Verify Ticket</h2>
                      <p className="text-xs text-gray-500 font-medium">Clear a seeker for their viewing.</p>
                    </div>
                  </div>
                  <form onSubmit={handleVerify} className="flex gap-2">
                    <input
                      required
                      value={verifyCode}
                      onChange={e => setVerifyCode(e.target.value)}
                      placeholder="e.g. A8X9F2"
                      className="flex-1 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none rounded-xl px-4 py-3 font-mono uppercase tracking-widest text-sm transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={verifyStatus === "loading"}
                      className="bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl active:scale-95 transition-transform"
                    >
                      Verify
                    </button>
                  </form>
                  {verifyStatus === "success" && <p className="text-sm font-bold text-emerald-600 mt-4 flex items-center gap-2">✅ Valid Ticket! Viewing confirmed.</p>}
                  {verifyStatus === "error" && <p className="text-sm font-bold text-red-500 mt-4 flex items-center gap-2">❌ Invalid or already used ticket.</p>}
                </div>

                <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm flex flex-col h-min">
                  <h3 className="text-sm font-extrabold text-gray-900 mb-4 bg-gray-50 inline-block px-3 py-1 rounded-lg">Upcoming Viewings</h3>
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-64 pr-2">
                    {bookings.filter(b => b.status !== "completed").length === 0 ? (
                      <p className="text-sm text-gray-400 italic py-8 text-center">No upcoming viewings scheduled.</p>
                    ) : (
                      bookings.filter(b => b.status !== "completed").map((b) => (
                        <div key={b.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                          <div className="min-w-0 pr-4">
                            <p className="text-sm font-bold text-gray-900 line-clamp-1">{b.listing_title}</p>
                            <p className="text-[10px] text-gray-500 font-semibold mt-0.5">{b.seeker_name} • {b.viewing_date ? new Date(b.viewing_date).toLocaleDateString() : "TBD"}</p>
                          </div>
                          <div className="bg-gray-100 px-2.5 py-1.5 rounded-lg font-mono text-[10px] font-bold text-gray-600 tracking-widest shrink-0">
                            {b.ticket_code}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
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
                            <button className="flex-1 bg-white border border-gray-200 text-red-600 text-xs font-bold py-2 rounded-xl hover:bg-red-50 transition-colors">Reject Details</button>
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
                <span className="text-2xl">🏢</span> Live Agent & Admin Outlets
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4 px-1 flex justify-between">
                    <span>Homes</span> <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">{liveHomes.length}</span>
                  </h3>
                  <div className="space-y-3">
                    {liveHomes.length === 0 ? <p className="text-sm text-gray-400">None live.</p> : liveHomes.map(h => (
                      <Link key={h.id} href={`/homes/${h.id}`} className="block border border-gray-100 p-3 rounded-2xl hover:bg-gray-50 flex items-center justify-between">
                        <div>
                           <p className="text-sm font-bold text-gray-900">{h.title}</p>
                           <p className="text-xs text-gray-500 font-semibold mt-0.5">{h.city} • {h.price_label}</p>
                        </div>
                        <span className="text-gray-400 text-lg">→</span>
                      </Link>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 px-1 flex justify-between">
                    <span>Hostels</span> <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{liveHostels.length}</span>
                  </h3>
                  <div className="space-y-3">
                    {liveHostels.length === 0 ? <p className="text-sm text-gray-400">None live.</p> : liveHostels.map(h => (
                      <Link key={h.id} href={`/hostels/${h.id}`} className="block border border-gray-100 p-3 rounded-2xl hover:bg-gray-50 flex items-center justify-between">
                        <div>
                           <p className="text-sm font-bold text-gray-900">{h.name}</p>
                           <p className="text-xs text-gray-500 font-semibold mt-0.5">{h.city} • {h.price_range_label}</p>
                        </div>
                        <span className="text-gray-400 text-lg">→</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .HideScrollbar::-webkit-scrollbar { display: none; }
        .HideScrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
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

function MetricCard({ title, value, icon, color }: { title: string, value: string, icon: string, color: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
       <span className="text-2xl mb-2 block opacity-80">{icon}</span>
       <p className={`text-2xl font-black ${color} tracking-tight`}>{value}</p>
       <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1 leading-snug">{title}</p>
    </div>
  );
}
