"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePaystackScript, openPaystackPopup } from "@/lib/paystack";
import { sponsorProperty } from "@/lib/api";
import { SPONSOR_TIERS } from "@/lib/sponsor-tiers";
import type { SponsorTier } from "@/lib/types";

interface SponsorModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  propertyId: string;
  propertyType: "homes" | "hostels";
  propertyTitle: string;
  userEmail: string;
  userId: string;
}

export default function SponsorModal({
  open,
  onClose,
  onSuccess,
  propertyId,
  propertyType,
  propertyTitle,
  userEmail,
  userId,
}: SponsorModalProps) {
  usePaystackScript();
  const [selected, setSelected] = useState<SponsorTier | null>(null);
  const [processing, setProcessing] = useState(false);

  function handlePay() {
    const tier = SPONSOR_TIERS.find(t => t.tier === selected);
    if (!tier) return;
    setProcessing(true);

    openPaystackPopup({
      email: userEmail,
      amount: tier.pricePesewas,
      currency: "GHS",
      ref: `sponsor-${propertyId}-${Date.now()}`,
      metadata: {
        type: "sponsorship",
        property_id: propertyId,
        property_type: propertyType,
        tier: tier.tier,
      },
      onSuccess: async (reference) => {
        try {
          await sponsorProperty(
            propertyType,
            propertyId,
            tier.tier,
            tier.durationDays,
            reference,
            userId
          );
          onSuccess();
        } catch {
          alert("Payment received but sponsorship activation failed. Contact support.");
        } finally {
          setProcessing(false);
        }
      },
      onClose: () => setProcessing(false),
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl shadow-2xl flex flex-col"
            style={{ background: "var(--uber-white)", maxHeight: "85vh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--uber-surface2)" }} />
            </div>

            {/* Header */}
            <div className="px-5 py-3 shrink-0" style={{ borderBottom: "0.5px solid var(--uber-border)" }}>
              <h2 className="text-base font-bold" style={{ color: "var(--uber-text)" }}>
                <span style={{ color: "#D4AF37" }}>✦</span> Boost Your Listing
              </h2>
              <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--uber-muted)" }}>
                {propertyTitle}
              </p>
            </div>

            {/* Tiers */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {SPONSOR_TIERS.map(tier => (
                <button
                  key={tier.tier}
                  onClick={() => setSelected(tier.tier)}
                  className="w-full text-left rounded-2xl p-4 transition-all"
                  style={{
                    border: selected === tier.tier
                      ? "2px solid #D4AF37"
                      : "0.5px solid var(--uber-border)",
                    background: selected === tier.tier
                      ? "rgba(212,175,55,0.06)"
                      : "var(--uber-surface)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>
                        {tier.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>
                        {tier.durationDays} days
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold" style={{ color: "#D4AF37" }}>
                        GH₵{tier.price}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {tier.perks.map((perk, i) => (
                      <p key={i} className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--uber-muted)" }}>
                        <span style={{ color: "#06C167" }}>✓</span> {perk}
                      </p>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            {/* Pay button */}
            <div
              className="px-5 pt-4 shrink-0"
              style={{
                borderTop: "0.5px solid var(--uber-border)",
                paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 16px)",
              }}
            >
              <button
                onClick={handlePay}
                disabled={!selected || processing}
                className="w-full font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-base disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "#D4AF37", color: "#fff" }}
              >
                {processing && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {selected
                  ? `Pay GH₵${SPONSOR_TIERS.find(t => t.tier === selected)?.price}`
                  : "Select a plan"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
