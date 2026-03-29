"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: PullToRefreshOptions) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const activeRef = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only activate when scrolled to top
    const scrollEl = e.currentTarget as HTMLElement;
    if (scrollEl.scrollTop > 5) return;
    startYRef.current = e.touches[0].clientY;
    activeRef.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!activeRef.current) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy > 0) {
      // Dampen the pull distance for a rubber-band feel
      const dampened = Math.min(dy * 0.4, threshold * 1.5);
      setPullDistance(dampened);
      setPulling(true);
    } else {
      setPullDistance(0);
      setPulling(false);
    }
  }, [threshold]);

  const onTouchEnd = useCallback(async () => {
    if (!activeRef.current) return;
    activeRef.current = false;

    if (pullDistance >= threshold * 0.8) {
      setRefreshing(true);
      setPullDistance(threshold * 0.5);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
        setPulling(false);
      }
    } else {
      setPullDistance(0);
      setPulling(false);
    }
  }, [pullDistance, threshold, onRefresh]);

  return {
    pulling,
    refreshing,
    pullDistance,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
