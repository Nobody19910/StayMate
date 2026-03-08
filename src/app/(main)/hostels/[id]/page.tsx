import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getHostelById } from "@/lib/api";
import type { Room, RoomAmenity } from "@/lib/types";

const AMENITY_LABELS: Record<RoomAmenity, { label: string; emoji: string }> = {
  wifi: { label: "WiFi", emoji: "📶" },
  ac: { label: "A/C", emoji: "❄️" },
  "attached-bath": { label: "En-suite", emoji: "🚿" },
  "hot-water": { label: "Hot Water", emoji: "🔥" },
  laundry: { label: "Laundry", emoji: "🧺" },
  "study-desk": { label: "Study Desk", emoji: "🪑" },
  wardrobe: { label: "Wardrobe", emoji: "🚪" },
  balcony: { label: "Balcony", emoji: "🏞️" },
  "meal-included": { label: "Meals", emoji: "🍽️" },
  security: { label: "Security", emoji: "🔒" },
  cctv: { label: "CCTV", emoji: "📷" },
  generator: { label: "Generator", emoji: "⚡" },
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  single: "Single",
  double: "Double",
  triple: "Triple",
  quad: "Quad",
  dormitory: "Dormitory",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function HostelRoomPickerPage({ params }: Props) {
  const { id } = await params;
  const hostel = await getHostelById(id);
  if (!hostel) notFound();

  const availableRooms = hostel.rooms.filter((r) => r.available);
  const unavailableRooms = hostel.rooms.filter((r) => !r.available);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero image + back button */}
      <div className="relative h-56">
        <Image
          src={hostel.images[0]}
          alt={hostel.name}
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/20" />
        <Link
          href="/hostels"
          className="absolute top-12 left-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="absolute bottom-4 left-4 right-4">
          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">STUDENT HOSTEL</span>
          <h1 className="text-white text-xl font-extrabold mt-1 drop-shadow">{hostel.name}</h1>
          <p className="text-white/80 text-xs">{hostel.address}, {hostel.city}</p>
        </div>
      </div>

      {/* Hostel meta */}
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{hostel.availableRooms} of {hostel.totalRooms} rooms available</span>
          <span>•</span>
          <span>{hostel.priceRangeLabel}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Near: {hostel.nearbyUniversities.join(", ")}</p>
      </div>

      {/* Room list */}
      <div className="px-4 py-5">
        <h2 className="text-base font-bold text-gray-900 mb-3">
          Choose a Room
        </h2>

        {availableRooms.length > 0 && (
          <div className="space-y-3 mb-6">
            {availableRooms.map((room) => (
              <RoomCard key={room.id} room={room} hostelId={hostel.id} />
            ))}
          </div>
        )}

        {unavailableRooms.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-gray-400 mb-2 mt-4">
              Currently Unavailable
            </h3>
            <div className="space-y-3 opacity-60">
              {unavailableRooms.map((room) => (
                <RoomCard key={room.id} room={room} hostelId={hostel.id} unavailable />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RoomCard({ room, hostelId, unavailable = false }: { room: Room; hostelId: string; unavailable?: boolean }) {
  const content = (
    <div className={`bg-white rounded-xl shadow-sm border ${unavailable ? "border-gray-100" : "border-gray-200"} overflow-hidden`}>
      <div className="flex">
        {/* Thumbnail */}
        <div className="relative w-28 h-24 shrink-0">
          <Image
            src={room.images[0]}
            alt={room.name}
            fill
            className="object-cover"
            unoptimized
          />
          {unavailable && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
              <span className="text-xs font-bold text-gray-500 bg-white px-1.5 py-0.5 rounded">FULL</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 px-3 py-2.5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                {ROOM_TYPE_LABELS[room.roomType]}
              </span>
              <p className="text-sm font-bold text-gray-900 mt-0.5 leading-tight">{room.name}</p>
              <p className="text-xs text-gray-400">Up to {room.capacity} {room.capacity === 1 ? "person" : "people"}</p>
            </div>
            <p className="text-sm font-extrabold text-blue-600 whitespace-nowrap">{room.priceLabel}</p>
          </div>

          {/* Amenity badges */}
          <div className="flex flex-wrap gap-1 mt-2">
            {room.amenities.slice(0, 4).map((a) => (
              <span key={a} className="text-[10px] bg-gray-50 border border-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                {AMENITY_LABELS[a].emoji} {AMENITY_LABELS[a].label}
              </span>
            ))}
            {room.amenities.length > 4 && (
              <span className="text-[10px] text-gray-400 px-1 py-0.5">
                +{room.amenities.length - 4} more
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (unavailable) return content;

  return (
    <Link href={`/hostels/${hostelId}/rooms/${room.id}`}>
      {content}
    </Link>
  );
}
