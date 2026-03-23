import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getHostelById } from "@/lib/api";
import type { Room, RoomAmenity } from "@/lib/types";
import DistanceBadge from "@/components/ui/DistanceBadge";
import ImageGallery from "@/components/ui/ImageGallery";

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
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Hero image gallery + back button */}
      <ImageGallery images={hostel.images || []} alt={hostel.name} heightClass="h-56">
        <Link
          href="/hostels"
          className="absolute left-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow z-10"
          style={{ top: "calc(env(safe-area-inset-top, 12px) + 12px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-5 h-5" style={{ color: "var(--uber-text)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="absolute bottom-8 left-4 right-4 z-10" onClick={(e) => e.stopPropagation()}>
          <span className="text-white text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#06C167" }}>STUDENT HOSTEL</span>
          <h1 className="text-white text-xl font-extrabold mt-1 drop-shadow font-serif">{hostel.name}</h1>
          <p className="text-white/80 text-xs">{hostel.address}, {hostel.city}</p>
        </div>
      </ImageGallery>

      {/* Hostel meta */}
      <div className="px-4 py-3" style={{ background: "var(--uber-white)", borderBottom: "0.5px solid var(--uber-border)" }}>
        <div className="flex items-center gap-4 text-sm flex-wrap" style={{ color: "var(--uber-muted)" }}>
          <span>{hostel.availableRooms} of {hostel.totalRooms} rooms available</span>
          <span>•</span>
          <span>{hostel.priceRangeLabel}</span>
          <DistanceBadge lat={hostel.lat} lng={hostel.lng} />
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--uber-muted)" }}>Near: {hostel.nearbyUniversities.join(", ")}</p>
      </div>

      {/* Room list */}
      <div className="px-4 py-5">
        <h2 className="text-base font-bold mb-3" style={{ color: "var(--uber-text)" }}>
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
            <h3 className="text-sm font-semibold mb-2 mt-4" style={{ color: "var(--uber-muted)" }}>
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
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
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
              <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: "var(--uber-muted)", background: "var(--uber-white)" }}>FULL</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 px-3 py-2.5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#06C167] bg-[#06C167]/10 px-1.5 py-0.5 rounded">
                {ROOM_TYPE_LABELS[room.roomType]}
              </span>
              <p className="text-sm font-bold mt-0.5 leading-tight" style={{ color: "var(--uber-text)" }}>{room.name}</p>
              <p className="text-xs" style={{ color: "var(--uber-muted)" }}>Up to {room.capacity} {room.capacity === 1 ? "person" : "people"}</p>
            </div>
            <p className="text-sm font-extrabold whitespace-nowrap" style={{ color: "var(--uber-text)" }}>{room.priceLabel}</p>
          </div>

          {/* Amenity badges */}
          <div className="flex flex-wrap gap-1 mt-2">
            {room.amenities.slice(0, 4).map((a) => (
              <span key={a} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--uber-surface)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" }}>
                {AMENITY_LABELS[a].emoji} {AMENITY_LABELS[a].label}
              </span>
            ))}
            {room.amenities.length > 4 && (
              <span className="text-[10px] px-1 py-0.5" style={{ color: "var(--uber-muted)" }}>
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
