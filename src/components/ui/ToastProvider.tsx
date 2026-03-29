"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-center"
      containerStyle={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
      toastOptions={{
        duration: 2500,
        style: {
          background: "var(--uber-btn-bg)",
          color: "var(--uber-btn-text)",
          fontSize: "13px",
          fontWeight: 600,
          borderRadius: "12px",
          padding: "10px 16px",
          boxShadow: "var(--shadow-lg)",
          border: "0.5px solid var(--uber-border)",
        },
        success: {
          iconTheme: { primary: "var(--uber-green)", secondary: "var(--uber-btn-text)" },
        },
        error: {
          iconTheme: { primary: "var(--error-text)", secondary: "var(--uber-btn-text)" },
        },
      }}
    />
  );
}
