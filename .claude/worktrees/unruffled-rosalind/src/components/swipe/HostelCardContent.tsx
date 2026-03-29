import type { Hostel } from "@/lib/types";
import Image from "next/image";

interface Props {
  hostel: Hostel;
}

export default function HostelCardContent({ hostel }: Props) {
  const occupancyPct = Math.round(
    ((hostel.totalRooms - hostel.availableRooms) / hostel.totalRooms) * 100
  );

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-white flex flex-col">
      {/* Photo */}
      <div className="relative flex-1">
        <Image
          src={hostel.images[0]}
          alt={hostel.name}
          fill
          className="object-cover"
          sizes="(max-width: 480px) 100vw, 480px"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Student badge */}
        <div className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
          STUDENT HOSTEL
        </div>

        {/* Availability pill */}
        <div
          className={`absolute top-4 right-4 text-white text-xs font-bold px-2 py-1 rounded-full ${
            hostel.availableRooms > 0 ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {hostel.availableRooms > 0
            ? `${hostel.availableRooms} rooms left`
            : "Fully booked"}
        </div>

        {/* Nearby universities (on photo) */}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white/80 text-xs font-medium truncate">
            Near: {hostel.nearbyUniversities[0]}
          </p>
        </div>
      </div>

      {/* Info strip */}
      <div className="px-4 py-3 bg-white">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">{hostel.name}</h2>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {hostel.address}, {hostel.city}
            </p>
          </div>
          <span className="text-sm font-extrabold text-blue-600 whitespace-nowrap">
            {hostel.priceRangeLabel}
          </span>
        </div>

        {/* Occupancy bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{hostel.availableRooms} of {hostel.totalRooms} rooms available</span>
            <span>{occupancyPct}% full</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-blue-600 font-semibold mt-2">
          Tap to browse rooms · swipe right to save
        </p>
      </div>
    </div>
  );
}
