"use client";

import { useState, useEffect } from "react";

const DEFAULT_LAT = 5.6037;
const DEFAULT_LNG = -0.1870;

export interface UserLocation {
  lat: number;
  lng: number;
}

export function useUserLocation() {
  const [loc, setLoc] = useState<UserLocation>({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [denied, setDenied] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let watchId: number | undefined;

    async function init() {
      try {
        const isNative =
          typeof (window as any).Capacitor !== "undefined" &&
          (window as any).Capacitor.isNativePlatform?.();

        if (isNative) {
          const { Geolocation } = await import("@capacitor/geolocation");
          const perm = await Geolocation.requestPermissions();
          if (perm.location === "denied") {
            setDenied(true);
            setResolved(true);
            return;
          }
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
          setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setResolved(true);
        } else if (navigator.geolocation) {
          // Check permission state first (if API available)
          if (navigator.permissions) {
            const status = await navigator.permissions.query({ name: "geolocation" });
            if (status.state === "denied") {
              setDenied(true);
              setResolved(true);
              return;
            }
            // Listen for future permission changes
            status.addEventListener("change", () => {
              if (status.state === "denied") {
                setDenied(true);
              } else if (status.state === "granted") {
                setDenied(false);
                navigator.geolocation.getCurrentPosition(
                  (p) => setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
                );
              }
            });
          }

          // Use watchPosition for continuous updates
          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              setDenied(false);
              setResolved(true);
            },
            (err) => {
              if (err.code === err.PERMISSION_DENIED) setDenied(true);
              setResolved(true);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
          );
        } else {
          setResolved(true);
        }
      } catch {
        setResolved(true);
      }
    }

    init();

    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return { loc, denied, resolved };
}
