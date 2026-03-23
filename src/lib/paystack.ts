// Hook to load the Paystack inline script on demand
import { useEffect } from "react";

export function usePaystackScript() {
  useEffect(() => {
    if (document.getElementById("paystack-script")) return;
    const script = document.createElement("script");
    script.id = "paystack-script";
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      // intentionally not removing — once loaded, keep it
    };
  }, []);
}

interface PaystackOptions {
  email: string;
  amount: number; // in kobo/pesewas (smallest unit × 100)
  currency?: string;
  ref?: string;
  channels?: string[];
  metadata?: Record<string, unknown>;
  onSuccess: (reference: string) => void;
  onClose: () => void;
}

export function openPaystackPopup(options: PaystackOptions) {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_KEY;
  if (!publicKey) {
    alert("Paystack public key not configured.");
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PaystackPop = (window as any).PaystackPop;
  if (!PaystackPop) {
    alert("Paystack not loaded. Please refresh and try again.");
    return;
  }

  const ref = options.ref ?? `staymate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const handler = PaystackPop.setup({
    key: publicKey,
    email: options.email,
    amount: options.amount,
    currency: options.currency ?? "GHS",
    ref,
    channels: options.channels ?? ["card", "mobile_money"],
    metadata: options.metadata ?? {},
    callback: (response: { reference: string }) => {
      options.onSuccess(response.reference);
    },
    onClose: () => {
      options.onClose();
    },
  });

  handler.openIframe();
}
