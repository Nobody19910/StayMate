import { supabase } from "./supabase";
import type { Property, Hostel, Room, PropertyType, RoomType, RoomAmenity } from "./types";

// ─── Row types from Supabase ──────────────────────────────────────────────────

interface HomeRow {
  id: string;
  property_type: string;
  title: string;
  description: string;
  price: number;
  price_label: string;
  for_sale: boolean;
  beds: number;
  baths: number;
  sqft: number;
  address: string;
  city: string;
  state: string;
  images: string[];
  amenities?: string[];
  owner_phone?: string;
  owner_id: string;
  lat?: number;
  lng?: number;
  // Noir fields
  is_sponsored?: boolean;
  sponsored_until?: string;
  priority_score?: number;
  video_url?: string;
  lifestyle_tags?: string[];
}

interface HostelRow {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  nearby_universities: string[];
  images: string[];
  total_rooms: number;
  available_rooms: number;
  price_range_min: number;
  price_range_max: number;
  price_range_label: string;
  amenities?: string[];
  manager_phone?: string;
  manager_id: string;
  rooms?: RoomRow[];
  lat?: number;
  lng?: number;
  // Noir fields
  is_sponsored?: boolean;
  sponsored_until?: string;
  priority_score?: number;
  video_url?: string;
  lifestyle_tags?: string[];
}

interface RoomRow {
  id: string;
  hostel_id: string;
  name: string;
  room_type: string;
  price: number;
  price_label: string;
  capacity: number;
  available: boolean;
  amenities: string[];
  images: string[];
  description: string;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function rowToProperty(row: HomeRow): Property {
  return {
    id: row.id,
    type: "home",
    propertyType: row.property_type as PropertyType,
    title: row.title,
    description: row.description,
    price: row.price,
    priceLabel: row.price_label,
    forSale: row.for_sale,
    beds: row.beds,
    baths: row.baths,
    sqft: row.sqft,
    address: row.address,
    city: row.city,
    state: row.state,
    images: row.images,
    amenities: row.amenities ?? [],
    ownerPhone: row.owner_phone,
    ownerId: row.owner_id,
    lat: row.lat,
    lng: row.lng,
    isSponsored: row.is_sponsored,
    sponsoredUntil: row.sponsored_until,
    priorityScore: row.priority_score,
    videoUrl: row.video_url,
    lifestyleTags: row.lifestyle_tags,
  };
}

function rowToRoom(row: RoomRow): Room {
  return {
    id: row.id,
    hostelId: row.hostel_id,
    name: row.name,
    roomType: row.room_type as RoomType,
    price: row.price,
    priceLabel: row.price_label,
    capacity: row.capacity,
    available: row.available,
    amenities: row.amenities as RoomAmenity[],
    images: row.images,
    description: row.description,
  };
}

function rowToHostel(row: HostelRow): Hostel {
  return {
    id: row.id,
    type: "hostel",
    name: row.name,
    description: row.description,
    address: row.address,
    city: row.city,
    state: row.state,
    nearbyUniversities: row.nearby_universities,
    images: row.images,
    totalRooms: row.total_rooms,
    availableRooms: row.available_rooms,
    priceRange: { min: row.price_range_min, max: row.price_range_max },
    priceRangeLabel: row.price_range_label,
    amenities: row.amenities ?? [],
    managerPhone: row.manager_phone,
    managerId: row.manager_id,
    rooms: (row.rooms ?? []).map(rowToRoom),
    lat: row.lat,
    lng: row.lng,
    isSponsored: row.is_sponsored,
    sponsoredUntil: row.sponsored_until,
    priorityScore: row.priority_score,
    videoUrl: row.video_url,
    lifestyleTags: row.lifestyle_tags,
  };
}

// ─── Queries (Sponsored-first ordering) ──────────────────────────────────────

export async function getHomes(): Promise<Property[]> {
  const { data, error } = await supabase
    .from("homes")
    .select("*")
    // Sponsored-first, then priority score, then recency
    .order("is_sponsored", { ascending: false })
    .order("priority_score", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as HomeRow[]).map(rowToProperty);
}

export async function getHomeById(id: string): Promise<Property | null> {
  const { data, error } = await supabase
    .from("homes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return rowToProperty(data as HomeRow);
}

export async function getHostels(): Promise<Hostel[]> {
  const { data, error } = await supabase
    .from("hostels")
    .select("*, rooms(*)")
    .order("is_sponsored", { ascending: false })
    .order("priority_score", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as HostelRow[]).map(rowToHostel);
}

export async function getHostelById(id: string): Promise<Hostel | null> {
  const { data, error } = await supabase
    .from("hostels")
    .select("*, rooms(*)")
    .eq("id", id)
    .single();

  if (error) return null;
  return rowToHostel(data as HostelRow);
}

export async function getRoomById(hostelId: string, roomId: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .eq("hostel_id", hostelId)
    .single();

  if (error) return null;
  return rowToRoom(data as RoomRow);
}

// ─── Admin: toggle sponsored status ──────────────────────────────────────────

export async function toggleSponsored(
  table: "homes" | "hostels",
  id: string,
  sponsored: boolean,
  durationDays: number
): Promise<void> {
  const sponsored_until = sponsored
    ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
    : null;
  const priority_score = sponsored ? 100 : 0;

  await supabase
    .from(table)
    .update({ is_sponsored: sponsored, sponsored_until, priority_score })
    .eq("id", id);
}
