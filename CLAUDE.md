# StayMate — CLAUDE.md

## Mission: The Noir Estate

StayMate is a **luxury P2P real estate platform** and dual-income marketplace. Owners list their
own homes, hostel managers list their own buildings — seekers contact them directly through
StayMate as the coordinating concierge. No third-party broker. No commission.

**Two revenue streams:**
1. **GH₵ 200 Coordination & Viewing Fee** — charged to seekers per accepted inquiry (Paystack)
2. **Sponsored Listings Revenue** — property owners pay to pin their listings at the top of browse (weekly / bi-weekly)

## Design System: Uber

| Token              | Value                  | Usage                              |
|--------------------|------------------------|------------------------------------||
| `--uber-black`     | `#000000`              | Primary text, buttons, accents     |
| `--uber-white`     | `#FFFFFF`              | Cards, panels                      |
| `--uber-green`     | `#06C167`              | CTAs, badges, active nav, status   |
| `--uber-surface`   | `#F6F6F6`              | Page background, surfaces          |
| `--gold`           | `#D4AF37`              | Fee banners, sponsored badges only |
| Serif font         | Playfair Display       | Property titles, H1 headings       |
| Sans font          | Inter                  | UI text, labels, inputs            |

All borders must be `0.5px` hairlines using `rgba(0,0,0,0.09)`. No thick borders.
Shadows: `box-shadow: 0 2px 16px rgba(0,0,0,0.07)`.

## Two Core Sections

### 1. Homes (P2P Property)
- Browse: 2-column grid scroll with sticky search/filter header
- Sponsored listings appear first (gold shimmer badge "✦ Sponsored")
- Filters: listing type (rent/sale), amenities, price range, radius (geolocation)
- Detail: full property page with photos, specs, inquiry CTA
- One level of selection: card tap → property detail

### 2. Hostels (Student Accommodation)
- Browse: 2-column grid scroll with sticky search/filter header (same pattern as homes)
- Sponsored listings appear first
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
| Fonts        | Inter + Playfair Display (Google Fonts) | — |
| Animation    | Framer Motion        | 12.x     |
| Runtime      | Node.js              | 20+      |
| Database     | Supabase (Postgres)  | latest   |
| Auth         | Supabase Auth        | latest   |
| Realtime     | Supabase Realtime    | latest   |
| Payments     | Paystack             | —        |
| Push         | Web Push API (VAPID) | —        |

## Realtime vs Polling

**Chat messages**: Use Supabase Realtime (`postgres_changes` on `messages` table). No polling.
**Booking status**: Use Supabase Realtime (`postgres_changes` on `bookings` table). No polling.
**Unread badge** in BottomNav: still uses 10s interval (lightweight count query).

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
      chat/               # Seeker ↔ Admin (Concierge) chat
      admin/              # Admin command centre (admin-only)
      admin/post/         # Admin direct listing upload
    api/
      push-subscribe/     # Store push subscription in DB
      push-notify/        # Send web push via web-push lib
    login/                # Email + password login
    signup/               # Role-based signup (seeker / owner / manager)
    layout.tsx            # Root layout (wraps AuthProvider)
    page.tsx              # Redirect → /homes
  components/
    swipe/                # SwipeCard, SwipeDeck (shared, dormant)
    ui/                   # BottomNav, DistanceBadge, FilterModal, PwaInit, etc.
    admin/                # AdminInbox and other admin components
  lib/
    types.ts              # All TypeScript interfaces
    mock-data.ts          # Dev mock data
    auth-context.tsx      # AuthProvider + useAuth hook
    api.ts                # Supabase query helpers (sponsored-first ordering)
    supabase.ts           # Supabase client
    saved-store.ts        # localStorage saved store
    paystack.ts           # Paystack script loader + openPaystackPopup helper
```

## Core UX Rules

1. **Grid-scroll browse**: primary browse UI is a 2-column card grid with sticky filter header.
2. **Mobile-first**: all layouts designed for 375px width upward.
3. **No agents in the UI**: "concierge" is the approved term. No "agent", "broker", "commission".
4. **Swipe components dormant**: preserve `src/components/swipe/` without modification.
5. **Uber palette only**: `#000000` black, `#06C167` green, `#F6F6F6` surface. Gold only for fee banners/sponsored badges.
6. **Hairline borders**: always `0.5px solid rgba(0,0,0,0.09)` — never `border-gray-*` classes.
7. **Responsive desktop**: no phone shell on desktop. Content expands to full width. Grid goes 2→3→4 columns at md/xl.

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

