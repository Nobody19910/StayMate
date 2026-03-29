"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SwipeCard, { type SwipeCardHandle } from "./SwipeCard";
import ExpandedCardOverlay from "./ExpandedCardOverlay";

export interface DeckItem {
  id: string;
  type: "home" | "hostel";
  node: React.ReactNode;
}

interface SwipeDeckProps {
  items: DeckItem[];
  onSwipeRight: (id: string) => void;
  onSwipeLeft: (id: string) => void;
  emptyState?: React.ReactNode;
  visibleCount?: number;
  saveColor?: "emerald" | "blue";
}

export default function SwipeDeck({
  items,
  onSwipeRight,
  onSwipeLeft,
  emptyState,
  visibleCount = 3,
  saveColor = "emerald",
}: SwipeDeckProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expandedItem, setExpandedItem] = useState<{ id: string; type: "home" | "hostel" } | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topCardRef = useRef<SwipeCardHandle>(null);

  const remaining = items.filter((item) => !dismissed.has(item.id));
  const visible = remaining.slice(0, visibleCount);

  function handleSwipe(id: string, direction: "left" | "right") {
    setDismissed((prev) => new Set([...prev, id]));
    if (direction === "right") {
      onSwipeRight(id);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToastVisible(true);
      toastTimer.current = setTimeout(() => setToastVisible(false), 1500);
    } else {
      onSwipeLeft(id);
    }
  }

  function handleExpand(id: string, type: "home" | "hostel") {
    setExpandedItem({ id, type });
  }

  const triggerSwipe = useCallback((direction: "left" | "right") => {
    topCardRef.current?.swipe(direction);
  }, []);

  const triggerExpand = useCallback(() => {
    topCardRef.current?.swipeUp();
  }, []);

  // Keyboard support
  useEffect(() => {
    if (remaining.length === 0) return;
    function onKeyDown(e: KeyboardEvent) {
      if (expandedItem) {
        if (e.key === "Escape" || e.key === "ArrowDown") setExpandedItem(null);
        return;
      }
      if (e.key === "ArrowLeft") triggerSwipe("left");
      if (e.key === "ArrowRight") triggerSwipe("right");
      if (e.key === "ArrowUp") triggerExpand();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [remaining.length, triggerSwipe, triggerExpand, expandedItem]);

  const saveButtonClass = "bg-black hover:bg-gray-900 shadow-black/20";

  if (remaining.length === 0) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center gap-4">
        {emptyState ?? (
          <div className="text-center text-gray-400 px-8">
            <p className="text-5xl mb-4">🏠</p>
            <p className="text-lg font-semibold text-gray-600">You&apos;ve seen them all</p>
            <p className="text-sm mt-1">Check back later for new listings</p>
          </div>
        )}
        <button
          onClick={() => setDismissed(new Set())}
          className="mt-2 px-5 py-2.5 rounded-2xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 active:scale-95 transition-all shadow"
        >
          Start over
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      {/* Card stack — overlay is rendered inside here so it clips correctly */}
      <div className="relative flex-1 overflow-hidden">
        {[...visible].reverse().map((item, reversedIndex) => {
          const depth = visible.length - 1 - reversedIndex;
          const isTop = depth === 0;
          return (
            <SwipeCard
              key={item.id}
              ref={isTop ? topCardRef : null}
              depth={depth}
              onSwipe={(dir) => handleSwipe(item.id, dir)}
              onSwipeUp={isTop ? () => handleExpand(item.id, item.type) : undefined}
            >
              {item.node}
            </SwipeCard>
          );
        })}

        {/* Expanded overlay — sits inside the card area, slides up over the deck */}
        <AnimatePresence>
          {expandedItem && (
            <ExpandedCardOverlay
              id={expandedItem.id}
              type={expandedItem.type}
              onClose={() => setExpandedItem(null)}
            />
          )}
        </AnimatePresence>

        {/* Save toast */}
        <AnimatePresence>
          {toastVisible && (
            <motion.div
              key="save-toast"
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-2xl shadow-lg pointer-events-none flex items-center gap-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-white">♥</span> Saved!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-6 py-4 shrink-0">
        <button
          onClick={() => triggerSwipe("left")}
          aria-label="Skip"
          className="w-14 h-14 rounded-full bg-white border-2 border-red-200 text-red-400 text-2xl flex items-center justify-center shadow-md hover:bg-red-50 hover:border-red-400 hover:scale-110 active:scale-95 transition-all"
        >
          ✕
        </button>

        <button
          onClick={triggerExpand}
          aria-label="Preview listing"
          className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 text-gray-500 text-base flex items-center justify-center shadow hover:bg-gray-50 hover:border-gray-400 hover:scale-110 active:scale-95 transition-all"
        >
          ↑
        </button>

        <button
          onClick={() => triggerSwipe("right")}
          aria-label="Save"
          className={`w-14 h-14 rounded-full text-white text-2xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all ${saveButtonClass}`}
        >
          ♥
        </button>
      </div>

      <p className="hidden lg:block text-center text-xs text-gray-300 pb-2 shrink-0">
        ← skip &nbsp;·&nbsp; → save &nbsp;·&nbsp; ↑ preview &nbsp;·&nbsp; Esc close
      </p>
    </div>
  );
}
