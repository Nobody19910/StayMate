"use client";

import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "staymate_onboarded";

export default function OnboardingFlow() {
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function finish() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  function next() {
    if (slide < 2) setSlide(s => s + 1);
    else finish();
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.changedTouches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    touchEndX.current = e.changedTouches[0].clientX;
    const delta = touchStartX.current - touchEndX.current;
    if (delta > 50 && slide < 2) setSlide(s => s + 1);
    if (delta < -50 && slide > 0) setSlide(s => s - 1);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col overflow-hidden"
      style={{ background: "var(--uber-surface)" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides container */}
      <div className="flex-1 relative overflow-hidden">
        {/* Slide 1 — Welcome */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(${(0 - slide) * 100}%)` }}
        >
          <div className="text-8xl mb-8">🏠</div>
          <h1 className="text-3xl font-bold mb-4" style={{ color: "var(--uber-text)", fontFamily: "Playfair Display, serif" }}>
            Welcome to StayMate
          </h1>
          <p className="text-base leading-relaxed max-w-sm" style={{ color: "var(--uber-muted)" }}>
            Ghana's trusted platform for finding homes and student hostels — directly from owners, no broker fees.
          </p>
        </div>

        {/* Slide 2 — How it works */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-8 transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(${(1 - slide) * 100}%)` }}
        >
          <h1 className="text-2xl font-bold mb-8 text-center" style={{ color: "var(--uber-text)", fontFamily: "Playfair Display, serif" }}>
            How StayMate works
          </h1>
          <div className="w-full max-w-sm space-y-5">
            {[
              { icon: "🔍", title: "Browse verified listings", desc: "Search homes and hostels across Ghana, filtered by location and budget" },
              { icon: "💬", title: "Send an inquiry", desc: "Contact the owner or agent directly through our concierge chat" },
              { icon: "🗓", title: "Pay & schedule viewing", desc: "Pay GH₵200 to confirm your viewing appointment" },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: "var(--uber-green)", color: "#fff" }}>
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-bold mb-0.5" style={{ color: "var(--uber-text)" }}>
                    {step.icon} {step.title}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--uber-muted)" }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Slide 3 — Promise */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(${(2 - slide) * 100}%)` }}
        >
          <div className="text-8xl mb-8">✅</div>
          <h1 className="text-3xl font-bold mb-4" style={{ color: "var(--uber-text)", fontFamily: "Playfair Display, serif" }}>
            You're in safe hands
          </h1>
          <p className="text-base leading-relaxed max-w-sm mb-10" style={{ color: "var(--uber-muted)" }}>
            Every listing is reviewed. Our concierge team coordinates every viewing. No fake listings, no wasted trips.
          </p>
          <button
            onClick={finish}
            className="px-10 py-4 rounded-2xl text-base font-bold active:scale-95 transition-transform"
            style={{ background: "var(--uber-green)", color: "#fff" }}
          >
            Start Browsing →
          </button>
        </div>
      </div>

      {/* Bottom nav area */}
      <div className="px-6 pb-10 pt-4 flex items-center justify-between"
        style={{ borderTop: "0.5px solid var(--uber-border)" }}>
        {/* Dot indicators */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === slide ? "20px" : "8px",
                height: "8px",
                background: i === slide ? "var(--uber-green)" : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>

        {/* Skip / Next buttons */}
        {slide < 2 ? (
          <div className="flex items-center gap-4">
            <button
              onClick={finish}
              className="text-sm font-medium"
              style={{ color: "var(--uber-muted)" }}
            >
              Skip
            </button>
            <button
              onClick={next}
              className="px-6 py-2.5 rounded-2xl text-sm font-bold active:scale-95 transition-transform"
              style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
            >
              Next →
            </button>
          </div>
        ) : (
          // Spacer so dots stay left-aligned on last slide
          <div />
        )}
      </div>
    </div>
  );
}
