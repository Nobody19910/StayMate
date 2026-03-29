"use client";

export default function PullToRefreshIndicator({
  pullDistance,
  refreshing,
  threshold = 80,
}: {
  pullDistance: number;
  refreshing: boolean;
  threshold?: number;
}) {
  if (pullDistance <= 0 && !refreshing) return null;

  const progress = Math.min(pullDistance / (threshold * 0.8), 1);
  const rotation = progress * 360;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-all"
      style={{ height: pullDistance, minHeight: refreshing ? 48 : 0 }}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${refreshing ? "animate-spin" : ""}`}
        style={{
          background: "var(--uber-white)",
          border: "0.5px solid var(--uber-border)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          transform: refreshing ? undefined : `rotate(${rotation}deg)`,
          opacity: Math.max(progress, refreshing ? 1 : 0),
        }}
      >
        {refreshing ? (
          <div className="w-4 h-4 border-2 rounded-full" style={{ borderColor: "var(--uber-muted)", borderTopColor: "#06C167" }} />
        ) : (
          <svg className="w-4 h-4" style={{ color: progress >= 1 ? "#06C167" : "var(--uber-muted)" }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
          </svg>
        )}
      </div>
    </div>
  );
}
