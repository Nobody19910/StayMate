"use client";

import { useEffect, useState } from "react";

export default function DistanceBadge({ lat, lng }: { lat?: number; lng?: number }) {
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  useEffect(() => {
    if (!lat || !lng || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const toRad = (d: number) => (d * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(lat - pos.coords.latitude);
        const dLng = toRad(lng - pos.coords.longitude);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(pos.coords.latitude)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
        setDistanceKm(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      },
      undefined,
      { timeout: 6000 }
    );
  }, [lat, lng]);

  if (distanceKm === null) return null;

  return (
    <span className="text-[10px] font-bold bg-black/5 text-black border border-black/10 px-2 py-0.5 rounded-full">
      📍 {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m away` : `${distanceKm.toFixed(1)}km away`}
    </span>
  );
}
