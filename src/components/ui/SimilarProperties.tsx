"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getHomes, getHostels } from "@/lib/api";
import type { Property, Hostel } from "@/lib/types";

interface SimilarHomesProps {
  currentId: string;
  city: string;
  propertyType: string;
  priceRange: { min: number; max: number };
}

export function SimilarHomes({ currentId, city, propertyType, priceRange }: SimilarHomesProps) {
  const [similar, setSimilar] = useState<Property[]>([]);

  useEffect(() => {
    getHomes().then((homes) => {
      const scored = homes
        .filter(h => h.id !== currentId)
        .map(h => {
          let score = 0;
          if (h.city.toLowerCase() === city.toLowerCase()) score += 3;
          if (h.propertyType === propertyType) score += 2;
          if (h.price >= priceRange.min * 0.7 && h.price <= priceRange.max * 1.3) score += 1;
          return { ...h, _score: score };
        })
        .filter(h => h._score > 0)
        .sort((a, b) => b._score - a._score)
        .slice(0, 6);
      setSimilar(scored);
    }).catch(() => {});
  }, [currentId, city, propertyType, priceRange]);

  if (similar.length === 0) return null;

  return (
    <div className="px-4 py-4">
      <h2 className="text-sm font-bold mb-3" style={{ color: "var(--uber-text)" }}>Similar Properties</h2>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
        {similar.map(h => (
          <Link key={h.id} href={`/homes/${h.id}`} className="shrink-0 w-44">
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
              <div className="relative h-28 w-full">
                <Image src={h.images[0]} alt={h.title} fill className="object-cover" unoptimized />
                {h.isSponsored && (
                  <span className="absolute top-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded shimmer-gold text-[#1A1A1A]">✦ Sponsored</span>
                )}
              </div>
              <div className="px-2.5 py-2">
                <p className="text-xs font-bold truncate" style={{ color: "var(--uber-text)" }}>{h.title}</p>
                <p className="text-[10px] truncate" style={{ color: "var(--uber-muted)" }}>{h.city}, {h.state}</p>
                <p className="text-xs font-extrabold mt-1" style={{ color: "var(--uber-text)" }}>{h.priceLabel}</p>
                <p className="text-[10px]" style={{ color: "var(--uber-muted)" }}>{h.beds}bd · {h.baths}ba</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

interface SimilarHostelsProps {
  currentHostelId: string;
  city: string;
  priceMin: number;
  priceMax: number;
}

export function SimilarHostels({ currentHostelId, city, priceMin, priceMax }: SimilarHostelsProps) {
  const [similar, setSimilar] = useState<Hostel[]>([]);

  useEffect(() => {
    getHostels({ from: 0, to: 50 }).then(({ data }) => {
      const scored = data
        .filter(h => h.id !== currentHostelId)
        .map(h => {
          let score = 0;
          if (h.city.toLowerCase() === city.toLowerCase()) score += 3;
          if (h.priceRange.min <= priceMax * 1.3 && h.priceRange.max >= priceMin * 0.7) score += 2;
          if (h.availableRooms > 0) score += 1;
          return { ...h, _score: score };
        })
        .filter(h => h._score > 0)
        .sort((a, b) => b._score - a._score)
        .slice(0, 6);
      setSimilar(scored);
    }).catch(() => {});
  }, [currentHostelId, city, priceMin, priceMax]);

  if (similar.length === 0) return null;

  return (
    <div className="px-4 py-4">
      <h2 className="text-sm font-bold mb-3" style={{ color: "var(--uber-text)" }}>Similar Hostels</h2>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
        {similar.map(h => (
          <Link key={h.id} href={`/hostels/${h.id}`} className="shrink-0 w-44">
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
              <div className="relative h-28 w-full">
                <Image src={h.images[0]} alt={h.name} fill className="object-cover" unoptimized />
                {h.isSponsored && (
                  <span className="absolute top-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded shimmer-gold text-[#1A1A1A]">✦ Sponsored</span>
                )}
              </div>
              <div className="px-2.5 py-2">
                <p className="text-xs font-bold truncate" style={{ color: "var(--uber-text)" }}>{h.name}</p>
                <p className="text-[10px] truncate" style={{ color: "var(--uber-muted)" }}>{h.city}, {h.state}</p>
                <p className="text-xs font-extrabold mt-1" style={{ color: "var(--uber-text)" }}>{h.priceRangeLabel}</p>
                <p className="text-[10px]" style={{ color: "var(--uber-muted)" }}>{h.availableRooms} rooms available</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
