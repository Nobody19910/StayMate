"use client";

import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
}

const COLORS = ["#06C167", "#D4AF37", "#FF6B6B", "#4ECDC4", "#FFD93D", "#6C5CE7"];

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    rotation: Math.random() * 360,
    scale: 0.5 + Math.random() * 0.8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random() * 1.5,
    drift: -30 + Math.random() * 60,
  }));
}

export default function Confetti({ active, duration = 3000 }: { active: boolean; duration?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) return;
    setParticles(generateParticles(50));
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [active, duration]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute confetti-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: 8 * p.scale,
            height: 12 * p.scale,
            background: p.color,
            borderRadius: "2px",
            transform: `rotate(${p.rotation}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            "--drift": `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/** Smaller celebration — a green checkmark pulse + subtle sparkle */
export function StatusCelebration({ status }: { status: string }) {
  if (status === "fee_paid") {
    return (
      <div className="flex flex-col items-center gap-2 py-4 animate-[fadeInScale_0.5s_ease-out]">
        <div className="w-14 h-14 rounded-full flex items-center justify-center animate-[pulseGreen_1s_ease-in-out_2]" style={{ background: "#06C167" }}>
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>Payment Confirmed!</p>
        <p className="text-xs" style={{ color: "var(--uber-muted)" }}>Your spot is secured</p>
      </div>
    );
  }

  if (status === "viewing_scheduled") {
    return (
      <div className="flex flex-col items-center gap-2 py-4 animate-[fadeInScale_0.5s_ease-out]">
        <div className="w-14 h-14 rounded-full flex items-center justify-center animate-[pulseGreen_1s_ease-in-out_2]" style={{ background: "#4ECDC4" }}>
          <span className="text-2xl">📅</span>
        </div>
        <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>Viewing Scheduled!</p>
        <p className="text-xs" style={{ color: "var(--uber-muted)" }}>Check your chat for details</p>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="flex flex-col items-center gap-2 py-4 animate-[fadeInScale_0.5s_ease-out]">
        <div className="w-14 h-14 rounded-full flex items-center justify-center animate-[pulseGreen_1s_ease-in-out_2]" style={{ background: "#D4AF37" }}>
          <span className="text-2xl">🎉</span>
        </div>
        <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>All Done!</p>
        <p className="text-xs" style={{ color: "var(--uber-muted)" }}>Thank you for using StayMate</p>
      </div>
    );
  }

  return null;
}
