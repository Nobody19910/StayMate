"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Sheet wrapper ─────────────────────────────────────────────────────────────

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  onReset: () => void;
  children: React.ReactNode;
  accentColor?: "emerald" | "blue";
}

export function FilterSheet({ open, onClose, onReset, children, accentColor = "emerald" }: FilterSheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const applyClass = "font-bold active:opacity-70";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl shadow-2xl"
            style={{ background: "var(--uber-white)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 38 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--uber-border)" }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "0.5px solid var(--uber-border)" }}>
              <button
                onClick={onReset}
                className="text-sm font-medium active:opacity-60"
                style={{ color: "var(--uber-muted)" }}
              >
                Reset all
              </button>
              <h2 className="text-base font-bold" style={{ color: "var(--uber-text)" }}>Filters</h2>
              <button
                onClick={onClose}
                className={`text-sm font-semibold ${applyClass}`}
                style={{ color: "var(--uber-text)" }}
              >
                Done
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-5 overflow-y-auto" style={{ maxHeight: "62vh" }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────

export function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-2">
      <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--uber-muted)" }}>{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// ─── Pill button ───────────────────────────────────────────────────────────────

export function FilterPill({
  label,
  active,
  onClick,
  accentColor = "emerald",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  accentColor?: "emerald" | "blue";
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-sm font-medium border transition-colors"
      style={active
        ? { background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)", borderColor: "var(--uber-btn-bg)" }
        : { background: "var(--uber-white)", color: "var(--uber-muted)", borderColor: "var(--uber-border)" }
      }
    >
      {label}
    </button>
  );
}

// ─── Filter icon button (for page headers) ─────────────────────────────────────

export function FilterButton({
  onClick,
  activeCount,
  accentColor = "emerald",
}: {
  onClick: () => void;
  activeCount: number;
  accentColor?: "emerald" | "blue";
}) {
  return (
    <button
      onClick={onClick}
      className="relative w-9 h-9 rounded-xl flex items-center justify-center active:opacity-70 transition-colors"
      style={{ background: "var(--uber-surface2)" }}
      aria-label="Open filters"
    >
      <svg className="w-4 h-4" style={{ color: "var(--uber-muted)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="7" y1="12" x2="17" y2="12" />
        <line x1="10" y1="18" x2="14" y2="18" />
      </svg>
      {activeCount > 0 && (
        <span className="absolute -top-1 -right-1 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>
          {activeCount}
        </span>
      )}
    </button>
  );
}
