"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function ProfileCornerButton() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user } = useAuth();

  if (pathname.startsWith("/profile")) return null;

  const initials = (profile?.fullName ?? user?.email ?? "?")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <button
      onClick={() => router.push("/profile")}
      className="fixed top-4 right-4 z-50 lg:hidden"
      aria-label="Profile"
    >
      {profile?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatarUrl}
          alt=""
          className="w-9 h-9 rounded-full object-cover border-2 shadow-md"
            style={{ borderColor: "var(--uber-white)" }}
        />
      ) : (
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-extrabold border-2 shadow-md" style={{ background: "var(--uber-black)", color: "var(--uber-white)", borderColor: "var(--uber-white)" }}>
          {initials}
        </div>
      )}
    </button>
  );
}
