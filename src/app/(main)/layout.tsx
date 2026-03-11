import BottomNav from "@/components/ui/BottomNav";
import SideNav from "@/components/ui/SideNav";
import PageTransition from "@/components/ui/PageTransition";
import ProfileCornerButton from "@/components/ui/ProfileCornerButton";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  /*
   * Mobile  (<lg): single-column, bottom nav fixed
   * Desktop (lg+): gradient backdrop + left sidebar + centered card shell
   */
  return (
    <div className="min-h-screen bg-white lg:bg-gradient-to-br lg:from-slate-100 lg:to-gray-200 lg:flex">

      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        <SideNav />
      </aside>

      {/* Main content area */}
      <div className="flex-1 lg:flex lg:items-center lg:justify-center lg:p-8">
        {/* Phone-shell card on desktop, full-screen on mobile */}
        <div className="
          flex flex-col bg-white
          w-full min-h-screen
          lg:w-[520px] lg:min-h-0 lg:h-[calc(100vh-4rem)]
          lg:rounded-3xl lg:shadow-2xl lg:overflow-hidden
        ">
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
    </div>
  );
}
