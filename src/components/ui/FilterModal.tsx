"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PropertyType, PropertyCondition, FurnishingLevel } from "@/lib/types";
import type { TimePosted } from "@/lib/api";
import { REGION_NAMES, getDistrictsForRegion } from "@/lib/ghana-locations";

// ─── Expanded Amenity List ───────────────────────────────────────────────────

const FACILITY_LIST = [
  { value: "AC", label: "Air Con" },
  { value: "Generator", label: "Standby Generator" },
  { value: "Borehole", label: "Borehole" },
  { value: "Water Supply", label: "Water Supply" },
  { value: "Security", label: "24/7 Security" },
  { value: "Gated Estate", label: "Gated Estate" },
  { value: "Electric Fencing", label: "Electric Fencing" },
  { value: "Fitted Kitchen", label: "Fitted Kitchen" },
  { value: "Wardrobe", label: "Wardrobe" },
  { value: "POP Ceiling", label: "POP Ceiling" },
  { value: "Pool", label: "Swimming Pool" },
  { value: "Boys Quarters", label: "BQ" },
  { value: "WiFi", label: "Fiber Wi-Fi" },
  { value: "Parking", label: "Parking" },
  { value: "Furnished", label: "Furnished" },
  { value: "Garden", label: "Garden" },
  { value: "Smart Home", label: "Smart Home" },
  { value: "Cleaning Service", label: "Cleaning Service" },
];

const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "studio", label: "Studio" },
  { value: "duplex", label: "Duplex" },
  { value: "townhouse", label: "Townhouse" },
];

const CONDITION_OPTIONS: { value: PropertyCondition; label: string }[] = [
  { value: "new", label: "New Build" },
  { value: "renovated", label: "Renovated" },
  { value: "used", label: "Used" },
];

const FURNISHING_OPTIONS: { value: FurnishingLevel; label: string }[] = [
  { value: "furnished", label: "Furnished" },
  { value: "semi-furnished", label: "Semi" },
  { value: "unfurnished", label: "Unfurnished" },
];

const TIME_OPTIONS: { value: TimePosted; label: string }[] = [
  { value: "1h", label: "Last Hour" },
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "any", label: "Any Time" },
];

// ─── Filter State Interface ──────────────────────────────────────────────────

export interface FilterState {
  amenities: string[];
  propertyTypes: PropertyType[];
  condition: PropertyCondition | null;
  furnishing: FurnishingLevel | null;
  timePosted: TimePosted;
  priceMin: number;
  priceMax: number;
  region: string;
  district: string;
  /** Multi-select locations — array of "Region > District" or just "Region" */
  regions: string[];
  districts: string[];
}

export const DEFAULT_FILTERS: FilterState = {
  amenities: [],
  propertyTypes: [],
  condition: null,
  furnishing: null,
  timePosted: "any",
  priceMin: 0,
  priceMax: 50000,
  region: "",
  district: "",
  regions: [],
  districts: [],
};

