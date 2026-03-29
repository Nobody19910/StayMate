"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

// Emil Kowalski-style blur-fade transition
// Slides up 16px + fades in + unblurs — feels native and premium
const variants = {
  initial: {
    opacity: 0,
    y: 16,
    filter: "blur(4px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(4px)",
  },
};

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className="h-full"
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration: 0.22,
          ease: [0.25, 0.1, 0.25, 1], // cubic-bezier — smooth decel
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
