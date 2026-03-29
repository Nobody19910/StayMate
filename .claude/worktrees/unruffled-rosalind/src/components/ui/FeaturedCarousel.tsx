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
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--uber-muted)" }}>
          <span style={{ color: "#D4AF37" }}><IconStar className="w-3.5 h-3.5 inline-block" /></span> Featured Today
        </h2>
        {total > 1 && (
          <span className="text-[10px] font-bold" style={{ color: "var(--uber-muted)" }}>
            {current + 1}/{total}
          </span>
        )}
      </div>

      <Link href={href}>
        <div
          className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform"
          style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.12)", border: "0.5px solid var(--uber-border)" }}
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Gold sponsored badge */}
          <div
            className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-md"
            style={{ background: "rgba(212,175,55,0.9)", color: "#fff" }}
          >
            <IconStar className="w-3 h-3 inline-block" /> Sponsored
          </div>

          {/* Info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-white text-lg font-extrabold leading-tight font-serif drop-shadow">{item.title}</p>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-white/80 text-xs">{item.city}</p>
              <p className="text-white text-sm font-extrabold">{item.priceLabel}</p>
            </div>
          </div>

          {/* Dot indicators */}
          {total > 1 && (
            <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-1.5">
              {items.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all ${i === current ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40"}`}
                />
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
