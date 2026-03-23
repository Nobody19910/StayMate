import { supabase } from "./supabase";
import type { Property, Hostel, Room, PropertyType, PropertyCondition, FurnishingLevel, RoomType, RoomAmenity, SponsorTier } from "./types";

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
  // Metadata
  condition?: string;
  furnishing?: string;
  service_charge?: number;
  is_negotiable?: boolean;
  land_size?: number;
  created_at?: string;
  // Noir fields
  is_sponsored?: boolean;
  sponsored_until?: string;
  priority_score?: number;
  video_url?: string;
  lifestyle_tags?: string[];
  status?: string;
  is_verified?: boolean;
  sponsor_tier?: string;
  // Joined from profiles
  profiles?: { display_name?: string; is_agent?: boolean } | null;
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
  status?: string;
  is_verified?: boolean;
  sponsor_tier?: string;
  // Joined from profiles
  profiles?: { display_name?: string; is_agent?: boolean } | null;
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
    condition: row.condition as PropertyCondition | undefined,
    furnishing: row.furnishing as FurnishingLevel | undefined,
    serviceCharge: row.service_charge,
    isNegotiable: row.is_negotiable,
    landSize: row.land_size,
    createdAt: row.created_at,
    isSponsored: row.is_sponsored,
    sponsoredUntil: row.sponsored_until,
    priorityScore: row.priority_score,
    videoUrl: row.video_url,
    lifestyleTags: row.lifestyle_tags,
    status: row.status,
    isVerified: row.is_verified,
    sponsorTier: (row.sponsor_tier as SponsorTier) || null,
    agentName: row.profiles?.display_name || null,
    isAgent: row.profiles?.is_agent || false,
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
    status: row.status,
    isVerified: row.is_verified,
    sponsorTier: (row.sponsor_tier as SponsorTier) || null,
    agentName: row.profiles?.display_name || null,
    isAgent: row.profiles?.is_agent || false,
  };
}

// ─── Queries (Sponsored-first ordering) ──────────────────────────────────────

export async function getHomes(): Promise<Property[]> {
  const { data, error } = await supabase
    .from("homes")
    .select("*, profiles:owner_id(display_name, is_agent)")
    .not("status", "in", '("rented","sold")')
    .order("is_sponsored", { ascending: false })
    .order("priority_score", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as HomeRow[]).map(rowToProperty);
}

export async function getHomeById(id: string): Promise<Property | null> {
  const { data, error } = await supabase
    .from("homes")
    .select("*, profiles:owner_id(display_name, is_agent)")
    .eq("id", id)
    .single();

  if (error) return null;
  return rowToProperty(data as HomeRow);
}

export async function getHostels(): Promise<Hostel[]> {
  const { data, error } = await supabase
    .from("hostels")
    .select("*, rooms(*), profiles:manager_id(display_name, is_agent)")
    .not("status", "in", '("rented","sold","full")')
    .order("is_sponsored", { ascending: false })
    .order("priority_score", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as HostelRow[]).map(rowToHostel);
}