interface FilterModalProps {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  // Legacy compat — ignored if filters prop is provided
  allAmenities?: string[];
  selected?: string[];
  accentColor?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FilterModal({
  open,
  onClose,
  filters,
  onChange,
}: FilterModalProps) {
  const [local, setLocal] = useState<FilterState>(filters);

  // Sync when parent filters change
  useEffect(() => {
    setLocal(filters);
  }, [filters]);

  function apply() {
    onChange(local);
    onClose();
  }

  function clearAll() {
    setLocal(DEFAULT_FILTERS);
  }

  function toggleAmenity(val: string) {
    setLocal(prev => ({
      ...prev,
      amenities: prev.amenities.includes(val)
        ? prev.amenities.filter(a => a !== val)
        : [...prev.amenities, val],
    }));
  }

  function togglePropertyType(val: PropertyType) {
    setLocal(prev => ({
      ...prev,
      propertyTypes: prev.propertyTypes.includes(val)
        ? prev.propertyTypes.filter(t => t !== val)
        : [...prev.propertyTypes, val],
    }));
  }

  const activeCount =
    local.amenities.length +
    local.propertyTypes.length +
    (local.condition ? 1 : 0) +
    (local.furnishing ? 1 : 0) +
    (local.timePosted !== "any" ? 1 : 0) +
    (local.priceMin > 0 ? 1 : 0) +
    (local.priceMax < 50000 ? 1 : 0) +
    local.regions.length +
    local.districts.length;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl shadow-2xl flex flex-col"
            style={{ background: "var(--uber-white)", maxHeight: "85vh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--uber-surface2)" }} />
            </div>

            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3 shrink-0"
              style={{ borderBottom: "0.5px solid var(--uber-border)" }}
            >
              <h2 className="text-base font-bold" style={{ color: "var(--uber-text)" }}>Filters</h2>
              {activeCount > 0 && (
                <button onClick={clearAll} className="text-xs font-medium" style={{ color: "var(--uber-muted)" }}>
                  Clear all
                </button>
              )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

              {/* ── Price Range ──────────────────────────────────────── */}
              <Section title="Price Range">
                <div className="flex items-center gap-3">
                  <PriceInput
                    label="Min"
                    value={local.priceMin}
                    onChange={v => setLocal(p => ({ ...p, priceMin: v }))}
                  />
                  <span className="text-xs font-medium mt-5" style={{ color: "var(--uber-muted)" }}>—</span>
                  <PriceInput
                    label="Max"
                    value={local.priceMax}
                    onChange={v => setLocal(p => ({ ...p, priceMax: v }))}
                  />
                </div>
              </Section>

              {/* ── Location (multi-select) ─────────────────────────── */}
              <Section title="Location">
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--uber-muted)" }}>Region</label>
                    <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                      {REGION_NAMES.map(r => (
                        <ChipButton
                          key={r}
                          label={r}
                          active={local.regions.includes(r)}
                          onToggle={() => setLocal(p => ({
                            ...p,
                            regions: p.regions.includes(r)
                              ? p.regions.filter(x => x !== r)
                              : [...p.regions, r],
                            // Remove districts that belong to deselected region
                            districts: p.regions.includes(r)
                              ? p.districts.filter(d => !getDistrictsForRegion(r).includes(d))
                              : p.districts,
                          }))}
                        />
                      ))}
                    </div>
                  </div>
                  {local.regions.length > 0 && (
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--uber-muted)" }}>District / Town</label>
                      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                        {local.regions.flatMap(r => getDistrictsForRegion(r)).map(d => (
                          <ChipButton
                            key={d}
                            label={d}
                            active={local.districts.includes(d)}
                            onToggle={() => setLocal(p => ({
                              ...p,
                              districts: p.districts.includes(d)
                                ? p.districts.filter(x => x !== d)
                                : [...p.districts, d],
                            }))}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              {/* ── Property Type ────────────────────────────────────── */}
              <Section title="Property Type">
                <div className="grid grid-cols-3 gap-2">
                  {PROPERTY_TYPE_OPTIONS.map(opt => (
                    <ChipButton
                      key={opt.value}
                      label={opt.label}
                      active={local.propertyTypes.includes(opt.value)}
                      onToggle={() => togglePropertyType(opt.value)}
                    />
                  ))}
                </div>
              </Section>

              {/* ── Condition ────────────────────────────────────────── */}
              <Section title="Condition">
                <div className="flex gap-2">
                  {CONDITION_OPTIONS.map(opt => (
                    <ChipButton
                      key={opt.value}
                      label={opt.label}
                      active={local.condition === opt.value}
                      onToggle={() => setLocal(p => ({ ...p, condition: p.condition === opt.value ? null : opt.value }))}
                    />
                  ))}
                </div>
              </Section>

              {/* ── Furnishing ───────────────────────────────────────── */}
              <Section title="Furnishing">
                <div className="flex gap-2">
                  {FURNISHING_OPTIONS.map(opt => (
                    <ChipButton
                      key={opt.value}
                      label={opt.label}
                      active={local.furnishing === opt.value}
                      onToggle={() => setLocal(p => ({ ...p, furnishing: p.furnishing === opt.value ? null : opt.value }))}
                    />
                  ))}
                </div>
              </Section>

              {/* ── Time Posted ──────────────────────────────────────── */}
              <Section title="Time Posted">
                <div className="flex gap-2 flex-wrap">
                  {TIME_OPTIONS.map(opt => (
                    <ChipButton
                      key={opt.value}
                      label={opt.label}
                      active={local.timePosted === opt.value}
                      onToggle={() => setLocal(p => ({ ...p, timePosted: opt.value }))}
                    />
                  ))}
                </div>
              </Section>

              {/* ── Facilities ───────────────────────────────────────── */}
              <Section title="Facilities">
                <div className="grid grid-cols-2 gap-2">
                  {FACILITY_LIST.map(fac => (
                    <ChipButton
                      key={fac.value}
                      label={fac.label}
                      active={local.amenities.includes(fac.value)}
                      onToggle={() => toggleAmenity(fac.value)}
                    />
                  ))}
                </div>
              </Section>

            </div>

            {/* Apply button */}
            <div className="px-5 pt-4 shrink-0" style={{ borderTop: "0.5px solid var(--uber-border)", paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 80px)" }}>
              <button
                onClick={apply}
                className="w-full font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-base"
                style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
              >
                {activeCount > 0
                  ? `Show results \u00b7 ${activeCount} filter${activeCount > 1 ? "s" : ""}`
                  : "Apply"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: "var(--uber-muted)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function ChipButton({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="px-3 py-2 rounded-xl text-sm font-medium transition-all text-center"
      style={active
        ? { background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }
        : { background: "var(--uber-surface)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" }
      }
    >
      {label}
    </button>
  );
}

function PriceInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex-1">
      <label className="text-[10px] font-semibold uppercase tracking-wide mb-1 block" style={{ color: "var(--uber-muted)" }}>
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium" style={{ color: "var(--uber-muted)" }}>
          GH₵
        </span>
        <input
          type="number"
          inputMode="numeric"
          value={value || ""}
          onChange={e => onChange(parseInt(e.target.value) || 0)}
          placeholder="0"
          className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 transition-all"
          style={{
            border: "0.5px solid var(--uber-border)",
            background: "var(--uber-white)",
            color: "var(--uber-text)",
          }}
        />
      </div>
    </div>
  );
}
