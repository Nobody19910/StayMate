# StayMate — CLAUDE.md

## Mission: No-Broker

StayMate eliminates real estate agents and hostel middlemen entirely. Owners list their own
homes. Hostel managers list their own buildings and rooms. Seekers contact them directly.
No commission. No broker. No friction.

## Two Core Sections

### 1. Homes (P2P Property)
- Browse: 2-column grid scroll with sticky search/filter header
- Filters: listing type (rent/sale), amenities, price range, radius (geolocation)
- Detail: full property page with photos, specs, owner contact CTA
- One level of selection: card tap → property detail

### 2. Hostels (Student Accommodation)
- Browse: 2-column grid scroll with sticky search/filter header (same pattern as homes)
- Filters: amenities, proximity radius, campus/city search
- After tapping a card: lands on the hostel's Room Picker
- Room Picker: scrollable grid of rooms, each with price + amenity badges
- Room Detail: full amenity list, photos, capacity, availability
- Two levels of selection: hostel card → pick room → room detail

### Swipe UI (Dormant)
- `src/components/swipe/` contains fully implemented SwipeCard + SwipeDeck components
- Not currently wired to any browse page — kept for potential future feature activation
- Do NOT delete or modify these components

## Tech Stack

| Layer        | Choice               | Version  |
|--------------|----------------------|----------|
| Framework    | Next.js (App Router) | 16.x     |
| Language     | TypeScript           | 5.x      |
| Styling      | Tailwind CSS         | 4.x      |
| Animation    | Framer Motion        | 12.x     |
| Runtime      | Node.js              | 20+      |
| Database     | Supabase (Postgres)  | latest   |
| Auth         | Supabase Auth        | latest   |

## Project Structure

```
src/
  app/
    (main)/               # App shell with bottom nav
      homes/              # Home grid browse (filter + search)
      homes/[id]/         # Home detail + booking
      hostels/            # Hostel grid browse (filter + search)
      hostels/[id]/       # Hostel room picker
      hostels/[id]/rooms/[roomId]/  # Room detail + booking
      saved/              # Saved homes + hostels tabs
      profile/            # User profile + inquiries
      post/               # Multi-step listing submission
      chat/               # Seeker ↔ Admin chat
      admin/              # Admin command centre (admin-only)
      admin/post/         # Admin direct listing upload
    login/                # Email + password login
    signup/               # Role-based signup (seeker / owner / manager)
    layout.tsx            # Root layout (wraps AuthProvider)
    page.tsx              # Redirect → /homes
  components/
    swipe/                # SwipeCard, SwipeDeck (shared)
    ui/                   # BottomNav, SideNav, Badge, Button, etc.
    admin/                # AdminInbox and other admin components
  lib/
    types.ts              # All TypeScript interfaces
    mock-data.ts          # Dev mock data
    auth-context.tsx      # AuthProvider + useAuth hook
    api.ts                # Supabase query helpers
    supabase.ts           # Supabase client
    saved-store.ts        # localStorage saved store
```

## Core UX Rules

1. **Grid-scroll browse**: primary browse UI is a 2-column card grid with sticky filter header.
2. **Mobile-first**: all layouts designed for 375px width upward.
3. **No agents in the UI**: no mention of agents, brokers, or commission anywhere in copy.
4. **Swipe components dormant**: `SwipeCard` / `SwipeDeck` exist in `src/components/swipe/` but are not active — preserve them for future use.

## Naming Conventions

- Components: PascalCase (`SwipeCard.tsx`)
- Utilities/hooks: camelCase (`useSwipeDeck.ts`)
- Types: PascalCase interfaces (`Property`, `Hostel`, `Room`)
- Mock data: camelCase arrays (`mockHomes`, `mockHostels`)
- Routes: kebab-case segments where needed

## User Roles & Promotion

| Role      | How acquired                                      |
|-----------|---------------------------------------------------|
| `seeker`  | Default on signup                                 |
| `owner`   | Auto-promoted when seeker submits a home listing  |
| `manager` | Auto-promoted when seeker submits a hostel listing|
| `admin`   | Manually set in DB                                |

Owners and managers appear in the Admin **Active Agents** tab once they have at least one listing.

## Booking / Enquiry Flow

1. Seeker submits an enquiry (booking) from a property detail page — status: `pending`
2. Booking simultaneously anchors the seeker's chat conversation to that property (sets `property_id`, `property_type`, `property_title`, `property_image` on the `conversations` row)
3. Admin can **Accept** or **Reject** the enquiry from the dashboard — status updates inline
4. Seeker sees their enquiry status on the Profile page under "My Inquiries & Bookings"
5. Owner phone only revealed after booking is accepted

## StayMate as Agent — 200 GHS Fee

StayMate itself acts as the coordinating agent between seekers and property owners/managers.
- A standard **GH₵ 200 viewing and coordination fee** applies per property inquiry
- This fee banner is shown in the chat view whenever a conversation is anchored to a property
- Admin sees the fee badge on the property card inside the chat thread header

## Property-Anchored Chat

Each seeker has one conversation thread. When they submit an inquiry, the thread is anchored to that property:
- **Seeker chat header** shows a tappable property card (image + title) + GH₵ 200 fee banner
- **Admin inbox thread list** shows property thumbnail + title pill under the seeker's name
- **Admin chat header** shows the property card with a GH₵ 200 fee badge + tap-to-navigate link
- Anchoring is stored in `conversations`: `property_id`, `property_type`, `property_title`, `property_image`
- Migration: `022_property_anchored_chat.sql`

## Amenity System (Hostels)

Each `Room` has an `amenities` array typed as `RoomAmenity[]`. Defined amenities:
`wifi` | `ac` | `attached-bath` | `hot-water` | `laundry` | `study-desk` |
`wardrobe` | `balcony` | `meal-included` | `security` | `cctv` | `generator`

Room types: `single` | `double` | `triple` | `quad` | `dormitory`

## DB Tables (key ones)

- `profiles` — id, full_name, phone, role, kyc_status, agent_mode_enabled, avatar_url
- `homes` — listing data, owner_id, status (pending_admin | approved | rejected)
- `hostels` — listing data, manager_id, status
- `rooms` — hostel room types, linked to hostel_id
- `bookings` — enquiries; user_id, property_id, property_type, status (pending | accepted | rejected)
- `messages` — chat messages between seeker and admin
- `landlord_leads` — seeker-submitted property leads for admin to action
- `kyc_submissions` — identity verification requests

## Phase Tracker

- [x] Phase 1 — Foundation & Core Swipe UI
- [x] Phase 2 — Listings, Filters & Property Detail
- [x] Phase 3 — Auth, Roles & Two-Sided User System
- [x] Phase 4 — Direct Messaging, Booking Flow & Admin Command Centre
- [ ] Phase 5 — Trust, Verification & Monetisation
