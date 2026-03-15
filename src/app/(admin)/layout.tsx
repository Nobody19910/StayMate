"use client";

import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Dark Admin Sidebar */}
      <div className="bg-gray-900 text-white md:w-64 shrink-0 flex flex-col md:h-screen sticky top-0 md:border-r border-gray-800 z-50">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">StayMate Command</h1>
          <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Super Admin</p>
        </div>
        <nav className="flex flex-row md:flex-col p-4 gap-2 overflow-x-auto md:overflow-y-auto HideScrollbar flex-1">
          {/* Navigation items will be rendered client-side via AdminNav component */}
          <AdminNav />
        </nav>
        <div className="hidden md:block p-4 border-t border-gray-800">
          <Link
            href="/post"
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform"
          >
            <span>+</span> Upload Listing
          </Link>
        </div>
      </div>

      {/* Main Content */}
      {children}
    </div>
  );
}

function AdminNav() {
  return (
    <>
      {/* Client-side tab navigation would go here */}
      {/* For now, this is a placeholder. The actual tabs are managed in inbox/page.tsx */}
    </>
  );
}
