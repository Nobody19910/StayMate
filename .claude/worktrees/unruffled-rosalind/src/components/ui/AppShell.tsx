"use client";

import { useState, useCallback } from "react";
import SplashScreen from "./SplashScreen";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash once in the app's lifetime (localStorage persists forever)
    if (typeof window !== "undefined") {
      return !localStorage.getItem("staymate_splash_done");
    }
    return true;
  });

  const handleFinish = useCallback(() => {
    localStorage.setItem("staymate_splash_done", "1");
    setShowSplash(false);
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleFinish} />}
      {children}
    </>
  );
}
