# StayMate — CLAUDE.md

## Mission: No-Broker

StayMate eliminates real estate agents and hostel middlemen entirely. Owners list their own
homes. Hostel managers list their own buildings and rooms. Seekers contact them directly.
No commission. No broker. No friction.

## Two Core Sections

### 1. Homes (P2P Property)
- Browse: swipe-first interface — right to save, left to skip
- Detail: full property page with photos, specs, owner contact CTA
- One level of selection: swipe card → property detail

### 2. Hostels (Student Accommodation)
- Browse: swipe-first interface — same SwipeCard/SwipeDeck components
- After swiping right (or tapping a card): lands on the hostel's Room Picker
- Room Picker: scrollable grid of rooms, each with price + amenity badges
- Room Detail: full amenity list, photos, capacity, availability
- Two levels of selection: swipe hostel → pick room → room detail

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
      homes/              # Home swipe browse
      homes/[id]/         # Home detail + booking
      hostels/            # Hostel swipe browse
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

1. **Swipe-first**: the primary browse UI for both homes and hostels is always the swipe deck,
   never an infinite scroll grid.
2. **Mobile-first**: all layouts designed for 375px width upward.
3. **No agents in the UI**: no mention of agents, brokers, or commission anywhere in copy.
4. **Shared swipe primitives**: `SwipeCard` and `SwipeDeck` are section-agnostic — they accept
   any card data and fire callbacks. Homes and Hostels pages compose them.

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
2. Admin can **Accept** or **Reject** the enquiry from the dashboard — status updates inline
3. Seeker sees their enquiry status on the Profile page under "My Inquiries & Bookings"
4. Owner phone only revealed after booking is accepted

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
