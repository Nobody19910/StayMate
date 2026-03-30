"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { evaluatePassword, isPasswordValid } from "@/lib/password-utils";

export default function SetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setEmail(user.email ?? "");
      // Check if the user already has an email/password identity
      const identities = user.identities ?? [];
      const hasEmailIdentity = identities.some((i) => i.provider === "email");
      if (hasEmailIdentity) {
        // Already has a password — skip straight to homes
        router.replace("/homes");
      } else {
        setNeedsPassword(true);
        setChecking(false);
      }
    }
    check();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isPasswordValid(password)) { setError("Password is too weak. Please meet all the requirements."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      router.replace("/homes");
    }
  }

  if (checking || !needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: "var(--uber-border)", borderTopColor: "var(--uber-green)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      <div className="px-4 pt-14 pb-6 text-center" style={{ background: "var(--uber-white)", borderBottom: "0.5px solid var(--uber-border)" }}>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--uber-text)" }}>StayMate</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>One last step</p>
      </div>

      <motion.div
        className="flex-1 px-4 py-8 max-w-sm mx-auto w-full"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <h2 className="text-xl font-extrabold mb-1" style={{ color: "var(--uber-text)" }}>Set a password</h2>
        <p className="text-sm mb-6" style={{ color: "var(--uber-muted)" }}>
          You signed in with Google ({email}). Set a password so you can also log in with your email and password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>New Password</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
              style={{ border: "0.5px solid var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-text)" }}
            />
            {password && (() => {
              const strength = evaluatePassword(password);
              return (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden flex gap-0.5" style={{ background: "var(--uber-surface2)" }}>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex-1 h-full rounded-full transition-all" style={{ background: strength.score >= i ? strength.color : "transparent" }} />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                  {strength.errors.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {strength.errors.map(err => (
                        <span key={err} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>{err}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Confirm Password</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
              style={{ border: "0.5px solid var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-text)" }}
            />
          </div>

          {error && (
            <div className="rounded-xl px-3 py-2" style={{ background: "var(--error-bg, #fef2f2)", border: "0.5px solid var(--error-border, #fecaca)" }}>
              <p className="text-xs font-medium" style={{ color: "var(--error-text, #dc2626)" }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-bold py-3.5 rounded-2xl active:scale-95 transition-all disabled:opacity-60 text-base"
            style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
          >
            {loading ? "Saving…" : "Save Password & Continue"}
          </button>

          <button type="button" onClick={() => router.replace("/homes")}
            className="w-full text-sm text-center" style={{ color: "var(--uber-muted)" }}>
            Skip for now
          </button>
        </form>
      </motion.div>
    </div>
  );
}
