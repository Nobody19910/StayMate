"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { IconStar } from "@/components/ui/Icons";

interface FeaturedItem {
  id: string;
  title: string;
  image: string;
  city: string;
  priceLabel: string;
  type: "home" | "hostel";
}

interface FeaturedCarouselProps {
  items: FeaturedItem[];
}

export default function FeaturedCarousel({ items }: FeaturedCarouselProps) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  const total = items.length;

  const advance = useCallback(() => {
    setCurrent((prev) => (prev + 1) % total);
  }, [total]);

  // Auto-advance every 4 seconds
  useEffect(() => {
    if (total <= 1) return;
    timerRef.current = setInterval(advance, 4000);
    return () => clearInterval(timerRef.current);
  }, [total, advance]);

  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(advance, 4000);
  }

  function goTo(i: number) {
    if (i < 0) setCurrent(total - 1);
    else if (i >= total) setCurrent(0);
    else setCurrent(i);
    resetTimer();
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }

  function handleTouchMove(e: React.TouchEvent) {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }

  function handleTouchEnd() {
    if (Math.abs(touchDeltaX.current) > 50) {
      if (touchDeltaX.current < 0) goTo(current + 1);
      else goTo(current - 1);
    }
    touchDeltaX.current = 0;
  }

  if (total === 0) return null;

  const item = items[current];
  const href = item.type === "home" ? `/homes/${item.id}` : `/hostels/${item.id}`;

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>
          <span style={{ color: "var(--gold)" }}><IconStar className="w-3.5 h-3.5 inline-block mr-1" /></span>
          Featured Today
        </h2>
        {total > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={() => goTo(current - 1)} className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--uber-surface2)", color: "var(--uber-text)" }}>‹</button>
            <span className="text-[10px] font-bold" style={{ color: "var(--uber-muted)" }}>{current + 1}/{total}</span>
            <button onClick={() => goTo(current + 1)} className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--uber-surface2)", color: "var(--uber-text)" }}>›</button>
          </div>
        )}
      </div>

      <Link href={href}>
        <div
          className="relative w-full rounded-2xl overflow-hidden active:scale-[0.99] transition-transform"
          style={{
            height: "180px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            border: "0.5px solid var(--uber-border)",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            src={item.image}
            alt={item.title}
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent" />

          {/* Gold sponsored badge */}
          <div
            className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: "var(--gold)", color: "#fff" }}
          >
            <IconStar className="w-2.5 h-2.5 inline-block" /> Sponsored
          </div>

          {/* Info — left aligned */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-center p-5 max-w-[65%]">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">
              {item.type === "home" ? "Private Home" : "Student Hostel"}
            </p>
            <p className="text-white text-xl font-extrabold leading-tight font-serif drop-shadow line-clamp-2">{item.title}</p>
            <div className="flex items-center gap-2 mt-2">
              <svg className="w-3 h-3 text-white/70 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
              <p className="text-white/80 text-xs">{item.city}</p>
            </div>
            <p className="text-white text-sm font-extrabold mt-1">{item.priceLabel}</p>
          </div>

          {/* Dot indicators */}
          {total > 1 && (
            <div className="absolute bottom-3 left-5 flex gap-1.5">
              {items.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all ${i === current ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40"}`}
                />
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
