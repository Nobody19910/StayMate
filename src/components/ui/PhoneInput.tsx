"use client";

import { useState, useRef, useEffect } from "react";
import { AFRICAN_COUNTRIES, DEFAULT_COUNTRY, formatLocal, toE164, type AfricanCountry } from "@/lib/african-countries";

interface PhoneInputProps {
  value: string; // E.164 value stored by parent (+233XXXXXXXXX)
  onChange: (e164: string, country: AfricanCountry) => void;
  required?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}

export default function PhoneInput({ value, onChange, required, placeholder, style, inputStyle }: PhoneInputProps) {
  // Detect country from current E.164 value
  function detectCountry(e164: string): AfricanCountry {
    if (!e164) return DEFAULT_COUNTRY;
    const match = AFRICAN_COUNTRIES
      .slice()
      .sort((a, b) => b.dialCode.length - a.dialCode.length)
      .find(c => e164.startsWith(c.dialCode));
    return match ?? DEFAULT_COUNTRY;
  }

  const [country, setCountry] = useState<AfricanCountry>(() => detectCountry(value));
  const [localInput, setLocalInput] = useState<string>(() => {
    if (!value) return "";
    const stripped = value.startsWith(country.dialCode)
      ? value.slice(country.dialCode.length)
      : value;
    return formatLocal(stripped);
  });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  function handleLocalChange(raw: string) {
    // Only allow digits and spaces
    const cleaned = raw.replace(/[^\d\s]/g, "");
    const digits = cleaned.replace(/\D/g, "");
    const formatted = formatLocal(digits);
    setLocalInput(formatted);
    const e164 = toE164(digits, country.dialCode);
    onChange(e164, country);
  }

  function selectCountry(c: AfricanCountry) {
    setCountry(c);
    setOpen(false);
    setSearch("");
    // Re-derive E.164 with new dial code
    const digits = localInput.replace(/\D/g, "");
    onChange(toE164(digits, c.dialCode), c);
  }

  const filtered = AFRICAN_COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dialCode.includes(search)
  );

  return (
    <div className="relative flex" style={{ gap: 0, ...style }} ref={dropdownRef}>
      {/* Country selector button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 shrink-0 rounded-l-xl px-3"
        style={{
          background: "var(--uber-surface2)",
          border: "0.5px solid var(--uber-border)",
          borderRight: "none",
          color: "var(--uber-text)",
          fontSize: 14,
          height: 48,
          minWidth: 80,
          cursor: "pointer",
          outline: "none",
        }}
      >
        <span style={{ fontSize: 20 }}>{country.flag}</span>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.3px" }}>{country.dialCode}</span>
        <svg width="10" height="7" viewBox="0 0 10 7" fill="none" style={{ opacity: 0.5, flexShrink: 0 }}>
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Local number input */}
      <input
        type="tel"
        inputMode="numeric"
        required={required}
        value={localInput}
        onChange={e => handleLocalChange(e.target.value)}
        placeholder={placeholder ?? `0XX XXX XXXX`}
        className="flex-1 rounded-r-xl px-4"
        style={{
          height: 48,
          background: "var(--uber-white)",
          border: "0.5px solid var(--uber-border)",
          borderLeft: "none",
          color: "var(--uber-text)",
          fontSize: 15,
          outline: "none",
          minWidth: 0,
          ...inputStyle,
        }}
      />

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 left-0 mt-1 w-72 rounded-xl overflow-hidden"
          style={{
            top: "100%",
            background: "var(--uber-white)",
            border: "0.5px solid var(--uber-border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
          }}
        >
          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search country or code…"
              className="w-full rounded-lg px-3 py-2"
              style={{
                background: "var(--uber-surface2)",
                border: "0.5px solid var(--uber-border)",
                color: "var(--uber-text)",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          {/* List */}
          <ul
            className="overflow-y-auto"
            style={{ maxHeight: 260 }}
          >
            {filtered.map(c => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => selectCountry(c)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
                  style={{
                    background: c.code === country.code ? "rgba(6,193,103,0.08)" : "transparent",
                    color: "var(--uber-text)",
                    fontSize: 14,
                    cursor: "pointer",
                    border: "none",
                    outline: "none",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{c.flag}</span>
                  <span className="flex-1 truncate" style={{ fontWeight: 500 }}>{c.name}</span>
                  <span style={{ color: "var(--uber-muted)", fontSize: 13, fontWeight: 600 }}>{c.dialCode}</span>
                  {c.code === country.code && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7l3.5 3.5L12 3" stroke="#06c167" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center" style={{ color: "var(--uber-muted)", fontSize: 13 }}>
                No countries found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
