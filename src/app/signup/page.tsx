"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/auth-context";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "otp" | "confirm">("details");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authData, setAuthData] = useState<any>(null); // store signup success info
  const [termsAccepted, setTermsAccepted] = useState(false);

  async function handleSignupDetails(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: "seeker" as UserRole },
        emailRedirectTo: `${window.location.origin}/homes`,
      },
    });

    setLoading(false);
    if (signupError) {
      setError(signupError.message);
      return;
    }

    if (data.user && data.session) {
      // Auto sign-in happened (email conf OFF), go to OTP
      setAuthData(data);
      setStep("otp");
    } else {
      // Email confirmation is ON — skip OTP and show confirm screen
      setStep("confirm");
    }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (otp === "123456" && authData?.user) {
      // Profile now auto-creates via Postgres trigger on auth.users insert
      await supabase.from("profiles").update({
        phone: phone || null,
        consents: {
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          privacy_accepted: true,
          privacy_accepted_at: new Date().toISOString(),
        },
      }).eq("id", authData.user.id);
      setLoading(false);
      router.push("/homes");
    } else {
      setLoading(false);
      setError("Invalid OTP. Please use 123456 for testing.");
    }
  }

  async function handleSocialLogin(provider: 'google' | 'apple') {
    const isNative = typeof (window as any).Capacitor !== "undefined" &&
      (window as any).Capacitor.isNativePlatform?.();

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: isNative
          ? "com.staymate.app://auth/callback"
          : `${window.location.origin}/homes`,
        skipBrowserRedirect: true,
      },
    });

    if (oauthError || !data.url) {
      setError(oauthError?.message || "OAuth failed");
      return;
    }

    window.location.assign(data.url);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      <div className="px-4 pb-6 text-center" style={{ paddingTop: "calc(env(safe-area-inset-top, 20px) + 12px)", background: "var(--uber-white)", borderBottom: "0.5px solid var(--uber-border)" }}>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--uber-text)" }}>StayMate</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>Secure Managed Platform</p>
      </div>

      <motion.div
        className="flex-1 px-4 py-8 max-w-sm mx-auto w-full"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {step === "confirm" ? (
          <div className="flex flex-col items-center text-center pt-8">
            <div className="w-16 h-16 rounded-full bg-[#06C167]/10 flex items-center justify-center mb-4 text-3xl">📧</div>
            <h2 className="text-xl font-extrabold mb-2" style={{ color: "var(--uber-text)" }}>Check your email</h2>
            <p className="text-sm mb-6" style={{ color: "var(--uber-muted)" }}>
              We sent a confirmation link to <span className="font-semibold" style={{ color: "var(--uber-text)" }}>{email}</span>. Click it to activate your account.
            </p>
            <Link
              href="/login"
              className="w-full block font-bold text-center py-3.5 rounded-2xl active:scale-95 transition-transform"
              style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
            >
              Go to Sign In
            </Link>
          </div>
        ) : step === "otp" ? (
          <div className="flex flex-col text-center pt-8">
            <div className="w-16 h-16 rounded-full bg-[#06C167]/10 flex items-center justify-center mb-4 text-3xl mx-auto">
              📱
            </div>
            <h2 className="text-xl font-extrabold mb-2" style={{ color: "var(--uber-text)" }}>Verify Your Number</h2>
            <p className="text-sm mb-6" style={{ color: "var(--uber-muted)" }}>
              A code has been sent to your phone. Use <span className="font-bold">123456</span> to proceed.
            </p>

            <form onSubmit={handleOtp} className="space-y-4">
              <div>
                <input
                  required
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full rounded-xl px-3 py-4 text-center font-mono text-xl font-black focus:outline-none focus:ring-2 focus:ring-black/20 tracking-widest"
                  style={{ border: "0.5px solid var(--uber-border)", color: "var(--uber-text)", background: "var(--uber-white)" }}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full block font-bold text-center py-3.5 rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
                style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
              >
                {loading ? "Verifying..." : "Verify Number"}
              </button>
            </form>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-extrabold mb-1" style={{ color: "var(--uber-text)" }}>Create an account</h2>
            <p className="text-sm mb-6" style={{ color: "var(--uber-muted)" }}>Welcome to StayMate HQ</p>

            <form onSubmit={handleSignupDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Kwame Mensah"
                  className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
                  style={{ border: "0.5px solid var(--uber-border)", color: "var(--uber-text)", background: "var(--uber-white)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Phone *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233 20 123 4567"
                  className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
                  style={{ border: "0.5px solid var(--uber-border)", color: "var(--uber-text)", background: "var(--uber-white)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Email *</label>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
                  style={{ border: "0.5px solid var(--uber-border)", color: "var(--uber-text)", background: "var(--uber-white)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
                    style={{ border: "0.5px solid var(--uber-border)", color: "var(--uber-text)", background: "var(--uber-white)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
                    style={{ color: "var(--uber-muted)" }}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#06C167] focus:ring-black/20"
                  style={{ borderColor: "var(--uber-border)" }}
                />
                <span className="text-xs" style={{ color: "var(--uber-muted)" }}>
                  I agree to the <span className="text-[#06C167] font-semibold">Terms of Service</span> and <span className="text-[#06C167] font-semibold">Privacy Policy</span>, including data collection and processing.
                </span>
              </label>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !termsAccepted}
                className="w-full font-bold py-3.5 rounded-2xl active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-base"
                style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
              >
                {loading ? "Sending OTP…" : "Continue"}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative flex items-center mb-4">
                <div className="flex-grow" style={{ borderTop: "0.5px solid var(--uber-border)" }}></div>
                <span className="flex-shrink-0 mx-4 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--uber-muted)" }}>or sign up with</span>
                <div className="flex-grow" style={{ borderTop: "0.5px solid var(--uber-border)" }}></div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  className="flex-1 font-bold py-3 rounded-xl active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                  style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", color: "var(--uber-text)" }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialLogin('apple')}
                  className="flex-1 font-bold py-3 rounded-xl active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                  style={{ background: "var(--uber-black)", border: "0.5px solid var(--uber-black)", color: "var(--uber-white)" }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.71 5.46a3.81 3.81 0 00.93-2.61c0-.18-.03-.36-.06-.54a3.9 3.9 0 00-2.65 1.35 3.73 3.73 0 00-.97 2.51c0 .2.02.4.06.6a3.53 3.53 0 002.69-1.31zm-2.45 1.4c-2.07 0-3.5 1.15-4.51 1.15s-2.01-1.07-3.66-1.11c-2.12-.05-4.1 1.25-5.2 3.14-2.22 3.84-.57 9.53 1.58 12.63 1.05 1.52 2.3 3.23 3.96 3.17 1.59-.06 2.2-.98 4.14-.98 1.93 0 2.51.98 4.16.95 1.7-.03 2.76-1.53 3.79-3.04 1.19-1.74 1.68-3.41 1.7-3.49-.04-.01-3.23-1.29-3.27-4.99-.03-3.11 2.5-4.66 2.61-4.73-1.46-2.19-3.75-2.43-4.58-2.49-1.92-.22-3.83 1.05-4.91 1.05z" />
                  </svg>
                  Apple
                </button>
              </div>
            </div>

            <p className="text-center text-sm mt-6" style={{ color: "var(--uber-muted)" }}>
              Already have an account?{" "}
              <Link href="/login" className="font-semibold" style={{ color: "var(--uber-text)" }}>
                Sign in
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
