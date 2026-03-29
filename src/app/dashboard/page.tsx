"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { IconBuilding, IconChart, IconCheck, IconClose, IconTrash, IconPin } from "@/components/ui/Icons";

type DashTab = "pipeline" | "properties" | "queue";

const KANBAN_COLS = [
  { key: "pending",           label: "New",       color: "#d97706", bgLight: "rgba(217,119,6,0.06)"   },
  { key: "accepted",          label: "Accepted",  color: "#2563eb", bgLight: "rgba(37,99,235,0.06)"  },
  { key: "fee_paid",          label: "Fee Paid",  color: "#7c3aed", bgLight: "rgba(124,58,237,0.06)" },
  { key: "viewing_scheduled", label: "Viewing",   color: "#0891b2", bgLight: "rgba(8,145,178,0.06)"  },
  { key: "completed",         label: "Completed", color: "#059669", bgLight: "rgba(5,150,105,0.06)"  },
];

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [tab, setTab] = useState<DashTab>("pipeline");
  const [properties, setProperties] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && profile) {
      const allowed = ["owner", "manager", "agent", "admin"].includes(profile.role);
      if (!allowed) router.push("/profile");
    }
  }, [authLoading, profile, router]);

  const fetchAll = useCallback(async () => {
    if (!user || !profile) return;
    setLoading(true);
    try {
      const isAdmin = profile.role === "admin";
      const homesQ = supabase.from("homes").select("*").order("created_at", { ascending: false });
      const hostelsQ = supabase.from("hostels").select("*").order("created_at", { ascending: false });
      const bookingsQ = supabase.from("bookings").select("*").order("created_at", { ascending: false });

      if (!isAdmin) {
        homesQ.eq("owner_id", user.id);
        hostelsQ.eq("manager_id", user.id);
        bookingsQ.eq("owner_id", user.id);
      }

      const [{ data: homes }, { data: hostels }, { data: bkgs }] = await Promise.all([homesQ, hostelsQ, bookingsQ]);

      const combined = [
        ...(homes || []).map((h: any) => ({ ...h, _type: "home" })),
        ...(hostels || []).map((h: any) => ({ ...h, _type: "hostel" })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const titleFromMsg = (msg: string) => {
        const m = msg?.match(/\[Inquiry for:\s*([^\]]+)\]/);
        return m ? m[1].trim() : null;
      };
      const enriched = (bkgs || []).map((b: any) => {
        let property = null;
        if (b.property_ref) {
          property = combined.find((p) =>
            p.id === b.property_ref && p._type === (b.property_type === "home" ? "home" : "hostel")
          );
        }
        if (!property) {
          const title = titleFromMsg(b.message || "");
          if (title) {
            property = combined.find((p) =>
              p._type === (b.property_type === "home" ? "home" : "hostel") &&
              (p.title || p.name) && title.includes(p.title || p.name)
            );
          }
        }
        return { ...b, property };
      });

      setProperties(combined);
      setBookings(enriched);
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const pending = useMemo(() => properties.filter((p) => p.status === "pending_admin"), [properties]);
  const live    = useMemo(() => properties.filter((p) => p.status === "approved"), [properties]);

  async function updateBookingStatus(id: string, status: string) {
    await supabase.from("bookings").update({ status }).eq("id", id);
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
  }
  async function deleteBooking(id: string) {
    await supabase.from("bookings").delete().eq("id", id);
    setBookings((prev) => prev.filter((b) => b.id !== id));
  }

  const isAllowed = profile && ["owner", "manager", "agent", "admin"].includes(profile.role);
  if (authLoading || !isAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f7f8fa" }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "#e9edf2", borderTopColor: "#06c167" }} />
      </div>
    );
  }

  const NAV_ITEMS: { id: DashTab; label: string; icon: React.ReactNode; count?: number; alert?: boolean }[] = [
    { id: "pipeline",   label: "Pipeline",   icon: <IconChart /> },
    { id: "properties", label: "Properties", icon: <IconBuilding />, count: properties.length },
    { id: "queue",      label: "Pending",    icon: <IconPin />,      count: pending.length, alert: pending.length > 0 },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#f7f8fa", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e9edf2", position: "sticky", top: 0, zIndex: 40 }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/homes" className="text-lg font-extrabold" style={{ color: "#0f172a" }}>StayMate</Link>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(6,193,103,0.1)", color: "#06c167" }}>My Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/post" className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#06c167", color: "#fff" }}>+ New Listing</Link>
            <Link href="/profile" className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "#0f172a", color: "#fff" }}>
              {(profile as any)?.fullName?.[0] ?? "U"}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col gap-1 w-48 shrink-0 pt-1">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-3" style={{ color: "#94a3b8" }}>Overview</p>
          {NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-colors"
              style={{
                background: tab === item.id ? "rgba(6,193,103,0.08)" : "transparent",
                color: tab === item.id ? "#06c167" : "#64748b",
                borderLeft: tab === item.id ? "3px solid #06c167" : "3px solid transparent",
              }}
            >
              <span className="opacity-70">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                  style={{ background: item.alert ? "#ef4444" : "#e9edf2", color: item.alert ? "#fff" : "#64748b" }}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Mobile tab bar */}
          <div className="md:hidden flex gap-1 mb-4 p-1 rounded-xl" style={{ background: "#fff", border: "1px solid #e9edf2" }}>
            {NAV_ITEMS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-colors"
                style={{ background: tab === t.id ? "#06c167" : "transparent", color: tab === t.id ? "#fff" : "#64748b" }}>
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: "#e9edf2", borderTopColor: "#06c167" }} />
            </div>
          ) : (
            <>
              {/* Pipeline */}
              {tab === "pipeline" && (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {[
                      { label: "Live",      value: live.length,                                           color: "#06c167" },
                      { label: "Bookings",  value: bookings.length,                                       color: "#2563eb" },
                      { label: "Pending",   value: pending.length,                                        color: "#d97706" },
                      { label: "Completed", value: bookings.filter((b) => b.status === "completed").length, color: "#059669" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl p-4" style={{ background: "#fff", border: "1px solid #e9edf2", borderLeft: `3px solid ${s.color}` }}>
                        <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-xs font-medium mt-0.5" style={{ color: "#64748b" }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl" style={{ background: "#fff", border: "1px solid #e9edf2" }}>
                    <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid #e9edf2" }}>
                      <span className="text-sm font-bold" style={{ color: "#0f172a" }}>Booking Pipeline</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f1f5f9", color: "#64748b" }}>{bookings.length} total</span>
                    </div>
                    <div className="overflow-x-auto p-3">
                      <div className="flex gap-3" style={{ minWidth: 620 }}>
                        {KANBAN_COLS.map((col) => {
                          const cols = bookings.filter((b) => b.status === col.key);
                          return (
                            <div key={col.key} className="flex flex-col rounded-xl flex-1 min-w-[150px]" style={{ background: col.bgLight, minHeight: 120 }}>
                              <div className="flex items-center gap-2 px-3 py-2.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                                <span className="text-xs font-bold flex-1" style={{ color: col.color }}>{col.label}</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.06)", color: col.color }}>{cols.length}</span>
                              </div>
                              <div className="px-2 pb-2 flex flex-col gap-2">
                                {cols.map((b) => (
                                  <OwnerKanbanCard key={b.id} booking={b} accentColor={col.color}
                                    onAccept={() => updateBookingStatus(b.id, "accepted")}
                                    onReject={() => updateBookingStatus(b.id, "rejected")}
                                    onDelete={() => deleteBooking(b.id)}
                                  />
                                ))}
                                {cols.length === 0 && <p className="text-[11px] text-center py-4" style={{ color: "#94a3b8" }}>Empty</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Properties */}
              {tab === "properties" && (
                <div className="rounded-xl" style={{ background: "#fff", border: "1px solid #e9edf2" }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #e9edf2" }}>
                    <span className="text-sm font-bold" style={{ color: "#0f172a" }}>Your Properties</span>
                    <Link href="/post" className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#06c167", color: "#fff" }}>+ Add</Link>
                  </div>
                  {properties.length === 0 ? (
                    <div className="py-16 text-center">
                      <p className="text-sm font-semibold" style={{ color: "#64748b" }}>No properties yet</p>
                      <Link href="/post" className="text-xs font-bold mt-2 inline-block" style={{ color: "#06c167" }}>Post your first listing →</Link>
                    </div>
                  ) : properties.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors" style={{ borderBottom: "1px solid #e9edf2" }}>
                      <div className="relative w-14 h-10 rounded-lg overflow-hidden shrink-0" style={{ background: "#e9edf2" }}>
                        {p.images?.[0] && <OptimizedImage src={p.images[0]} alt="" width={80} className="w-full h-full" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: "#0f172a" }}>{p.title || p.name}</p>
                        <p className="text-xs" style={{ color: "#64748b" }}>{p.city} · {p._type === "home" ? "Home" : "Hostel"}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={p.status === "approved"
                          ? { background: "rgba(6,193,103,0.1)", color: "#06c167" }
                          : { background: "rgba(217,119,6,0.1)", color: "#d97706" }}>
                        {p.status === "approved" ? "Live" : "Pending"}
                      </span>
                      <Link href={`/edit/${p.id}?type=${p._type}`} className="text-xs font-bold px-2.5 py-1.5 rounded-lg shrink-0 ml-1" style={{ background: "#f1f5f9", color: "#0f172a" }}>Edit</Link>
                      <Link href={p._type === "home" ? `/homes/${p.id}` : `/hostels/${p.id}`} className="text-xs font-bold px-2.5 py-1.5 rounded-lg shrink-0" style={{ background: "rgba(6,193,103,0.1)", color: "#06c167" }}>View</Link>
                    </div>
                  ))}
                </div>
              )}

              {/* Queue */}
              {tab === "queue" && (
                <div className="rounded-xl" style={{ background: "#fff", border: "1px solid #e9edf2" }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid #e9edf2" }}>
                    <span className="text-sm font-bold" style={{ color: "#0f172a" }}>Pending Admin Review</span>
                    {pending.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#fef3c7", color: "#d97706" }}>{pending.length} waiting</span>
                    )}
                  </div>
                  {pending.length === 0 ? (
                    <div className="py-16 text-center">
                      <p className="text-sm font-semibold" style={{ color: "#06c167" }}>All listings approved ✓</p>
                    </div>
                  ) : pending.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid #e9edf2" }}>
                      <div className="relative w-14 h-10 rounded-lg overflow-hidden shrink-0" style={{ background: "#e9edf2" }}>
                        {p.images?.[0] && <OptimizedImage src={p.images[0]} alt="" width={80} className="w-full h-full" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: "#0f172a" }}>{p.title || p.name}</p>
                        <p className="text-xs" style={{ color: "#64748b" }}>{p.city} · Submitted {new Date(p.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(217,119,6,0.1)", color: "#d97706" }}>Under Review</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Owner Kanban Card — property info only, no booker details ────────────────
function OwnerKanbanCard({ booking: b, accentColor, onAccept, onReject, onDelete }: {
  booking: any; accentColor: string; onAccept: () => void; onReject: () => void; onDelete: () => void;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e9edf2", borderLeft: `3px solid ${accentColor}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <Link href={b.property_type === "home" ? `/homes/${b.property_ref || b.property?.id}` : `/hostels/${b.property_ref || b.property?.id}`} target="_blank"
        className="flex items-start gap-2 p-3 pb-2 hover:bg-slate-50 transition-colors" style={{ display: "flex" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="relative w-12 h-9 rounded-lg overflow-hidden shrink-0" style={{ background: "#e9edf2" }}>
          {b.property?.images?.[0] && <OptimizedImage src={b.property.images[0]} alt="" width={80} className="w-full h-full" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold line-clamp-1 leading-tight" style={{ color: "#0f172a" }}>{b.property?.title || b.property?.name || "—"}</p>
          <p className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>{b.property?.city || "—"} · {b.property_type === "home" ? "Home" : "Hostel"}</p>
          <p className="text-[10px]" style={{ color: "#94a3b8" }}>{b.viewing_date ? new Date(b.viewing_date).toLocaleDateString() : "No date set"}</p>
        </div>
      </Link>
      <div className="flex items-center gap-1 px-3 pb-2.5">
        {b.status === "pending" && (
          <>
            <button onClick={onAccept} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#06c167", color: "#fff" }}><IconCheck /></button>
            <button onClick={onReject} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#f1f5f9", color: "#64748b" }}><IconClose /></button>
          </>
        )}
        <button onClick={onDelete} className="w-6 h-6 rounded-md flex items-center justify-center ml-auto" style={{ background: "rgba(239,68,68,0.06)", color: "#ef4444" }}><IconTrash /></button>
      </div>
    </div>
  );
}
