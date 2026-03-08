"use client";

import { useRef, forwardRef, useImperativeHandle } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimation,
  PanInfo,
  AnimatePresence,
} from "framer-motion";

export interface SwipeCardHandle {
  swipe: (direction: "left" | "right") => Promise<void>;
  swipeUp: () => void;
}

export interface SwipeCardProps {
  children: React.ReactNode;
  onSwipe: (direction: "left" | "right") => void;
  onSwipeUp?: () => void;
  /** Stack depth — 0 = top card */
  depth: number;
}

const SWIPE_THRESHOLD = 100;
const SWIPE_VELOCITY = 500;
const SWIPE_UP_THRESHOLD = 80;

const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(function SwipeCard(
  { children, onSwipe, onSwipeUp, depth },
  ref
) {
  const controls = useAnimation();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-25, 0, 25]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0]);

  // Tracks whether a drag occurred so we can swallow the synthetic click that
  // browsers fire at pointer-up after a drag gesture.
  const hasDragged = useRef(false);

  const isTop = depth === 0;

  // Exposed to SwipeDeck for button/keyboard-triggered swipes
  useImperativeHandle(ref, () => ({
    async swipe(direction) {
      if (direction === "right") {
        await controls.start({ x: 600, rotate: 30, opacity: 0, transition: { duration: 0.22, ease: "easeIn" } });
      } else {
        await controls.start({ x: -600, rotate: -30, opacity: 0, transition: { duration: 0.22, ease: "easeIn" } });
      }
      onSwipe(direction);
    },
    swipeUp() {
      onSwipeUp?.();
    },
  }));

  async function handleDragEnd(_: unknown, info: PanInfo) {
    const { offset, velocity } = info;

    // Upward swipe — must be more vertical than horizontal
    const isMoreVertical = Math.abs(offset.y) > Math.abs(offset.x);
    if (isMoreVertical && offset.y < -SWIPE_UP_THRESHOLD) {
      // Snap back to rest and trigger expand (card stays in the deck)
      controls.start({ x: 0, y: 0, rotate: 0, transition: { type: "spring", stiffness: 420, damping: 30 } });
      onSwipeUp?.();
      return;
    }

    const swipedRight = offset.x > SWIPE_THRESHOLD || velocity.x > SWIPE_VELOCITY;
    const swipedLeft = offset.x < -SWIPE_THRESHOLD || velocity.x < -SWIPE_VELOCITY;

    if (swipedRight) {
      await controls.start({ x: 600, rotate: 30, opacity: 0, transition: { duration: 0.22, ease: "easeIn" } });
      onSwipe("right");
    } else if (swipedLeft) {
      await controls.start({ x: -600, rotate: -30, opacity: 0, transition: { duration: 0.22, ease: "easeIn" } });
      onSwipe("left");
    } else {
      controls.start({ x: 0, y: 0, rotate: 0, transition: { type: "spring", stiffness: 420, damping: 30 } });
    }
  }

  const stackScale = 1 - depth * 0.04;
  const stackY = depth * 10;

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        scale: stackScale,
        y: stackY,
        zIndex: 10 - depth,
      }}
      animate={isTop ? controls : { scale: stackScale, y: stackY }}
      drag={isTop ? true : false}
      dragConstraints={{ left: 0, right: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragStart={() => { hasDragged.current = false; }}
      onDrag={() => { hasDragged.current = true; }}
      onDragEnd={isTop ? handleDragEnd : undefined}
    >
      {/* LIKE badge */}
      {isTop && (
        <motion.div
          className="absolute top-8 left-6 z-20 border-4 border-green-400 text-green-400 font-black text-2xl tracking-widest rounded-lg px-3 py-1 rotate-[-20deg] pointer-events-none select-none"
          style={{ opacity: likeOpacity }}
        >
          SAVE
        </motion.div>
      )}

      {/* NOPE badge */}
      {isTop && (
        <motion.div
          className="absolute top-8 right-6 z-20 border-4 border-red-400 text-red-400 font-black text-2xl tracking-widest rounded-lg px-3 py-1 rotate-[20deg] pointer-events-none select-none"
          style={{ opacity: nopeOpacity }}
        >
          SKIP
        </motion.div>
      )}

      {/* Swipe-up hint */}
      <AnimatePresence>
        {isTop && (
          <motion.div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 pointer-events-none select-none"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: [0, 0.75, 0.75, 0], y: [8, 0, 0, -6] }}
            transition={{ duration: 2.4, times: [0, 0.2, 0.7, 1], delay: 1.2, repeat: Infinity, repeatDelay: 3 }}
          >
            <span className="text-white text-lg drop-shadow">↑</span>
            <span className="text-white text-[10px] font-semibold tracking-wide drop-shadow">Swipe up to preview</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intercept click after a drag so card onClick never fires post-swipe */}
      <div
        className="w-full h-full"
        onClick={(e) => {
          if (hasDragged.current) {
            e.stopPropagation();
            hasDragged.current = false;
          }
        }}
      >
        {children}
      </div>
    </motion.div>
  );
});

export default SwipeCard;
