"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push("/homes");
    }
  }

  async function handleSocialLogin(provider: 'google' | 'apple') {
    const isNative = typeof (window as any).Capacitor !== "undefined" &&
      (window as any).Capacitor.isNativePlatform?.();

    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: isNative
          ? "com.staymate.app://auth/callback"
          : `${window.location.origin}/homes`,
      },
    });
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="px-4 pt-14 pb-6 text-center" style={{ background: "var(--uber-white)", borderBottom: "0.5px solid var(--uber-border)" }}>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--uber-text)" }}>StayMate</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>Secure Managed Platform</p>
      </div>

      <motion.div
        className="flex-1 px-4 py-8 max-w-sm mx-auto w-full"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <h2 className="text-xl font-extrabold mb-1" style={{ color: "var(--uber-text)" }}>Welcome back</h2>
        <p className="text-sm mb-6" style={{ color: "var(--uber-muted)" }}>Sign in to your account</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
              style={{ border: "0.5px solid var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-text)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
                style={{ border: "0.5px solid var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-text)" }}
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

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <p className="text-xs text-red-600 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-bold py-3.5 rounded-2xl active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-base"
            style={{ background: "var(--uber-black)", color: "var(--uber-white)" }}
          >
            {loading ? "Signing in\u2026" : "Sign In"}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative flex items-center mb-4">
            <div className="flex-grow" style={{ borderTop: "0.5px solid var(--uber-border)" }}></div>
            <span className="flex-shrink-0 mx-4 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--uber-muted)" }}>or sign in with</span>
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
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold" style={{ color: "var(--uber-text)" }}>
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
