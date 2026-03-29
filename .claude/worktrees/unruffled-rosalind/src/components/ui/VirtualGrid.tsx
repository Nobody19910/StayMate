"use client";

import { useRef, useState, useEffect, memo } from "react";

interface VirtualGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey: (item: T) => string;
  batchSize?: number;       // how many items to render per batch
  threshold?: number;        // px before bottom to trigger next batch
  className?: string;
}

/**
 * Progressive-render grid: starts with first batch, loads more as user scrolls.
 * Uses IntersectionObserver on a sentinel element at the bottom.
 * Much lighter than rendering 50+ cards at once.
 */
function VirtualGridInner<T>({
  items,
  renderItem,
  getKey,
  batchSize = 8,
  threshold = 400,
  className = "",
}: VirtualGridProps<T>) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset visible count when items change (new filter/search)
  useEffect(() => {
    setVisibleCount(batchSize);
  }, [items, batchSize]);

  // Load more when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
        }
      },
      { rootMargin: `${threshold}px` }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [items.length, batchSize, threshold]);

  const visible = items.slice(0, visibleCount);

  return (
    <>
      <div className={className}>
        {visible.map((item, i) => (
          <div key={getKey(item)}>{renderItem(item, i)}</div>
        ))}
      </div>
      {/* Sentinel — triggers loading more items when scrolled near */}
      {visibleCount < items.length && (
        <div ref={sentinelRef} style={{ height: 1 }} />
      )}
    </>
  );
}

// Memo wrapper that works with generics
const VirtualGrid = memo(VirtualGridInner) as typeof VirtualGridInner;

export default VirtualGrid;
