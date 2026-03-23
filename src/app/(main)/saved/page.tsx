"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getSavedByType, removeSaved } from "@/lib/saved-store";
import { getHomes, getHostels } from "@/lib/api";
import type { Property, Hostel } from "@/lib/types";

type Tab = "homes" | "hostels";

export default function SavedPage() {
  const [activeTab, setActiveTab] = useState<Tab>("homes");
  const [savedHomes, setSavedHomes] = useState<Property[]>([]);
  const [savedHostels, setSavedHostels] = useState<Hostel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const homeIds = new Set(getSavedByType("home").map((e) => e.id));
    const hostelIds = new Set(getSavedByType("hostel").map((e) => e.id));
    Promise.all([getHomes(), getHostels()]).then(([homes, hostels]) => {
      setSavedHomes(homes.filter((h) => homeIds.has(h.id)));
      setSavedHostels(hostels.filter((h) => hostelIds.has(h.id)));
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  function handleRemove(id: string, type: "home" | "hostel") {
    removeSaved(id);
    if (type === "home") setSavedHomes((prev) => prev.filter((h) => h.id !== id));
    else setSavedHostels((prev) => prev.filter((h) => h.id !== id));
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="px-4 pb-0" style={{ paddingTop: "calc(env(safe-area-inset-top, 20px) + 12px)", background: "var(--uber-white)", borderBottom: "0.5px solid var(--uber-border)" }}>
        <h1 className="text-xl font-extrabold mb-3" style={{ color: "var(--uber-text)" }}>Saved</h1>
        {/* Tabs */}
        <div className="flex" style={{ borderBottom: "0.5px solid var(--uber-border)" }}>
          {(["homes", "hostels"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 pb-3 text-sm font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? "border-b-2"
                  : ""
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
                  {savedHomes.map((property) => (
                    <div key={property.id} className="relative">
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
                      <button
                        onClick={() => handleRemove(property.id, "home")}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center hover:text-red-500 shadow-sm transition-colors"
                        style={{ background: "var(--uber-white)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" }}
                        aria-label="Remove"
                      >×</button>
                    </div>
                  ))}
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
                  {savedHostels.map((hostel) => (
                    <div key={hostel.id} className="relative">
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
                      <button
                        onClick={() => handleRemove(hostel.id, "hostel")}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center hover:text-red-500 shadow-sm transition-colors"
                        style={{ background: "var(--uber-white)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" }}
                        aria-label="Remove"
                      >×</button>
                    </div>
                  ))}
                </div>
              )
            }
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ type }: { type: Tab }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-5xl mb-4">{type === "homes" ? "🏠" : "🏫"}</p>
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
