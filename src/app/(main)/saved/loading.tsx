export default function SavedLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="px-4 pb-2" style={{ paddingTop: "calc(env(safe-area-inset-top, 20px) + 12px)" }}>
        <div className="h-7 w-24 rounded-lg animate-pulse" style={{ background: "var(--uber-surface2)" }} />
      </div>
      <div className="px-4 pt-4 space-y-3">
        {[0,1,2].map((i) => (
          <div key={i} className="flex gap-3 rounded-2xl p-3 animate-pulse" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
            <div className="w-28 h-24 rounded-xl shrink-0" style={{ background: "var(--uber-surface2)" }} />
            <div className="flex-1 space-y-2.5 py-1">
              <div className="h-3 rounded-full w-2/3" style={{ background: "var(--uber-surface2)" }} />
              <div className="h-2.5 rounded-full w-1/2" style={{ background: "var(--uber-surface2)" }} />
              <div className="h-3 rounded-full w-1/3" style={{ background: "var(--uber-surface2)" }} />
              <div className="h-2.5 rounded-full w-1/4" style={{ background: "var(--uber-surface2)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
