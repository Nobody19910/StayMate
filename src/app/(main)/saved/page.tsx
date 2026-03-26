"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getSavedByType, removeSaved } from "@/lib/saved-store";
import { getHomes, getHostels } from "@/lib/api";
import type { Property, Hostel } from "@/lib/types";
import { IconHome, IconSchool, IconCheck } from "@/components/ui/Icons";

type Tab = "homes" | "hostels";

export default function SavedPage() {
  const [activeTab, setActiveTab] = useState<Tab>("homes");
  const [savedHomes, setSavedHomes] = useState<Property[]>([]);
  const [savedHostels, setSavedHostels] = useState<Hostel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [selectedHomeIds, setSelectedHomeIds] = useState<Set<string>>(new Set());
  const [selectedHostelIds, setSelectedHostelIds] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    const homeIds = new Set(getSavedByType("home").map((e) => e.id));
    const hostelIds = new Set(getSavedByType("hostel").map((e) => e.id));
    Promise.all([getHomes(), getHostels({ from: 0, to: 999 })]).then(([homes, hostelsResult]) => {
      setSavedHomes(homes.filter((h) => homeIds.has(h.id)));
      setSavedHostels(hostelsResult.data.filter((h) => hostelIds.has(h.id)));
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  function handleRemove(id: string, type: "home" | "hostel") {
    removeSaved(id);
    if (type === "home") {
      setSavedHomes((prev) => prev.filter((h) => h.id !== id));
      setSelectedHomeIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } else {
      setSavedHostels((prev) => prev.filter((h) => h.id !== id));
      setSelectedHostelIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  function toggleSelect(id: string) {
    if (activeTab === "homes") {
      setSelectedHomeIds((prev) => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id);
        else if (n.size < 3) n.add(id);
        return n;
      });
    } else {
      setSelectedHostelIds((prev) => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id);
        else if (n.size < 3) n.add(id);
        return n;
      });
    }
  }

  function exitCompareMode() {
    setCompareMode(false);
    setSelectedHomeIds(new Set());
    setSelectedHostelIds(new Set());
  }

  const selectedCount = activeTab === "homes" ? selectedHomeIds.size : selectedHostelIds.size;
  const currentItems = activeTab === "homes" ? savedHomes : savedHostels;
  const canCompare = activeTab === "homes" ? savedHomes.length >= 2 : savedHostels.length >= 2;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="px-4 pb-0" style={{ paddingTop: "calc(env(safe-area-inset-top, 20px) + 12px)", background: "var(--uber-white)", borderBottom: "0.5px solid var(--uber-border)" }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-extrabold" style={{ color: "var(--uber-text)" }}>Saved</h1>
          {!isLoading && canCompare && (
            compareMode ? (
              <button onClick={exitCompareMode} className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ color: "var(--uber-muted)", background: "var(--uber-surface)" }}>
                Cancel
              </button>
            ) : (
              <button onClick={() => setCompareMode(true)} className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ color: "var(--uber-btn-text)", background: "var(--uber-btn-bg)" }}>
                Compare
              </button>
            )
          )}
        </div>
        {/* Tabs */}
        <div className="flex" style={{ borderBottom: "0.5px solid var(--uber-border)" }}>
          {(["homes", "hostels"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); if (compareMode) { setSelectedHomeIds(new Set()); setSelectedHostelIds(new Set()); } }}
              className={`flex-1 pb-3 text-sm font-semibold capitalize transition-colors ${
                activeTab === tab ? "border-b-2" : ""
              }`}
              style={
                activeTab === tab
                  ? { color: "var(--uber-text)", borderColor: "var(--uber-text)" }
                  : { color: "var(--uber-muted)" }
              }
            >
              {tab} ({tab === "homes" ? savedHomes.length : savedHostels.length})
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden flex animate-pulse" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <div className="w-28 h-24 shrink-0" style={{ background: "var(--uber-surface2)" }} />
                <div className="flex-1 px-3 py-2.5 space-y-2">
                  <div className="h-3 rounded w-3/4" style={{ background: "var(--uber-surface2)" }} />
                  <div className="h-2.5 rounded w-1/2" style={{ background: "var(--uber-surface2)" }} />
                  <div className="h-3 rounded w-1/3" style={{ background: "var(--uber-surface2)" }} />
                  <div className="h-2.5 rounded w-2/3" style={{ background: "var(--uber-surface2)" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && activeTab === "homes" && (
          <>
            {savedHomes.length === 0
              ? <EmptyState type="homes" />
              : (
                <div className="space-y-3">
                  {savedHomes.map((property) => {
                    const isSelected = selectedHomeIds.has(property.id);
                    return (
                      <div key={property.id} className="relative">
                        <div
                          onClick={() => compareMode ? toggleSelect(property.id) : undefined}
                          className={compareMode ? "cursor-pointer" : ""}
                        >
                          {compareMode ? (
                            <div className="rounded-xl overflow-hidden flex" style={{
                              background: "var(--uber-white)",
                              border: isSelected ? "2px solid #06C167" : "0.5px solid var(--uber-border)",
                            }}>
                              <div className="relative w-28 h-24 shrink-0">
                                <Image src={property.images[0]} alt={property.title} fill className="object-cover" unoptimized />
                                {isSelected && (
                                  <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-[#06C167] flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 px-3 py-2.5 pr-10">
                                <p className="text-sm font-bold truncate" style={{ color: "var(--uber-text)" }}>{property.title}</p>
                                <p className="text-xs truncate mt-0.5" style={{ color: "var(--uber-muted)" }}>{property.city}, {property.state}</p>
                                <p className="text-sm font-extrabold mt-1" style={{ color: "var(--uber-text)" }}>{property.priceLabel}</p>
                                <p className="text-xs" style={{ color: "var(--uber-muted)" }}>{property.beds}bd · {property.baths}ba · {property.sqft.toLocaleString()} sqft</p>
                              </div>
                            </div>
                          ) : (
                            <Link href={`/homes/${property.id}`}>
                              <div className="rounded-xl overflow-hidden flex" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                                <div className="relative w-28 h-24 shrink-0">
                                  <Image src={property.images[0]} alt={property.title} fill className="object-cover" unoptimized />
                                </div>
                                <div className="flex-1 px-3 py-2.5 pr-10">
                                  <p className="text-sm font-bold truncate" style={{ color: "var(--uber-text)" }}>{property.title}</p>
                                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--uber-muted)" }}>{property.city}, {property.state}</p>
                                  <p className="text-sm font-extrabold mt-1" style={{ color: "var(--uber-text)" }}>{property.priceLabel}</p>
                                  <p className="text-xs" style={{ color: "var(--uber-muted)" }}>{property.beds}bd · {property.baths}ba · {property.sqft.toLocaleString()} sqft</p>
                                </div>
                              </div>
                            </Link>
                          )}
                        </div>
                        {!compareMode && (
                          <button
                            onClick={() => handleRemove(property.id, "home")}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center hover:text-red-500 shadow-sm transition-colors"
                            style={{ background: "var(--uber-white)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" }}
                            aria-label="Remove"
                          >×</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            }
          </>
        )}

        {!isLoading && activeTab === "hostels" && (
          <>
            {savedHostels.length === 0
              ? <EmptyState type="hostels" />
              : (
                <div className="space-y-3">
                  {savedHostels.map((hostel) => {
                    const isSelected = selectedHostelIds.has(hostel.id);
                    return (
                      <div key={hostel.id} className="relative">
                        <div
                          onClick={() => compareMode ? toggleSelect(hostel.id) : undefined}
                          className={compareMode ? "cursor-pointer" : ""}
                        >
                          {compareMode ? (
                            <div className="rounded-xl overflow-hidden flex" style={{
                              background: "var(--uber-white)",
                              border: isSelected ? "2px solid #06C167" : "0.5px solid var(--uber-border)",
                            }}>
                              <div className="relative w-28 h-24 shrink-0">
                                <Image src={hostel.images[0]} alt={hostel.name} fill className="object-cover" unoptimized />
                                {isSelected && (
                                  <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-[#06C167] flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 px-3 py-2.5 pr-10">
                                <p className="text-sm font-bold truncate" style={{ color: "var(--uber-text)" }}>{hostel.name}</p>
                                <p className="text-xs truncate mt-0.5" style={{ color: "var(--uber-muted)" }}>{hostel.city}, {hostel.state}</p>
                                <p className="text-sm font-extrabold mt-1" style={{ color: "var(--uber-text)" }}>{hostel.priceRangeLabel}</p>
                                <p className="text-xs" style={{ color: "var(--uber-muted)" }}>{hostel.availableRooms} rooms available</p>
                              </div>
                            </div>
                          ) : (
                            <Link href={`/hostels/${hostel.id}`}>
                              <div className="rounded-xl overflow-hidden flex" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                                <div className="relative w-28 h-24 shrink-0">
                                  <Image src={hostel.images[0]} alt={hostel.name} fill className="object-cover" unoptimized />
                                </div>
                                <div className="flex-1 px-3 py-2.5 pr-10">
                                  <p className="text-sm font-bold truncate" style={{ color: "var(--uber-text)" }}>{hostel.name}</p>
                                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--uber-muted)" }}>{hostel.city}, {hostel.state}</p>
                                  <p className="text-sm font-extrabold mt-1" style={{ color: "var(--uber-text)" }}>{hostel.priceRangeLabel}</p>
                                  <p className="text-xs" style={{ color: "var(--uber-muted)" }}>{hostel.availableRooms} rooms available</p>
                                </div>
                              </div>
                            </Link>
                          )}
                        </div>
                        {!compareMode && (
                          <button
                            onClick={() => handleRemove(hostel.id, "hostel")}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center hover:text-red-500 shadow-sm transition-colors"
                            style={{ background: "var(--uber-white)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" }}
                            aria-label="Remove"
                          >×</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            }
          </>
        )}
      </div>

      {/* Compare FAB */}
      {compareMode && selectedCount >= 2 && (
        <div className="fixed left-4 right-4 z-40 bottom-nav-offset mb-3">
          <button
            onClick={() => setShowComparison(true)}
            className="w-full font-bold text-sm py-3.5 rounded-2xl active:scale-95 transition-transform shadow-lg flex items-center justify-center gap-2"
            style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
          >
            Compare {selectedCount} {activeTab} →
          </button>
        </div>
      )}

      {compareMode && selectedCount < 2 && (
        <div className="fixed left-4 right-4 z-40 bottom-nav-offset mb-3">
          <div className="w-full text-center text-xs font-semibold py-3.5 rounded-2xl" style={{ background: "var(--uber-surface)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" }}>
            Select {2 - selectedCount} more to compare (max 3)
          </div>
        </div>
      )}

      {/* Comparison Sheet */}
      {showComparison && activeTab === "homes" && (
        <CompareHomesSheet
          homes={savedHomes.filter(h => selectedHomeIds.has(h.id))}
          onClose={() => setShowComparison(false)}
        />
      )}
      {showComparison && activeTab === "hostels" && (
        <CompareHostelsSheet
          hostels={savedHostels.filter(h => selectedHostelIds.has(h.id))}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
}

function EmptyState({ type }: { type: Tab }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-5xl mb-4">{type === "homes" ? <IconHome className="w-12 h-12" /> : <IconSchool className="w-12 h-12" />}</p>
      <p className="text-base font-semibold" style={{ color: "var(--uber-text)" }}>No saved {type} yet</p>
      <p className="text-sm mt-1 max-w-xs" style={{ color: "var(--uber-muted)" }}>
        Tap the ♡ heart icon on any {type === "homes" ? "home" : "hostel"} listing to save it here.
      </p>
      <Link
        href={`/${type}`}
        className="mt-5 px-5 py-2.5 rounded-full text-sm font-bold"
        style={{ background: "var(--uber-black)", color: "var(--uber-white)" }}
      >
        Browse {type}
      </Link>
    </div>
  );
}

// ─── Comparison Sheets ───────────────────────────────────────────────────────

function CompareHomesSheet({ homes, onClose }: { homes: Property[]; onClose: () => void }) {
  const allAmenities = [...new Set(homes.flatMap(h => h.amenities || []))];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: "var(--uber-white)", borderBottom: "0.5px solid var(--uber-border)", paddingTop: "calc(env(safe-area-inset-top, 12px) + 12px)" }}>
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--uber-surface)" }}>
          <svg className="w-4 h-4" style={{ color: "var(--uber-text)" }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-base font-bold" style={{ color: "var(--uber-text)" }}>Compare Homes</h2>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Images row */}
        <div className="flex gap-0" style={{ borderBottom: "0.5px solid var(--uber-border)" }}>
          {homes.map(h => (
            <div key={h.id} className="flex-1 min-w-0">
              <div className="relative h-32">
                <Image src={h.images[0]} alt={h.title} fill className="object-cover" unoptimized />
              </div>
              <div className="px-2 py-2 text-center" style={{ background: "var(--uber-white)" }}>
                <p className="text-xs font-bold truncate" style={{ color: "var(--uber-text)" }}>{h.title}</p>
                <p className="text-[10px] truncate" style={{ color: "var(--uber-muted)" }}>{h.city}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison rows */}
        <div className="divide-y" style={{ borderColor: "var(--uber-border)" }}>
          <CompareRow label="Price" values={homes.map(h => h.priceLabel)} />
          <CompareRow label="Type" values={homes.map(h => h.propertyType)} />
          <CompareRow label="Listing" values={homes.map(h => h.forSale ? "For Sale" : "For Rent")} />
          <CompareRow label="Beds" values={homes.map(h => String(h.beds))} />
          <CompareRow label="Baths" values={homes.map(h => String(h.baths))} />
          <CompareRow label="Size" values={homes.map(h => `${h.sqft.toLocaleString()} sqft`)} />
          <CompareRow label="Condition" values={homes.map(h => h.condition || "—")} />
          <CompareRow label="Furnishing" values={homes.map(h => h.furnishing || "—")} />
          <CompareRow label="Location" values={homes.map(h => `${h.city}, ${h.state}`)} />
          <CompareRow label="Verified" values={homes.map(h => h.isVerified ? "Yes" : "No")} highlight="Yes" />
          <CompareRow label="Sponsored" values={homes.map(h => h.isSponsored ? "Yes" : "No")} />

          {/* Amenities */}
          {allAmenities.length > 0 && (
            <div className="px-4 py-3" style={{ background: "var(--uber-white)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--uber-muted)" }}>Amenities</p>
              <div className="space-y-1.5">
                {allAmenities.map(amenity => (
                  <div key={amenity} className="flex items-center">
                    <span className="text-xs font-medium w-24 shrink-0" style={{ color: "var(--uber-text)" }}>{amenity}</span>
                    <div className="flex flex-1">
                      {homes.map(h => (
                        <span key={h.id} className="flex-1 text-center text-xs">
                          {(h.amenities || []).includes(amenity)
                            ? <span style={{ color: "#06C167" }}><IconCheck className="w-3 h-3 inline-block" /></span>
                            : <span style={{ color: "var(--uber-muted)" }}>—</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* View buttons */}
        <div className="px-4 py-4 flex gap-2">
          {homes.map(h => (
            <Link key={h.id} href={`/homes/${h.id}`} className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl" style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>
              View
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompareHostelsSheet({ hostels, onClose }: { hostels: Hostel[]; onClose: () => void }) {
  const allAmenities = [...new Set(hostels.flatMap(h => h.amenities || []))];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--background)" }}>
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: "var(--uber-white)", borderBottom: "0.5px solid var(--uber-border)", paddingTop: "calc(env(safe-area-inset-top, 12px) + 12px)" }}>
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--uber-surface)" }}>
          <svg className="w-4 h-4" style={{ color: "var(--uber-text)" }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-base font-bold" style={{ color: "var(--uber-text)" }}>Compare Hostels</h2>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex gap-0" style={{ borderBottom: "0.5px solid var(--uber-border)" }}>
          {hostels.map(h => (
            <div key={h.id} className="flex-1 min-w-0">
              <div className="relative h-32">
                <Image src={h.images[0]} alt={h.name} fill className="object-cover" unoptimized />
              </div>
              <div className="px-2 py-2 text-center" style={{ background: "var(--uber-white)" }}>
                <p className="text-xs font-bold truncate" style={{ color: "var(--uber-text)" }}>{h.name}</p>
                <p className="text-[10px] truncate" style={{ color: "var(--uber-muted)" }}>{h.city}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="divide-y" style={{ borderColor: "var(--uber-border)" }}>
          <CompareRow label="Price Range" values={hostels.map(h => h.priceRangeLabel)} />
          <CompareRow label="Total Rooms" values={hostels.map(h => String(h.totalRooms))} />
          <CompareRow label="Available" values={hostels.map(h => String(h.availableRooms))} highlight="best-number" />
          <CompareRow label="Location" values={hostels.map(h => `${h.city}, ${h.state}`)} />
          <CompareRow label="Universities" values={hostels.map(h => (h.nearbyUniversities || []).join(", ") || "—")} />
          <CompareRow label="Verified" values={hostels.map(h => h.isVerified ? "Yes" : "No")} highlight="Yes" />

          {allAmenities.length > 0 && (
            <div className="px-4 py-3" style={{ background: "var(--uber-white)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--uber-muted)" }}>Amenities</p>
              <div className="space-y-1.5">
                {allAmenities.map(amenity => (
                  <div key={amenity} className="flex items-center">
                    <span className="text-xs font-medium w-24 shrink-0" style={{ color: "var(--uber-text)" }}>{amenity}</span>
                    <div className="flex flex-1">
                      {hostels.map(h => (
                        <span key={h.id} className="flex-1 text-center text-xs">
                          {(h.amenities || []).includes(amenity)
                            ? <span style={{ color: "#06C167" }}><IconCheck className="w-3 h-3 inline-block" /></span>
                            : <span style={{ color: "var(--uber-muted)" }}>—</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-4 flex gap-2">
          {hostels.map(h => (
            <Link key={h.id} href={`/hostels/${h.id}`} className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl" style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>
              View
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompareRow({ label, values, highlight }: { label: string; values: string[]; highlight?: string }) {
  return (
    <div className="flex items-center px-4 py-2.5" style={{ background: "var(--uber-white)" }}>
      <span className="text-[10px] font-bold uppercase tracking-wider w-20 shrink-0" style={{ color: "var(--uber-muted)" }}>{label}</span>
      <div className="flex flex-1">
        {values.map((v, i) => (
          <span
            key={i}
            className="flex-1 text-center text-xs font-semibold"
            style={{ color: highlight && v === highlight ? "#06C167" : "var(--uber-text)" }}
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}
