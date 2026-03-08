"use client";

import { useState, useEffect } from "react";
import { getSavedByType } from "./saved-store";

export function useSavedCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function update() {
      setCount(getSavedByType("home").length + getSavedByType("hostel").length);
    }
    update();
    window.addEventListener("staymate:saved-changed", update);
    return () => window.removeEventListener("staymate:saved-changed", update);
  }, []);

  return count;
}
