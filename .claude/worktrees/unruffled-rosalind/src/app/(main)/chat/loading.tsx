export default function ChatLoading() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="px-4 pb-3 border-b" style={{ paddingTop: "calc(env(safe-area-inset-top, 20px) + 12px)", borderColor: "var(--uber-border)", background: "var(--uber-white)" }}>
        <div className="h-6 w-28 rounded-lg animate-pulse" style={{ background: "var(--uber-surface2)" }} />
      </div>
      {/* Messages skeleton */}
      <div className="flex-1 px-4 py-4 space-y-4">
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full shrink-0 animate-pulse" style={{ background: "var(--uber-surface2)" }} />
          <div className="h-12 w-48 rounded-2xl animate-pulse" style={{ background: "var(--uber-surface2)" }} />
        </div>
        <div className="flex gap-2 justify-end">
          <div className="h-10 w-40 rounded-2xl animate-pulse" style={{ background: "var(--uber-surface2)" }} />
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full shrink-0 animate-pulse" style={{ background: "var(--uber-surface2)" }} />
          <div className="h-16 w-56 rounded-2xl animate-pulse" style={{ background: "var(--uber-surface2)" }} />
        </div>
      </div>
      {/* Input skeleton */}
      <div className="px-4 py-3 border-t" style={{ borderColor: "var(--uber-border)", background: "var(--uber-white)" }}>
        <div className="h-10 rounded-xl animate-pulse" style={{ background: "var(--uber-surface2)" }} />
      </div>
    </div>
  );
}
