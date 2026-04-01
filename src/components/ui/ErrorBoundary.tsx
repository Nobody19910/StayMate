"use client";
import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

function DefaultFallback({ onReset }: { onReset: () => void }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--uber-surface)",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "var(--uber-white)",
          border: "0.5px solid var(--uber-border)",
          borderRadius: "20px",
          padding: "40px 32px",
          maxWidth: "360px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
        }}
      >
        <div style={{ fontSize: "56px", lineHeight: 1, marginBottom: "20px" }}>
          🏠
        </div>

        <h2
          style={{
            color: "var(--uber-text)",
            fontSize: "20px",
            fontWeight: 700,
            fontFamily: "var(--font-inter)",
            margin: "0 0 10px",
          }}
        >
          Something went wrong
        </h2>

        <p
          style={{
            color: "var(--uber-muted)",
            fontSize: "14px",
            lineHeight: "1.5",
            margin: "0 0 28px",
          }}
        >
          Don&apos;t worry — your data is safe. Try refreshing the page.
        </p>

        <button
          onClick={() => window.location.reload()}
          style={{
            display: "block",
            width: "100%",
            padding: "13px 0",
            borderRadius: "12px",
            background: "var(--uber-green)",
            color: "var(--uber-white)",
            fontWeight: 600,
            fontSize: "15px",
            border: "none",
            cursor: "pointer",
            marginBottom: "14px",
          }}
        >
          Refresh page
        </button>

        <a
          href="/homes"
          style={{
            color: "var(--uber-muted)",
            fontSize: "13px",
            textDecoration: "none",
          }}
        >
          Go home
        </a>
      </div>
    </div>
  );
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("StayMate error boundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <DefaultFallback onReset={() => this.setState({ hasError: false })} />
        )
      );
    }
    return this.props.children;
  }
}
