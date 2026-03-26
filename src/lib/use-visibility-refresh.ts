"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Jiji-style data refresh: refetches when the browser tab regains focus
 * or when the user navigates back (visibilitychange + focus events).
 *
 * @param refetchFn  — async function to call on refresh
 * @param opts.minInterval — minimum ms between refreshes (default 30s)
 * @param opts.enabled — whether the hook is active (default true)
 */
export function useVisibilityRefresh(
  refetchFn: () => void | Promise<void>,
  opts: { minInterval?: number; enabled?: boolean } = {}
) {
  const { minInterval = 30_000, enabled = true } = opts;
  const lastRefresh = useRef(Date.now());
  const fn = useRef(refetchFn);
  fn.current = refetchFn;

  const maybeRefresh = useCallback(() => {
    if (Date.now() - lastRefresh.current < minInterval) return;
    lastRefresh.current = Date.now();
    fn.current();
  }, [minInterval]);

  useEffect(() => {
    if (!enabled) return;

    const onVisibility = () => {
      if (document.visibilityState === "visible") maybeRefresh();
    };

    const onFocus = () => maybeRefresh();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, maybeRefresh]);
}