## Booking / Enquiry State Machine

```
pending → accepted → fee_paid → viewing_scheduled → completed
                 ↘ rejected
```

1. Seeker submits an enquiry — status: `pending`
2. Conversation anchored to property at submission time
3. Admin accepts or rejects from AdminInbox
4. On `accepted`: Paystack modal opens in seeker chat automatically
5. On payment success: status → `fee_paid`
6. Admin can schedule viewing: status → `viewing_scheduled`
7. After viewing confirmed: status → `completed`

## StayMate as Concierge — 200 GHS Fee

- **GH₵ 200 coordination & viewing fee** per accepted inquiry
- Gold fee banner shown in chat whenever conversation is property-anchored
- Pay button appears in chat when booking.status === "accepted"
- Paystack processes in GHS (pesewas: 20000 = GH₵ 200)
- After payment: booking.status → "fee_paid", payment_reference stored

## Sponsored Listings — Revenue Stream 2

- `homes` and `hostels` tables have: `is_sponsored` (bool), `sponsored_until` (timestamptz), `priority_score` (int)
- `getHomes()` and `getHostels()` in `api.ts` order by `is_sponsored DESC, priority_score DESC, created_at DESC`
- SQL RPCs `search_homes()` and `search_hostels()` mirror this with full-text + geospatial filtering
- Sponsored cards show a gold shimmer badge: `✦ Sponsored`
- Admin can toggle sponsored via `toggleSponsored()` in `api.ts` (7 or 14 day durations)

## Property-Anchored Chat

Each seeker has one conversation thread anchored to a property when they submit an inquiry:
- **Seeker chat header**: tappable property card (image + Playfair title) + gold fee banner
- **Admin inbox**: property thumbnail + title pill under seeker's name
- Anchoring stored in `conversations`: `property_id`, `property_type`, `property_title`, `property_image`
- Migration: `022_add_chat_property_context.sql`

## DB Tables (key ones)

- `profiles` — id, full_name, phone, role, kyc_status, agent_mode_enabled, avatar_url
- `homes` — listing data, owner_id, status, is_sponsored, sponsored_until, priority_score, video_url, lifestyle_tags
- `hostels` — listing data, manager_id, status, is_sponsored, sponsored_until, priority_score, video_url, lifestyle_tags
- `rooms` — hostel room types, linked to hostel_id
- `bookings` — enquiries; user_id, property_id, property_type, status, payment_reference
- `conversations` — one per seeker, property-anchored
- `messages` — chat messages between seeker and admin
- `push_subscriptions` — web push endpoint + VAPID keys per user device
- `landlord_leads` — seeker-submitted property leads
- `kyc_submissions` — identity verification requests

## DB Migrations (in order)

- `001` → `021`: initial schema, auth, bookings, chat, amenities, KYC, etc.
- `022_add_chat_property_context.sql` — property-anchored conversations
- `023_saved_properties_and_kyc.sql`
- `024_booking_payment.sql`
- `025_push_subscriptions.sql` — web push subscriptions table + RLS
- `026_noir_estate.sql` — sponsored columns, rich media, extended booking status, search RPCs

## Env Vars Required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_EMAIL
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
```

## Phase Tracker

- [x] Phase 1 — Foundation & Core Swipe UI
- [x] Phase 2 — Listings, Filters & Property Detail
- [x] Phase 3 — Auth, Roles & Two-Sided User System
- [x] Phase 4 — Direct Messaging, Booking Flow & Admin Command Centre
- [x] Phase 5 — Noir Rebrand, Sponsored Listings, Realtime Chat, Push Notifications
- [x] Phase 6 — Uber Theme, Desktop Responsive Layout, Realtime Chat Push (seeker→admin), KYC Removed
- [ ] Phase 7 — Video Tours, Capacitor Native Build
