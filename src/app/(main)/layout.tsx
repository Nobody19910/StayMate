import TopNav from "@/components/ui/TopNav";
import BottomNav from "@/components/ui/BottomNav";
import PageTransition from "@/components/ui/PageTransition";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>

      {/* Top navigation — always visible */}
      <TopNav />

      {/* Main content — fills remaining height */}
      <main className="flex-1 pb-nav lg:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>

      {/* Bottom nav — mobile only */}
      <div className="lg:hidden">
        <BottomNav />
      </div>

    </div>
  );
}
