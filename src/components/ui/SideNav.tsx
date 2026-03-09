"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSavedCount } from "@/lib/useSavedCount";
import { useAuth } from "@/lib/auth-context";

const baseTabs = [
  { href: "/homes", label: "Homes", icon: HomeIcon },
  { href: "/hostels", label: "Hostels", icon: HostelIcon },
  { href: "/saved", label: "Saved", icon: HeartIcon },
  { href: "/profile", label: "Profile", icon: ProfileIcon },
];

export default function SideNav() {
  const pathname = usePathname();
  const savedCount = useSavedCount();
  const { profile } = useAuth();
  
  const isAdmin = profile?.role === "admin";
  
  const tabs = [
    baseTabs[0],
    baseTabs[1],
    isAdmin 
      ? { href: "/admin", label: "Manage", icon: ManageIcon }
      : { href: "/post", label: "Partner", icon: PostIcon },
    { href: "/chat", label: "Chat", icon: ChatIcon },
    baseTabs[2],
    baseTabs[3],
  ];

  return (
    <nav className="flex flex-col h-full bg-white border-r border-gray-100 px-4 py-8">
      {/* Logo */}
      <div className="mb-10 px-2">
        <span className="text-xl font-extrabold text-gray-900">StayMate</span>
        <p className="text-[10px] text-gray-400 mt-0.5">No agents. No commission.</p>
      </div>

      {/* Nav links */}
      <div className="flex flex-col gap-1 flex-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          const isSaved = href === "/saved";
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                active
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <div className="relative">
                <Icon active={active} />
                {isSaved && savedCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {savedCount > 99 ? "99+" : savedCount}
                  </span>
                )}
              </div>
              {label}
            </Link>
          );
        })}
      </div>

      {/* Keyboard hint */}
      <div className="mt-auto px-2 pt-6 border-t border-gray-100">
        <p className="text-[10px] text-gray-300 leading-relaxed">
          Keyboard shortcuts<br />
          <span className="font-mono">←</span> skip &nbsp;·&nbsp;
          <span className="font-mono">→</span> save &nbsp;·&nbsp;
          <span className="font-mono">↑</span> open
        </p>
      </div>
    </nav>
  );
}

function ManageIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
       <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0 0H4.5m-1.5 6h18m-18 6h18m-3-6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 0H4.5m10.5 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 0H4.5" />
    </svg>
  );
}

function PostIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
       <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.5 1.5 0 012.092 0L22.25 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}
function HostelIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}
function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  );
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}
function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}
