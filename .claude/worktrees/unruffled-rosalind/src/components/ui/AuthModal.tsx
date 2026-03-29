"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"choose" | "email">("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setMode("choose");
    setEmail("");
    setPassword("");
    setError("");
    setLoading(false);
    setShowPassword(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSocialLogin(provider: "google" | "facebook") {
    const isNative =
      typeof (window as any).Capacitor !== "undefined" &&
      (window as any).Capacitor.isNativePlatform?.();

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: isNative
          ? "com.staymate.app://auth/callback"
          : `${window.location.origin}${window.location.pathname}`,
        skipBrowserRedirect: true,
      },
    });

    if (oauthError || !data.url) {
      setError(oauthError?.message || "OAuth failed");
      return;
    }

    window.location.assign(data.url);
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      handleClose();
      router.refresh();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl shadow-2xl flex flex-col"
            style={{ background: "var(--uber-white)", maxHeight: "85vh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: "var(--uber-surface2)" }}
              />
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {mode === "choose" ? (
                <>
                  {/* Header */}
                  <div className="text-center mb-6">
                    <h2
                      className="text-lg font-extrabold"
                      style={{ color: "var(--uber-text)" }}
                    >
                      Sign in to continue
                    </h2>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--uber-muted)" }}
                    >
                      Log in or create an account to book, save, and message.
                    </p>
                  </div>

                  {/* Social buttons */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => handleSocialLogin("google")}
                      className="w-full font-bold py-3.5 rounded-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-3"
                      style={{
                        background: "var(--uber-surface)",
                        border: "0.5px solid var(--uber-border)",
                        color: "var(--uber-text)",
                      }}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSocialLogin("facebook")}
                      className="w-full font-bold py-3.5 rounded-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-3"
                      style={{
                        background: "#1877F2",
                        color: "#FFFFFF",
                      }}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Continue with Facebook
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative flex items-center my-5">
                    <div
                      className="flex-grow"
                      style={{ borderTop: "0.5px solid var(--uber-border)" }}
                    />
                    <span
                      className="flex-shrink-0 mx-4 text-xs font-medium uppercase tracking-wider"
                      style={{ color: "var(--uber-muted)" }}
                    >
                      or
                    </span>
                    <div
                      className="flex-grow"
                      style={{ borderTop: "0.5px solid var(--uber-border)" }}
                    />
                  </div>

                  {/* Email sign in */}
                  <button
                    type="button"
                    onClick={() => setMode("email")}
                    className="w-full font-bold py-3.5 rounded-2xl active:scale-95 transition-all text-sm"
                    style={{
                      background: "var(--uber-btn-bg)",
                      color: "var(--uber-btn-text)",
                    }}
                  >
                    Sign in with Email
                  </button>

                  {/* Create account */}
                  <p
                    className="text-center text-sm mt-5"
                    style={{ color: "var(--uber-muted)" }}
                  >
                    Don&apos;t have an account?{" "}
                    <button
                      onClick={() => {
                        handleClose();
                        router.push("/signup");
                      }}
                      className="font-bold"
                      style={{ color: "#06C167" }}
                    >
                      Create Account
                    </button>
                  </p>
                </>
              ) : (
                <>
                  {/* Email login form */}
                  <button
                    onClick={() => { setMode("choose"); setError(""); }}
                    className="flex items-center gap-1 text-sm font-semibold mb-4"
                    style={{ color: "var(--uber-muted)" }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                    Back
                  </button>

                  <h2
                    className="text-lg font-extrabold mb-1"
                    style={{ color: "var(--uber-text)" }}
                  >
                    Sign in with email
                  </h2>
                  <p
                    className="text-xs mb-5"
                    style={{ color: "var(--uber-muted)" }}
                  >
                    Enter your email and password
                  </p>

                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div>
                      <input
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2"
                        style={{
                          border: "0.5px solid var(--uber-border)",
                          background: "var(--uber-surface)",
                          color: "var(--uber-text)",
                          focusRingColor: "var(--uber-border)",
                        }}
                      />
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2"
                        style={{
                          border: "0.5px solid var(--uber-border)",
                          background: "var(--uber-surface)",
                          color: "var(--uber-text)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--uber-muted)" }}
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>

                    {error && (
                      <div
                        className="rounded-xl px-3 py-2"
                        style={{
                          background: "rgba(239,68,68,0.08)",
                          border: "0.5px solid rgba(239,68,68,0.2)",
                        }}
                      >
                        <p className="text-xs font-medium" style={{ color: "#EF4444" }}>
                          {error}
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full font-bold py-3.5 rounded-2xl active:scale-95 transition-all disabled:opacity-60 text-base"
                      style={{
                        background: "var(--uber-btn-bg)",
                        color: "var(--uber-btn-text)",
                      }}
                    >
                      {loading ? "Signing in\u2026" : "Sign In"}
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* Safe area bottom padding */}
            <div
              style={{
                paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 16px)",
              }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
