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
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"properties" | "viewings" | "leads">("properties");
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
      const [homesRes, hostelsRes, bookingsRes, leadsRes] = await Promise.all([
        supabase.from("homes").select("*").order("created_at", { ascending: false }),
        supabase.from("hostels").select("*").order("created_at", { ascending: false }),
        supabase.from("bookings").select("*").eq("payment_status", "paid").order("viewing_date", { ascending: true }),
        supabase.from("landlord_leads").select("*").order("created_at", { ascending: false }),
      ]);
      setHomes(homesRes.data || []);
      setHostels(hostelsRes.data || []);
      setBookings(bookingsRes.data || []);
      setLeads(leadsRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, [profile]);

  const filteredHomes = useMemo(() => {
    if (!searchCity) return homes;
    return homes.filter(h => h.city.toLowerCase().includes(searchCity.toLowerCase()));
  }, [homes, searchCity]);

  const filteredHostels = useMemo(() => {
    if (!searchCity) return hostels;
    return hostels.filter(h => h.city.toLowerCase().includes(searchCity.toLowerCase()));
  }, [hostels, searchCity]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifyStatus("loading");
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("ticket_code", verifyCode.toUpperCase())
      .single();

    if (error || !booking) {
      setVerifyStatus("error");
      setTimeout(() => setVerifyStatus("idle"), 3000);
      return;
    }

    if (booking.status === "completed") {
      alert("This ticket has already been used.");
      setVerifyStatus("idle");
      return;
    }

    await supabase.from("bookings").update({ status: "completed" }).eq("id", booking.id);
    setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: "completed" } : b));
    setVerifyStatus("success");
    setVerifyCode("");
    setTimeout(() => setVerifyStatus("idle"), 3000);
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 pt-16 flex flex-col gap-4">
        <div className="h-20 bg-gray-200 rounded-3xl animate-pulse" />
        <div className="h-10 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-40 bg-gray-200 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (!profile || profile.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-[11px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wider">Managed Agency Mode</p>
        </div>
        <Link 
          href="/admin/post"
          className="bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl active:scale-95 transition-transform shadow-sm"
        >
          + Upload
        </Link>
      </div>

      <div className="px-4 py-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100/80 p-1.5 rounded-2xl mb-6">
          <button 
            onClick={() => setTab("properties")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${tab === "properties" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:bg-gray-200/50"}`}
          >
            Properties
          </button>
          <button 
            onClick={() => setTab("viewings")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${tab === "viewings" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:bg-gray-200/50"}`}
          >
            Viewings
          </button>
          <button 
            onClick={() => setTab("leads")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${tab === "leads" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:bg-gray-200/50"}`}
          >
            Leads {leads.filter(l => l.status === "pending").length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                {leads.filter(l => l.status === "pending").length}
              </span>
            )}
          </button>
        </div>

        {tab === "viewings" && (
          <div className="space-y-6">
            {/* Verifier Toll */}
            <div className="bg-gray-900 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -top-8 text-8xl opacity-10">🎫</div>
              <h2 className="text-sm font-extrabold mb-1 relative z-10">Verify Viewing Ticket</h2>
              <p className="text-[10px] text-gray-400 font-semibold mb-4 relative z-10">Enter the customer's 6-character code upon arrival.</p>
              
              <form onSubmit={handleVerify} className="flex gap-2 relative z-10">
                <input
                  required
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value)}
                  placeholder="e.g. A8X9F2"
                  className="flex-1 bg-gray-800 text-white border border-gray-700 focus:border-emerald-500 outline-none rounded-xl px-4 font-mono uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-600 text-sm"
                />
                <button 
                  type="submit"
                  disabled={verifyStatus === "loading"}
                  className="bg-emerald-500 text-white font-bold px-5 py-3 rounded-xl active:scale-95 transition-transform"
                >
                  Verify
                </button>
              </form>
              
              {verifyStatus === "success" && (
                 <p className="text-xs font-bold text-emerald-400 mt-3 flex items-center gap-1">✅ Ticket Verified & Completed!</p>
              )}
              {verifyStatus === "error" && (
                 <p className="text-xs font-bold text-red-400 mt-3 flex items-center gap-1">❌ Invalid or unpaid ticket code.</p>
              )}
            </div>

            {/* List Upcoming Viewings */}
            <div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3 px-1">Upcoming Viewings</h3>
              <div className="space-y-3">
                {bookings.filter(b => b.status !== "completed").length === 0 ? (
                  <p className="text-sm text-gray-400 italic px-1">No upcoming scheduled viewings.</p>
                ) : (
                  bookings.filter(b => b.status !== "completed").map((booking) => (
                    <div key={booking.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{booking.seeker_name}</p>
                          <p className="text-xs text-gray-500">{booking.seeker_phone || booking.seeker_email}</p>
                        </div>
                        <div className="bg-gray-100 px-2 py-1 rounded font-mono text-[10px] font-bold text-gray-600 tracking-widest">
                          {booking.ticket_code}
                        </div>
                      </div>
                      <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/50 mt-2">
                        <p className="text-[11px] font-bold text-emerald-800 line-clamp-1">{booking.listing_title}</p>
                        <p className="text-[10px] font-semibold text-emerald-600/80 mt-0.5">
                          {booking.viewing_date ? new Date(booking.viewing_date).toLocaleDateString() : "Date TBD"} at {booking.viewing_time || "Time TBD"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "properties" && (
          <div className="space-y-4">
            <input 
              value={searchCity}
              onChange={e => setSearchCity(e.target.value)}
              placeholder="Filter by City or Location..."
              className="w-full bg-white border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none rounded-2xl px-4 py-3 text-sm font-semibold transition-all placeholder:text-gray-400 shadow-sm"
            />

            <div>
              <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                🏠 Managed Homes <span className="text-gray-400 font-medium">({filteredHomes.length})</span>
              </h3>
              <div className="space-y-2">
                {filteredHomes.map(home => (
                  <Link key={home.id} href={`/homes/${home.id}`} className="block bg-white border-l-4 border-emerald-500 p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-sm font-bold text-gray-900 truncate">{home.title}</p>
                    <p className="text-[10px] text-gray-500 font-semibold mt-0.5">{home.city} • {home.price_label}</p>
                  </Link>
                ))}
                {filteredHomes.length === 0 && <p className="text-xs text-gray-400 italic px-1">No homes match this location.</p>}
              </div>
            </div>

            <div className="pt-2">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                🏢 Managed Hostels <span className="text-gray-400 font-medium">({filteredHostels.length})</span>
              </h3>
              <div className="space-y-2">
                {filteredHostels.map(hostel => (
                  <Link key={hostel.id} href={`/hostels/${hostel.id}`} className="block bg-white border-l-4 border-blue-500 p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-sm font-bold text-gray-900 truncate">{hostel.name}</p>
                    <p className="text-[10px] text-gray-500 font-semibold mt-0.5">{hostel.city} • {hostel.available_rooms}/{hostel.total_rooms} rooms avail</p>
                  </Link>
                ))}
                {filteredHostels.length === 0 && <p className="text-xs text-gray-400 italic px-1">No hostels match this location.</p>}
              </div>
            </div>
          </div>
        )}

        {tab === "leads" && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest px-1">Property Submissions from Seekers</h3>
            {leads.length === 0 ? (
              <p className="text-sm text-gray-400 italic px-1">No property submissions yet.</p>
            ) : (
              <div className="space-y-3">
                {leads.map(lead => (
                  <div key={lead.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900">{lead.name}</p>
                        <a href={`tel:${lead.phone}`} className="text-xs text-emerald-600 font-semibold">
                          📞 {lead.phone}
                        </a>
                      </div>
                      <span className={`shrink-0 ml-3 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        lead.status === "approved"
                          ? "bg-emerald-50 text-emerald-700"
                          : lead.status === "rejected"
                          ? "bg-red-50 text-red-600"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {lead.status}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Location</p>
                      <p className="text-sm font-semibold text-gray-900">{lead.location}</p>
                      {lead.property_details && (
                        <>
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 mt-2">Details</p>
                          <p className="text-xs text-gray-700">{lead.property_details}</p>
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-[10px] text-gray-400">
                        {new Date(lead.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      {lead.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              await supabase.from("landlord_leads").update({ status: "approved" }).eq("id", lead.id);
                              setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: "approved" } : l));
                            }}
                            className="bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={async () => {
                              await supabase.from("landlord_leads").update({ status: "rejected" }).eq("id", lead.id);
                              setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: "rejected" } : l));
                            }}
                            className="bg-red-100 text-red-600 text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
