"use client";

import { useState, useEffect, useRef } from "react";
import { IconClose } from "@/components/ui/Icons";

const STORAGE_KEY = "staymate-recent-searches";
const MAX_RECENT = 8;

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

function saveRecent(term: string) {
  const list = getRecent().filter(s => s !== term);
  list.unshift(term);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

function clearRecent() {
  localStorage.removeItem(STORAGE_KEY);
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: (val: string) => void;
  placeholder?: string;
  suggestions?: string[];
}

export default function SearchAutocomplete({ value, onChange, onSubmit, placeholder = "Search...", suggestions = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setRecent(getRecent()); }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const trimmed = value.trim().toLowerCase();

  // Filter suggestions + recent by current input
  const matchedSuggestions = trimmed
    ? suggestions.filter(s => s.toLowerCase().includes(trimmed)).slice(0, 5)
    : [];
  const matchedRecent = trimmed
    ? recent.filter(s => s.toLowerCase().includes(trimmed))
    : recent;

  const hasItems = matchedSuggestions.length > 0 || matchedRecent.length > 0;

  function selectItem(term: string) {
    onChange(term);
    saveRecent(term);
    setRecent(getRecent());
    setOpen(false);
    onSubmit?.(term);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && value.trim()) {
      saveRecent(value.trim());
      setRecent(getRecent());
      setOpen(false);
      onSubmit?.(value.trim());
    }
  }

  function handleClearRecent() {
    clearRecent();
    setRecent([]);
  }

  function removeRecent(term: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = recent.filter(s => s !== term);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setRecent(updated);
  }

  return (
    <div ref={ref} className="relative flex-1">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--uber-muted)" }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /><circle cx="10" cy="10" r="7" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-black/20 transition-all"
        style={{ border: "0.5px solid var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-text)" }}
      />

      {open && hasItems && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden z-30 max-h-72 overflow-y-auto"
          style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}
        >
          {/* Recent searches */}
          {matchedRecent.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--uber-muted)" }}>Recent</span>
                {!trimmed && (
                  <button onClick={handleClearRecent} className="text-[10px] font-semibold" style={{ color: "var(--uber-green)" }}>
                    Clear all
                  </button>
                )}
              </div>
              {matchedRecent.map((term) => (
                <button
                  key={term}
                  onClick={() => selectItem(term)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors"
                  style={{ color: "var(--uber-text)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--uber-surface)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--uber-muted)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="flex-1 truncate">{term}</span>
                  <span
                    onClick={(e) => removeRecent(term, e)}
                    className="text-xs px-1 rounded"
                    style={{ color: "var(--uber-muted)" }}
                  >
                    <IconClose className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Autocomplete suggestions */}
          {matchedSuggestions.length > 0 && (
            <div>
              {matchedRecent.length > 0 && <div className="mx-3" style={{ borderTop: "0.5px solid var(--uber-border)" }} />}
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--uber-muted)" }}>Suggestions</span>
              </div>
              {matchedSuggestions.map((term) => (
                <button
                  key={term}
                  onClick={() => selectItem(term)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors"
                  style={{ color: "var(--uber-text)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--uber-surface)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--uber-muted)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /><circle cx="10" cy="10" r="7" />
                  </svg>
                  <span className="flex-1 truncate">{term}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
