"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const ID_TYPES = ["Ghana Card (NIA)", "Voter ID", "Passport", "Driver's License", "SSNIT Card"];

const STEPS = ["Personal Info", "ID Document", "Selfie", "Review"] as const;
type Step = 0 | 1 | 2 | 3;

async function uploadFile(file: File, userId: string, path: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("userId", userId);
  fd.append("path", path);
  const res = await fetch("/api/upload-image", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || "Upload failed");
  return json.url;
}

export default function AgentApplyPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>(0);

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idType, setIdType] = useState(ID_TYPES[0]);
  const [idNumber, setIdNumber] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  function pickFile(ref: React.RefObject<HTMLInputElement | null>) {
    ref.current?.click();
  }

  function handleIdFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setIdFile(f);
    setIdPreview(URL.createObjectURL(f));
  }

  function handleSelfieFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setSelfieFile(f);
    setSelfiePreview(URL.createObjectURL(f));
  }

  function canProceed() {
    if (step === 0) return fullName.trim().length >= 3 && phone.trim().length >= 9;
    if (step === 1) return !!idFile && idNumber.trim().length >= 4;
    if (step === 2) return !!selfieFile;
    return true;
  }

  async function handleSubmit() {
    if (!profile) { router.push("/login"); return; }
    setUploading(true);
    setError("");
    try {
      const ts = Date.now();
      const idUrl = await uploadFile(idFile!, profile.id, `agent-kyc/${profile.id}/id_${ts}`);
      const selfieUrl = await uploadFile(selfieFile!, profile.id, `agent-kyc/${profile.id}/selfie_${ts}`);

      const { error: dbErr } = await supabase.from("agent_applications").insert({
        user_id: profile.id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        id_type: idType,
        id_number: idNumber.trim(),
        id_photo_url: idUrl,
        selfie_url: selfieUrl,
        status: "pending",
      });

      if (dbErr) throw dbErr;
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Submission failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--uber-surface)" }}>
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--uber-green)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: "var(--uber-surface)" }}>
        <p className="text-base font-semibold text-center" style={{ color: "var(--uber-text)" }}>You need to be signed in to apply as a concierge agent.</p>
        <Link href="/login" className="px-6 py-2.5 rounded-xl font-bold text-sm" style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>Sign In</Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6" style={{ background: "var(--uber-surface)" }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ background: "rgba(6,193,103,0.12)" }}>✓</div>
        <div className="text-center space-y-2 max-w-sm">
          <h2 className="text-xl font-extrabold" style={{ color: "var(--uber-text)" }}>Application Submitted</h2>
          <p className="text-sm" style={{ color: "var(--uber-muted)" }}>We'll review your ID and selfie within 1–2 business days. You'll be notified once approved.</p>
        </div>
        <Link href="/homes" className="px-6 py-2.5 rounded-xl font-bold text-sm" style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>Back to Listings</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--uber-surface)" }}>

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-5" style={{ height: 56, background: "var(--uber-white)", borderBottom: "0.5px solid var(--uber-border)" }}>
        <Link href="/homes" className="flex items-center gap-1 text-sm font-bold" style={{ color: "var(--uber-muted)" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>
        <span className="font-extrabold text-base" style={{ color: "var(--uber-text)" }}>Become a Concierge</span>
        <span className="text-xs font-semibold" style={{ color: "var(--uber-muted)" }}>{step + 1} / {STEPS.length}</span>
      </header>

      {/* Progress bar */}
      <div className="h-1" style={{ background: "var(--uber-surface2)" }}>
        <div className="h-1 transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: "var(--uber-green)" }} />
      </div>

      <div className="max-w-lg mx-auto px-5 pt-8 space-y-6">

        {/* Step label */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--uber-green)" }}>Step {step + 1} — {STEPS[step]}</p>
          {step === 0 && <h1 className="text-2xl font-extrabold" style={{ color: "var(--uber-text)" }}>Tell us about yourself</h1>}
          {step === 1 && <h1 className="text-2xl font-extrabold" style={{ color: "var(--uber-text)" }}>Upload your ID document</h1>}
          {step === 2 && <h1 className="text-2xl font-extrabold" style={{ color: "var(--uber-text)" }}>Take a selfie</h1>}
          {step === 3 && <h1 className="text-2xl font-extrabold" style={{ color: "var(--uber-text)" }}>Review & Submit</h1>}
        </div>

        {/* ── STEP 0: Personal Info ── */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest block mb-1.5" style={{ color: "var(--uber-muted)" }}>Full name (as it appears on ID)</label>
              <input
                autoFocus
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Kwame Mensah"
                className="w-full px-4 py-3 rounded-xl text-base font-medium outline-none"
                style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", color: "var(--uber-text)" }}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest block mb-1.5" style={{ color: "var(--uber-muted)" }}>Phone number</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+233 XX XXX XXXX"
                className="w-full px-4 py-3 rounded-xl text-base font-medium outline-none"
                style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", color: "var(--uber-text)" }}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest block mb-1.5" style={{ color: "var(--uber-muted)" }}>Email address (optional)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl text-base font-medium outline-none"
                style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", color: "var(--uber-text)" }}
              />
            </div>
          </div>
        )}

        {/* ── STEP 1: ID Document ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest block mb-1.5" style={{ color: "var(--uber-muted)" }}>ID type</label>
              <div className="grid grid-cols-2 gap-2">
                {ID_TYPES.map(t => (
                  <button key={t} onClick={() => setIdType(t)}
                    className="px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all"
                    style={idType === t
                      ? { background: "rgba(6,193,103,0.12)", border: "1.5px solid var(--uber-green)", color: "var(--uber-green)" }
                      : { background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", color: "var(--uber-text)" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest block mb-1.5" style={{ color: "var(--uber-muted)" }}>ID number</label>
              <input
                value={idNumber}
                onChange={e => setIdNumber(e.target.value)}
                placeholder="GHA-XXXXXXXXX-X"
                className="w-full px-4 py-3 rounded-xl text-base font-medium outline-none"
                style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", color: "var(--uber-text)" }}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest block mb-1.5" style={{ color: "var(--uber-muted)" }}>Photo of ID (front)</label>
              <input ref={idInputRef} type="file" accept="image/*" className="hidden" onChange={handleIdFile} />
              {idPreview ? (
                <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={idPreview} alt="ID preview" className="w-full h-full object-cover" />
                  <button onClick={() => pickFile(idInputRef)} className="absolute bottom-3 right-3 text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>Retake</button>
                </div>
              ) : (
                <button onClick={() => pickFile(idInputRef)} className="w-full flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-dashed transition-colors"
                  style={{ border: "1.5px dashed var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-muted)" }}>
                  <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                  <span className="text-sm font-semibold">Tap to upload ID photo</span>
                  <span className="text-xs">JPG, PNG — max 10MB</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: Selfie ── */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--uber-muted)" }}>Take or upload a clear photo of your face. Make sure it's well-lit and your face is fully visible — no sunglasses or hats.</p>
            <input ref={selfieInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleSelfieFile} />
            {selfiePreview ? (
              <div className="relative mx-auto rounded-2xl overflow-hidden" style={{ width: 240, height: 300 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selfiePreview} alt="Selfie preview" className="w-full h-full object-cover" />
                <button onClick={() => pickFile(selfieInputRef)} className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1.5 rounded-lg whitespace-nowrap" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>Retake selfie</button>
              </div>
            ) : (
              <button onClick={() => pickFile(selfieInputRef)} className="w-full flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border-dashed transition-colors"
                style={{ border: "1.5px dashed var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-muted)" }}>
                <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>
                <span className="text-sm font-semibold">Tap to take or upload selfie</span>
                <span className="text-xs">Face must be clearly visible</span>
              </button>
            )}
          </div>
        )}

        {/* ── STEP 3: Review ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "0.5px solid var(--uber-border)" }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--uber-muted)" }}>Personal Info</p>
              </div>
              <div className="px-4 py-3 space-y-2 text-sm" style={{ color: "var(--uber-text)" }}>
                <div className="flex justify-between"><span style={{ color: "var(--uber-muted)" }}>Name</span><span className="font-semibold">{fullName}</span></div>
                <div className="flex justify-between"><span style={{ color: "var(--uber-muted)" }}>Phone</span><span className="font-semibold">{phone}</span></div>
                {email && <div className="flex justify-between"><span style={{ color: "var(--uber-muted)" }}>Email</span><span className="font-semibold">{email}</span></div>}
              </div>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "0.5px solid var(--uber-border)" }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--uber-muted)" }}>ID Document</p>
              </div>
              <div className="px-4 py-3 space-y-2 text-sm" style={{ color: "var(--uber-text)" }}>
                <div className="flex justify-between"><span style={{ color: "var(--uber-muted)" }}>Type</span><span className="font-semibold">{idType}</span></div>
                <div className="flex justify-between"><span style={{ color: "var(--uber-muted)" }}>Number</span><span className="font-semibold">{idNumber}</span></div>
              </div>
              {idPreview && (
                <div className="px-4 pb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={idPreview} alt="ID" className="w-full rounded-lg object-cover" style={{ maxHeight: 160 }} />
                </div>
              )}
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "0.5px solid var(--uber-border)" }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--uber-muted)" }}>Selfie</p>
              </div>
              {selfiePreview && (
                <div className="p-4 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selfiePreview} alt="Selfie" className="rounded-xl object-cover" style={{ width: 160, height: 200 }} />
                </div>
              )}
            </div>
            <p className="text-xs text-center" style={{ color: "var(--uber-muted)" }}>
              By submitting, you confirm that all information is accurate. StayMate will review your application within 1–2 business days.
            </p>
            {error && <p className="text-sm font-semibold text-center" style={{ color: "#ef4444" }}>{error}</p>}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <button onClick={() => setStep((s) => (s - 1) as Step)}
              className="flex-1 py-3.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-80"
              style={{ background: "var(--uber-surface2)", color: "var(--uber-text)" }}>
              Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={!canProceed()}
              className="flex-1 py-3.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>
              Continue
            </button>
          ) : (
            <button onClick={handleSubmit}
              disabled={uploading}
              className="flex-1 py-3.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--uber-green)", color: "#fff" }}>
              {uploading ? "Submitting…" : "Submit Application"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
