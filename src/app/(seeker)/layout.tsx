import BottomNav from "@/components/ui/BottomNav";
import SideNav from "@/components/ui/SideNav";
import PageTransition from "@/components/ui/PageTransition";
import ProfileCornerButton from "@/components/ui/ProfileCornerButton";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  /*
   * Mobile  (<lg): single-column, bottom nav fixed
   * Desktop (lg+): left sidebar + full-width content area (no phone shell)
   */
  return (
    <div className="min-h-screen bg-[#F6F6F6] lg:flex">

      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen lg:z-30">
        <SideNav />
      </aside>

      {/* Main content area — full width on desktop */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <PageTransition>{children}</PageTransition>
        </main>

        {/* Bottom nav — mobile only */}
        <div className="lg:hidden">
          <BottomNav />
        </div>

        {/* Profile avatar — fixed top-right, mobile only */}
        <ProfileCornerButton />
      </div>
    </div>
  );
}
