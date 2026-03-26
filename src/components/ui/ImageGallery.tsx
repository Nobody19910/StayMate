"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import OptimizedImage from "@/components/ui/OptimizedImage";

interface ImageGalleryProps {
  images: string[];
  alt: string;
  /** Height class for the hero display e.g. "h-72" */
  heightClass?: string;
  children?: React.ReactNode; // overlay buttons (back, save, badges)
}

export default function ImageGallery({ images, alt, heightClass = "h-72", children }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  const validImages = images.filter(Boolean);
  const total = validImages.length;

  const goTo = useCallback((i: number) => {
    if (i < 0) setCurrentIndex(total - 1);
    else if (i >= total) setCurrentIndex(0);
    else setCurrentIndex(i);
  }, [total]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }

  function handleTouchMove(e: React.TouchEvent) {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }

  function handleTouchEnd() {
    if (Math.abs(touchDeltaX.current) > 50) {
      if (touchDeltaX.current < 0) goTo(currentIndex + 1);
      else goTo(currentIndex - 1);
    }
    touchDeltaX.current = 0;
  }

  return (
    <>
      {/* Hero image with swipe */}
      <div
        className={`relative ${heightClass} w-full overflow-hidden cursor-pointer`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (total > 0) setFullscreen(true); }}
      >
        {total > 0 && (
          <OptimizedImage
            src={validImages[currentIndex]}
            alt={`${alt} ${currentIndex + 1}`}
            width={800}
            priority
            className="absolute inset-0 w-full h-full"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />

        {/* Dot indicators */}
        {total > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
            {validImages.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                className={`rounded-full transition-all ${i === currentIndex ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        )}

        {/* Photo count badge */}
        {total > 1 && (
          <div
            className="absolute bottom-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm z-10"
            style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
          >
            {currentIndex + 1}/{total}
          </div>
        )}

        {/* Overlay children (back button, save button, badges) */}
        {children}
      </div>

      {/* Fullscreen gallery modal */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 shrink-0" style={{ paddingTop: "calc(env(safe-area-inset-top, 12px) + 12px)", paddingBottom: "12px" }}>
              <button
                onClick={() => setFullscreen(false)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <span className="text-white text-sm font-bold">{currentIndex + 1} / {total}</span>
              <div className="w-9" />
            </div>

            {/* Main image */}
            <div
              className="flex-1 relative"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <Image
                src={validImages[currentIndex]}
                alt={`${alt} ${currentIndex + 1}`}
                fill
                className="object-contain"
                unoptimized
              />

              {/* Desktop arrows */}
              {total > 1 && (
                <>
                  <button
                    onClick={() => goTo(currentIndex - 1)}
                    className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => goTo(currentIndex + 1)}
                    className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {total > 1 && (
              <div className="shrink-0 px-4 py-3 flex gap-2 overflow-x-auto" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 12px) + 12px)" }}>
                {validImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 transition-all ${i === currentIndex ? "ring-2 ring-white" : "opacity-50"}`}
                  >
                    <Image src={img} alt="" fill className="object-cover" unoptimized />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
