"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

interface SavedSearch {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  property_type: string;
  notify: boolean;
  created_at: string;
}

interface Props {
  /** Current active filters on the browse page */
  currentFilters: Record<string, unknown>;
  propertyType: "home" | "hostel";
  /** Called when user clicks a saved search — parent applies the filters */
  onApply: (filters: Record<string, unknown>) => void;
}

export default function SavedSearches({ currentFilters, propertyType, onApply }: Props) {
  const { user } = useAuth();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [notify, setNotify] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.id)
      .eq("property_type", propertyType)
      .order("created_at", { ascending: false })
      .then(({ data }) => setSearches((data ?? []) as SavedSearch[]));
  }, [user, propertyType, showPanel]);

  async function saveSearch() {
    if (!user || !newName.trim()) return;
    setSaving(true);
    await supabase.from("saved_searches").insert({
      user_id: user.id,
      name: newName.trim(),
      filters: currentFilters,
      property_type: propertyType,
      notify,
    });
    setNewName("");
    setSaving(false);
    // refresh
    const { data } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.id)
      .eq("property_type", propertyType)
      .order("created_at", { ascending: false });
    setSearches((data ?? []) as SavedSearch[]);
  }

  async function deleteSearch(id: string) {
    await supabase.from("saved_searches").delete().eq("id", id);
    setSearches(prev => prev.filter(s => s.id !== id));
  }

  if (!user) return null;

  const hasFilters = Object.values(currentFilters).some(v =>
    v !== null && v !== undefined && v !== "" && v !== false && !(Array.isArray(v) && v.length === 0)
  );

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(v => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
        style={{
          background: showPanel ? "rgba(6,193,103,0.12)" : "var(--uber-surface2)",
          color: showPanel ? "var(--uber-green)" : "var(--uber-text)",
          border: showPanel ? "0.5px solid rgba(6,193,103,0.3)" : "0.5px solid var(--uber-border)",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v3a2 2 0 01-.586 1.414l-4.828 4.828A2 2 0 0013 15.586V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-5.414a2 2 0 00-.586-1.414L1.586 9.414A2 2 0 011 8V5z" />
        </svg>
        Saved searches {searches.length > 0 && <span className="rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "var(--uber-green)" }}>{searches.length}</span>}
      </button>

      {showPanel && (
        <div
          className="absolute right-0 top-full mt-2 z-40 w-72 rounded-2xl overflow-hidden"
          style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
        >
          <div className="px-4 pt-4 pb-3" style={{ borderBottom: "0.5px solid var(--uber-border)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--uber-muted)" }}>Save current search</p>
            {hasFilters ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Name this search…"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveSearch()}
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)", color: "var(--uber-text)" }}
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setNotify(v => !v)}
                    className="w-8 h-4 rounded-full transition-colors relative"
                    style={{ background: notify ? "var(--uber-green)" : "var(--uber-surface2)" }}
                  >
                    <div className="w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: notify ? "calc(100% - 14px)" : "2px" }} />
                  </div>
                  <span className="text-xs" style={{ color: "var(--uber-muted)" }}>Notify me of new matches</span>
                </label>
                <button
                  onClick={saveSearch}
                  disabled={!newName.trim() || saving}
                  className="w-full py-2 rounded-xl text-sm font-bold"
                  style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)", opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? "Saving…" : "Save search"}
                </button>
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--uber-muted)" }}>Apply some filters first, then save this search.</p>
            )}
          </div>

          {searches.length > 0 && (
            <div className="py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest px-4 mb-2" style={{ color: "var(--uber-muted)" }}>Your saved searches</p>
              <ul>
                {searches.map(s => (
                  <li key={s.id} className="flex items-center gap-2 px-3 py-2 hover:bg-opacity-50 group transition-colors"
                    style={{ borderBottom: "0.5px solid var(--uber-border)" }}>
                    <button
                      className="flex-1 text-left"
                      onClick={() => { onApply(s.filters); setShowPanel(false); }}
                    >
                      <p className="text-sm font-semibold" style={{ color: "var(--uber-text)" }}>{s.name}</p>
                      <p className="text-[10px]" style={{ color: "var(--uber-muted)" }}>
                        {s.notify ? "🔔 Notifications on" : "🔕 Silent"}
                        {" · "}
                        {new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </button>
                    <button
                      onClick={() => deleteSearch(s.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg"
                      style={{ color: "#ef4444" }}
                      title="Delete"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {searches.length === 0 && !hasFilters && (
            <div className="px-4 py-4 text-center">
              <p className="text-xs" style={{ color: "var(--uber-muted)" }}>No saved searches yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