export async function getHostelById(id: string): Promise<Hostel | null> {
  const { data, error } = await supabase
    .from("hostels")
    .select("*, rooms(*), profiles:manager_id(display_name, is_agent)")
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

// ─── Search with filters (Sponsored-first ordering preserved) ────────────────

export type TimePosted = "1h" | "24h" | "7d" | "30d" | "any";

export interface HomeSearchFilters {
  query?: string;
  forSale?: boolean | null;       // null = all
  propertyTypes?: PropertyType[];
  amenities?: string[];
  priceMin?: number;
  priceMax?: number;
  condition?: PropertyCondition;
  furnishing?: FurnishingLevel;
  timePosted?: TimePosted;
}

export async function searchHomes(filters: HomeSearchFilters = {}): Promise<Property[]> {
  let q = supabase
    .from("homes")
    .select("*, profiles:owner_id(display_name, is_agent)")
    .not("status", "in", '("rented","sold")');

  // Listing type
  if (filters.forSale === true) q = q.eq("for_sale", true);
  if (filters.forSale === false) q = q.eq("for_sale", false);

  // Property types
  if (filters.propertyTypes && filters.propertyTypes.length > 0) {
    q = q.in("property_type", filters.propertyTypes);
  }

  // Condition
  if (filters.condition) q = q.eq("condition", filters.condition);

  // Furnishing
  if (filters.furnishing) q = q.eq("furnishing", filters.furnishing);

  // Price range
  if (filters.priceMin != null && filters.priceMin > 0) q = q.gte("price", filters.priceMin);
  if (filters.priceMax != null && filters.priceMax < 50000) q = q.lte("price", filters.priceMax);

  // Time posted
  if (filters.timePosted && filters.timePosted !== "any") {
    const now = new Date();
    const offsets: Record<string, number> = { "1h": 3600000, "24h": 86400000, "7d": 604800000, "30d": 2592000000 };
    const since = new Date(now.getTime() - (offsets[filters.timePosted] ?? 0)).toISOString();
    q = q.gte("created_at", since);
  }

  // Amenities — filter rows that contain ALL selected amenities (Postgres @> operator)
  if (filters.amenities && filters.amenities.length > 0) {
    q = q.contains("amenities", filters.amenities);
  }

  // Sponsored-first ordering (preserved)
  q = q
    .order("is_sponsored", { ascending: false })
    .order("priority_score", { ascending: false })
    .order("created_at", { ascending: false });

  const { data, error } = await q;
  if (error) throw error;

  let results = (data as HomeRow[]).map(rowToProperty);

  // Client-side text search (title, city, address)
  if (filters.query?.trim()) {
    const terms = filters.query.toLowerCase();
    results = results.filter(h =>
      h.title.toLowerCase().includes(terms) ||
      h.city.toLowerCase().includes(terms) ||
      h.address?.toLowerCase().includes(terms)
    );
  }

  return results;
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

// ─── Self-service sponsorship ───────────────────────────────────────────────

export async function sponsorProperty(
  table: "homes" | "hostels",
  id: string,
  tier: SponsorTier,
  durationDays: number,
  paymentRef: string,
  userId: string
): Promise<void> {
  const sponsored_until = new Date(Date.now() + durationDays * 86400000).toISOString();
  const priority_score = tier === "featured" ? 200 : tier === "standard" ? 150 : 100;

  await supabase
    .from(table)
    .update({
      is_sponsored: true,
      sponsored_until,
      priority_score,
      sponsor_tier: tier,
      sponsor_payment_ref: paymentRef,
    })
    .eq("id", id);

  // Audit trail
  await supabase.from("sponsor_payments").insert({
    user_id: userId,
    property_id: id,
    property_type: table === "homes" ? "home" : "hostel",
    tier,
    amount: tier === "featured" ? 7000 : tier === "standard" ? 5000 : 1500,
    duration_days: durationDays,
    payment_reference: paymentRef,
  });
}

// ─── Verified toggle (admin only) ───────────────────────────────────────────

export async function toggleVerified(
  table: "homes" | "hostels",
  id: string,
  verified: boolean
): Promise<void> {
  await supabase.from(table).update({ is_verified: verified }).eq("id", id);
}

// ─── Agent subscription ─────────────────────────────────────────────────────

export async function activateAgentSubscription(
  userId: string,
  paymentRef: string
): Promise<void> {
  const until = new Date(Date.now() + 30 * 86400000).toISOString();
  await supabase
    .from("profiles")
    .update({
      is_agent: true,
      agent_subscription_until: until,
      agent_subscription_ref: paymentRef,
    })
    .eq("id", userId);
}

// ─── Active agents (admin) ──────────────────────────────────────────────────

export async function getActiveAgents(): Promise<any[]> {
  const { data: agents } = await supabase
    .from("profiles")
    .select("id, full_name, display_name, is_agent, agent_subscription_until, phone, avatar_url")
    .eq("is_agent", true)
    .gt("agent_subscription_until", new Date().toISOString());

  if (!agents?.length) return [];

  // Get listing counts and paid viewing counts per agent
  const agentIds = agents.map(a => a.id);
  const [{ data: homeCounts }, { data: hostelCounts }, { data: paidBookings }] = await Promise.all([
    supabase.from("homes").select("owner_id").in("owner_id", agentIds),
    supabase.from("hostels").select("manager_id").in("manager_id", agentIds),
    supabase.from("bookings").select("property_id, property_type, user_id")
      .in("status", ["fee_paid", "viewing_scheduled", "completed"]),
  ]);

  return agents.map(agent => {
    const homeCount = homeCounts?.filter(h => h.owner_id === agent.id).length ?? 0;
    const hostelCount = hostelCounts?.filter(h => h.manager_id === agent.id).length ?? 0;
    // Count paid viewings for this agent's properties
    const agentHomeIds = homeCounts?.filter(h => h.owner_id === agent.id).map(h => (h as any).id) ?? [];
    const agentHostelIds = hostelCounts?.filter(h => h.manager_id === agent.id).map(h => (h as any).id) ?? [];
    const paidCount = paidBookings?.filter(b =>
      agentHomeIds.includes(b.property_id) || agentHostelIds.includes(b.property_id)
    ).length ?? 0;

    return {
      ...agent,
      listingCount: homeCount + hostelCount,
      paidViewingCount: paidCount,
    };
  });
}
