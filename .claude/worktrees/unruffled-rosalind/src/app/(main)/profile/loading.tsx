export default function ProfileLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="px-4" style={{ paddingTop: "calc(env(safe-area-inset-top, 20px) + 12px)" }}>
        {/* Avatar */}
        <div className="flex flex-col items-center py-8">
          <div className="w-20 h-20 rounded-full animate-pulse" style={{ background: "var(--uber-surface2)" }} />
          <div className="h-5 w-32 rounded-full mt-4 animate-pulse" style={{ background: "var(--uber-surface2)" }} />
          <div className="h-3 w-44 rounded-full mt-2 animate-pulse" style={{ background: "var(--uber-surface2)" }} />
        </div>
        {/* Menu items */}
        <div className="space-y-2">
          {[0,1,2,3].map((i) => (
            <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
