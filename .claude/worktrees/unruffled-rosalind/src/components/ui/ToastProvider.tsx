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
          boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
          border: "0.5px solid var(--uber-border)",
        },
        success: {
          iconTheme: { primary: "#06C167", secondary: "var(--uber-btn-text)" },
        },
        error: {
          iconTheme: { primary: "#FF4444", secondary: "var(--uber-btn-text)" },
        },
      }}
    />
  );
}
