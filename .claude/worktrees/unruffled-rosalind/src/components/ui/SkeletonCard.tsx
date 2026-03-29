"use client";

export function HomeSkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "0.5px solid var(--uber-border)", background: "var(--uber-white)" }}
    >
      <div className="aspect-square w-full skeleton-shimmer" />
      <div className="p-2.5 space-y-2">
        <div className="h-3.5 rounded-full w-2/5 skeleton-shimmer" />
        <div className="h-2.5 rounded-full w-4/5 skeleton-shimmer" />
        <div className="h-2 rounded-full w-1/3 skeleton-shimmer" />
        <div className="flex gap-2 mt-1">
          <div className="h-2 rounded-full w-12 skeleton-shimmer" />
          <div className="h-2 rounded-full w-10 skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

export function HostelSkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "0.5px solid var(--uber-border)", background: "var(--uber-white)" }}
    >
      <div className="aspect-square w-full skeleton-shimmer" />
      <div className="p-2.5 space-y-2">
        <div className="h-3.5 rounded-full w-1/2 skeleton-shimmer" />
        <div className="h-3 rounded-full w-3/4 skeleton-shimmer" />
        <div className="h-2 rounded-full w-1/3 skeleton-shimmer" />
        <div className="h-2 rounded-full w-1/4 skeleton-shimmer" />
      </div>
    </div>
  );
}

export function GridSkeleton({ type = "home", count = 8 }: { type?: "home" | "hostel"; count?: number }) {
  const Card = type === "home" ? HomeSkeletonCard : HostelSkeletonCard;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} />
      ))}
    </div>
  );
}
