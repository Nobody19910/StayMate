"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const ROLE_LABELS: Record<string, string> = {
  seeker: "Property Seeker",
  owner: "Property Owner",
  manager: "Hostel Manager",
};

export default function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse w-16 h-16 bg-gray-200 rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white px-4 pt-12 pb-6 flex flex-col items-center border-b border-gray-100">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center mb-3">
            <span className="text-white text-2xl font-extrabold">?</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Welcome to StayMate</h1>
          <p className="text-sm text-gray-400 mt-0.5">Sign in to access your account</p>
        </div>
        <div className="px-4 py-6 space-y-3">
          <Link
            href="/login"
            className="block bg-emerald-500 text-white font-bold text-center py-3.5 rounded-2xl active:scale-95 transition-transform"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="block border-2 border-emerald-500 text-emerald-600 font-bold text-center py-3.5 rounded-2xl active:scale-95 transition-transform"
          >
            Create Account
          </Link>
          <div className="bg-emerald-50 rounded-xl px-4 py-3 mt-4">
            <p className="text-xs text-emerald-700 font-medium text-center">
              No agents. No commission. List your own property or find your next home directly from owners.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const initials = (profile?.fullName ?? user.email ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="bg-white px-4 pt-12 pb-6 flex flex-col items-center border-b border-gray-100">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center mb-3">
          <span className="text-white text-2xl font-extrabold">{initials}</span>
        </div>
        <h1 className="text-lg font-bold text-gray-900">{profile?.fullName ?? "Your Account"}</h1>
        {profile && (
          <span className="mt-1 text-[11px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
            {ROLE_LABELS[profile.role] ?? profile.role}
          </span>
        )}
        <p className="text-xs text-gray-400 mt-1">{user.email}</p>
      </div>

      <div className="px-4 py-6 space-y-3">
        {(profile?.role === "owner" || profile?.role === "manager") && (
          <Link
            href="/dashboard"
            className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 active:scale-95 transition-transform"
          >
            <span className="text-xl">📊</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">My Dashboard</p>
              <p className="text-xs text-gray-400">Manage listings &amp; bookings</p>
            </div>
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}

        <Link
          href="/post"
          className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 active:scale-95 transition-transform"
        >
          <span className="text-xl">➕</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Post a Listing</p>
            <p className="text-xs text-gray-400">List a home or hostel room</p>
          </div>
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>

        <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100">
          <span className="text-xl">📞</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Phone</p>
            <p className="text-xs text-gray-400">{profile?.phone ?? "Not set"}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100">
          <span className="text-xl">ℹ️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">About StayMate</p>
            <p className="text-xs text-gray-400">No agents. No commission.</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full mt-2 border-2 border-red-200 text-red-500 font-bold py-3 rounded-2xl active:scale-95 transition-transform text-sm"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
