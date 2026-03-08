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

  const applyClass = accentColor === "blue"
    ? "text-blue-600 active:text-blue-700"
    : "text-emerald-600 active:text-emerald-700";

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
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 38 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <button
                onClick={onReset}
                className="text-sm text-gray-400 font-medium active:text-gray-600"
              >
                Reset all
              </button>
              <h2 className="text-base font-bold text-gray-900">Filters</h2>
              <button
                onClick={onClose}
                className={`text-sm font-semibold ${applyClass}`}
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
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">{title}</h3>
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
  const activeClass = accentColor === "blue"
    ? "bg-blue-600 text-white border-blue-600"
    : "bg-emerald-500 text-white border-emerald-500";

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
        active ? activeClass : "bg-white text-gray-600 border-gray-200 active:border-gray-400"
      }`}
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
  const dotColor = accentColor === "blue" ? "bg-blue-600" : "bg-emerald-500";

  return (
    <button
      onClick={onClick}
      className="relative w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center active:bg-gray-200 transition-colors"
      aria-label="Open filters"
    >
      <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="7" y1="12" x2="17" y2="12" />
        <line x1="10" y1="18" x2="14" y2="18" />
      </svg>
      {activeCount > 0 && (
        <span className={`absolute -top-1 -right-1 ${dotColor} text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center`}>
          {activeCount}
        </span>
      )}
    </button>
  );
}
