"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<"logo" | "wipe-right" | "wipe-left" | "done">("logo");

  useEffect(() => {
    // Phase 1: Show wordmark for 1.2s
    const t1 = setTimeout(() => setPhase("wipe-right"), 1200);
    // Phase 2: White wipe covers logo (left→right) — 0.5s
    const t2 = setTimeout(() => setPhase("wipe-left"), 1700);
    // Phase 3: White wipe reveals content (right→left) — 0.5s
    const t3 = setTimeout(() => {
      setPhase("done");
      onFinish();
    }, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999]"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Black background with centered wordmark */}
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#000000" }}>
            <div className="flex items-baseline">
              <motion.span
                className="font-extrabold text-[42px]"
                style={{ color: "#FFFFFF", fontFamily: "var(--font-inter), Inter, sans-serif", letterSpacing: "-0.02em" }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              >
                Stay
              </motion.span>
              <motion.span
                className="font-extrabold text-[42px]"
                style={{ color: "#06C167", fontFamily: "var(--font-inter), Inter, sans-serif", letterSpacing: "-0.02em" }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
              >
                Mate
              </motion.span>
            </div>
          </div>

          {/* White wipe overlay — left to right (covers logo) */}
          {(phase === "wipe-right" || phase === "wipe-left") && (
            <motion.div
              className="absolute inset-0"
              style={{ background: "var(--uber-surface, #F6F6F6)" }}
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            />
          )}

          {/* White wipe overlay — right to left (reveals content underneath) */}
          {phase === "wipe-left" && (
            <motion.div
              className="absolute inset-0"
              style={{ background: "var(--uber-surface, #F6F6F6)" }}
              initial={{ x: "0%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
