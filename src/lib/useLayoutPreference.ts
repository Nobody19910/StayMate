"use client";

import { useState, useEffect } from "react";

type Layout = "swipe" | "grid";
const STORAGE_KEY = "staymate-layout";
const EVENT = "staymate:layout-changed";

export function useLayoutPreference(): [Layout, (l: Layout) => void] {
  const [layout, setLayoutState] = useState<Layout>("swipe");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "grid" || stored === "swipe") setLayoutState(stored);

    function onchange() {
      const val = localStorage.getItem(STORAGE_KEY);
      if (val === "grid" || val === "swipe") setLayoutState(val);
    }
    window.addEventListener(EVENT, onchange);
    return () => window.removeEventListener(EVENT, onchange);
  }, []);

  function setLayout(l: Layout) {
    localStorage.setItem(STORAGE_KEY, l);
    window.dispatchEvent(new Event(EVENT));
  }

  return [layout, setLayout];
}
