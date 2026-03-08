"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/auth-context";

const ROLES: { value: UserRole; label: string; sub: string; icon: string }[] = [
  { value: "seeker", label: "Looking for a place", sub: "Browse homes & hostels", icon: "🔍" },
  { value: "owner", label: "I own property", sub: "List homes for rent or sale", icon: "🏠" },
  { value: "manager", label: "I manage a hostel", sub: "List rooms & manage bookings", icon: "🏫" },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"role" | "details" | "confirm">("role");
  const [role, setRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setError("");
    setLoading(true);

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${window.location.origin}/homes`,
      },
    });

    if (signupError) {
      setLoading(false);
      setError(signupError.message);
      return;
    }

    if (data.user && data.session) {
      // Email confirmation is OFF — user is immediately signed in
      await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName,
        phone: phone || null,
        role,
      });
      setLoading(false);
      router.push(role === "seeker" ? "/homes" : "/dashboard");
    } else {
      // Email confirmation is ON — show "check your email" screen
      setLoading(false);
      setStep("confirm");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white px-4 pt-14 pb-6 text-center border-b border-gray-100">
        <h1 className="text-2xl font-extrabold text-gray-900">StayMate</h1>
        <p className="text-xs text-gray-400 mt-0.5">No agents. No commission.</p>
      </div>

      <motion.div
        className="flex-1 px-4 py-8 max-w-sm mx-auto w-full"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {step === "confirm" ? (
          <div className="flex flex-col items-center text-center pt-8">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4 text-3xl">
              📧
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Check your email</h2>
            <p className="text-sm text-gray-500 mb-6">
              We sent a confirmation link to <span className="font-semibold text-gray-700">{email}</span>. Click it to activate your account and you&apos;ll be signed in automatically.
            </p>
            <Link
              href="/login"
              className="w-full block bg-emerald-500 text-white font-bold text-center py-3.5 rounded-2xl active:scale-95 transition-transform"
            >
              Go to Sign In
            </Link>
          </div>
        ) : step === "role" ? (
          <>
            <h2 className="text-xl font-extrabold text-gray-900 mb-1">Create an account</h2>
            <p className="text-sm text-gray-400 mb-6">How will you use StayMate?</p>
            <div className="space-y-3">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                    role === r.value
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="text-3xl">{r.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{r.label}</p>
                    <p className="text-[11px] text-gray-400">{r.sub}</p>
                  </div>
                  {role === r.value && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <button
              disabled={!role}
              onClick={() => setStep("details")}
              className="mt-6 w-full bg-emerald-500 text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-base"
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setStep("role")}
              className="flex items-center gap-1 text-sm text-gray-400 mb-5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Back
            </button>
            <h2 className="text-xl font-extrabold text-gray-900 mb-1">Your details</h2>
            <p className="text-sm text-gray-400 mb-6">Almost there!</p>
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Kwame Mensah"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233 20 123 4567"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password *</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-base"
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>
          </>
        )}

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-600 font-semibold">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
