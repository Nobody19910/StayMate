"use client";

import toast from "react-hot-toast";

interface Props {
  title: string;
  text?: string;
  url?: string;
  className?: string;
}

export default function ShareButton({ title, text, url, className = "" }: Props) {
  async function handleShare() {
    const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
    const shareData = { title, text: text || title, url: shareUrl };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          fallbackCopy(shareUrl);
        }
      }
    } else {
      fallbackCopy(shareUrl);
    }
  }

  function fallbackCopy(link: string) {
    navigator.clipboard.writeText(link).then(
      () => toast.success("Link copied!"),
      () => toast.error("Failed to copy link")
    );
  }

  return (
    <button
      onClick={handleShare}
      className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-all active:scale-90 ${className}`}
      style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}
      aria-label="Share property"
    >
      <svg className="w-4 h-4" style={{ color: "var(--uber-text)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
      </svg>
    </button>
  );
}
