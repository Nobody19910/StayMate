// ─── Shared ───────────────────────────────────────────────────────────────────

export type ListingType = "home" | "hostel";

// ─── Homes ────────────────────────────────────────────────────────────────────

export type PropertyType = "apartment" | "house" | "studio" | "duplex" | "townhouse";

export interface Property {
  id: string;
  type: "home";
  propertyType: PropertyType;
  title: string;
  description: string;
  price: number;          // monthly rent or sale price
  priceLabel: string;     // e.g. "GH₵4,500/mo" or "GH₵850K"
  forSale: boolean;       // false = for rent
  beds: number;
  baths: number;
  sqft: number;
  address: string;
  city: string;
  state: string;
  images: string[];       // URLs
  amenities: string[];    // e.g. ["AC", "Pool", "Generator"]
  ownerPhone?: string;    // tel: link target
  ownerId: string;
  savedAt?: string;       // ISO date, set when saved
  lat?: number;
  lng?: number;
}

// ─── Hostels ──────────────────────────────────────────────────────────────────

export type RoomAmenity =
  | "wifi"
  | "ac"
  | "attached-bath"
  | "hot-water"
  | "laundry"
  | "study-desk"
  | "wardrobe"
  | "balcony"
  | "meal-included"
  | "security"
  | "cctv"
  | "generator";

export type RoomType = "single" | "double" | "triple" | "quad" | "dormitory";

export interface Room {
  id: string;
  hostelId: string;
  name: string;           // e.g. "Room 12A", "Block B - Single"
  roomType: RoomType;
  price: number;          // per year (student hostels typically yearly)
  priceLabel: string;     // e.g. "GH₵2,800/yr"
  capacity: number;       // max occupants
  available: boolean;
  amenities: RoomAmenity[];
  images: string[];
  description: string;
}

export interface Hostel {
  id: string;
  type: "hostel";
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  nearbyUniversities: string[];
  images: string[];
  totalRooms: number;
  availableRooms: number;
  priceRange: { min: number; max: number };
  priceRangeLabel: string;  // e.g. "GH₵2K – GH₵4K/yr"
  amenities: string[];      // hostel-level tags for filtering
  managerPhone?: string;    // tel: link target
  managerId: string;
  rooms: Room[];
  savedAt?: string;
  lat?: number;
  lng?: number;
}

// ─── Swipe ────────────────────────────────────────────────────────────────────

export type SwipeDirection = "left" | "right";

export interface SwipeResult {
  id: string;
  direction: SwipeDirection;
}

// ─── Saved ────────────────────────────────────────────────────────────────────

export interface SavedItem {
  id: string;
  type: ListingType;
  savedAt: string;
}

// ─── Booking & Chat (Phase 1 & 2) ──────────────────────────────────────────────────

export interface Booking {
  id: string;
  user_id: string;
  property_type: "home" | "hostel";
  property_id: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  viewing_date?: string;
  message?: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields for UI convenience
  property?: Property | Hostel;
  user?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
  };
}

export interface Conversation {
  id: string;
  seeker_id: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  seeker?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  last_message?: string;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

