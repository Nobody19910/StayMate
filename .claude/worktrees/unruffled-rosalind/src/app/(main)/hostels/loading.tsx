export default function HostelsLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header skeleton */}
      <div className="sticky top-0 z-20 border-b shadow-sm" style={{ borderColor: "var(--uber-border)", background: "var(--uber-surface)" }}>
        <div className="px-4 pb-2" style={{ paddingTop: "calc(env(safe-area-inset-top, 20px) + 12px)" }}>
          <div className="h-7 w-32 rounded-lg animate-pulse" style={{ background: "var(--uber-surface2)" }} />
          <div className="h-2.5 w-44 rounded-full mt-2 animate-pulse" style={{ background: "var(--uber-surface2)" }} />
        </div>
        <div className="px-4 pb-3 flex gap-2">
          <div className="flex-1 h-10 rounded-xl animate-pulse" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }} />
          <div className="w-10 h-10 rounded-xl animate-pulse" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }} />
        </div>
        <div className="px-4 pb-3 flex gap-2">
          <div className="h-7 w-24 rounded-full animate-pulse" style={{ background: "var(--uber-surface2)" }} />
          <div className="h-7 w-20 rounded-full animate-pulse" style={{ background: "var(--uber-surface2)" }} />
          <div className="h-7 w-20 rounded-full animate-pulse" style={{ background: "var(--uber-surface2)" }} />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="px-4 pt-4 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {[0,1,2,3,4,5,6,7].map((i) => (
            <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <div className="aspect-square w-full" style={{ background: "var(--uber-surface2)" }} />
              <div className="p-2.5 space-y-2.5 mt-1">
                <div className="h-3 rounded-full w-1/3" style={{ background: "var(--uber-surface2)" }} />
                <div className="h-2.5 rounded-full w-2/3 mt-1" style={{ background: "var(--uber-surface2)" }} />
                <div className="h-2 rounded-full w-1/2" style={{ background: "var(--uber-surface2)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
