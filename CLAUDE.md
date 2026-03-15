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

### Sub-Domain Architecture (Phase 7)

StayMate uses Next.js route groups to host two separate sub-domains in a single codebase:

**Seeker Domain** (`staymate-eight.vercel.app` or `localhost:3000`)
- Browsing homes & hostels, messaging concierge, user profile, saved items

**Admin Domain** (`admin.staymate-eight.vercel.app` or `admin.localhost:3000`)
- Admin command centre (AdminInbox), direct listing uploads, metrics dashboard

**Routing Strategy:**
- Middleware (`src/middleware.ts`) reads the `host` header to determine domain
- Seeker domain routes admin paths (like `/inbox`) to `/homes`
- Admin domain routes seeker paths (like `/homes`) to `/inbox`
- Both groups have their own layout.tsx with separate shells

```
src/
  app/
    page.tsx                    # Redirect to /homes (shared entry, works on both domains)
    layout.tsx                  # Root layout (wraps AuthProvider + ThemeProvider)

    (seeker)/                   # Seeker-facing routes group
      layout.tsx                # Seeker shell: BottomNav + SideNav
      homes/                    # Home grid browse (filter + search)
      homes/[id]/               # Home detail + booking
      hostels/                  # Hostel grid browse (filter + search)
      hostels/[id]/             # Hostel room picker
      hostels/[id]/rooms/[roomId]/  # Room detail + booking
      saved/                    # Saved homes + hostels tabs
      profile/                  # User profile + inquiries
      chat/                     # Seeker ↔ Admin (Concierge) chat
      edit/[id]/                # Property edit (admin-only)

    (admin)/                    # Admin-facing routes group
      layout.tsx                # Admin shell: dark sidebar with 6 tabs
      inbox/                    # AdminInbox (was admin/page.tsx)

    post/                       # Shared listing submission (owners/managers + admin)
    api/
      push-subscribe/           # Store push subscription in DB
      push-notify/              # Send web push via web-push lib
    login/                      # Email + password login
    signup/                     # Role-based signup (seeker / owner / manager)
    dashboard/                  # Owner/manager property dashboard

  middleware.ts                 # Sub-domain routing: reads host header, blocks cross-domain routes

  components/
    swipe/                      # SwipeCard, SwipeDeck (shared, dormant)
    ui/                         # BottomNav, SideNav, DistanceBadge, FilterModal, etc.
    admin/                      # AdminInbox and other admin components

  lib/
    types.ts                    # All TypeScript interfaces
    mock-data.ts                # Dev mock data
    auth-context.tsx            # AuthProvider + useAuth hook
    api.ts                      # Supabase query helpers (sponsored-first ordering)
    supabase.ts                 # Supabase client
    saved-store.ts              # localStorage saved store
    paystack.ts                 # Paystack script loader + openPaystackPopup helper
```

**Middleware Routing Logic** (`src/middleware.ts`):
- Reads `request.headers.get("host")` to determine domain
- Admin domain: starts with `"admin."` (e.g., `admin.localhost`, `admin.staymate-eight.vercel.app`)
- Redirects root `/` to `/inbox` on admin domain, `/homes` on seeker domain
- Blocks seeker routes (`/homes`, `/hostels`, `/saved`, etc.) on admin domain
- Blocks admin routes (`/inbox`) on seeker domain
- All redirects return middleware response or pass through

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

---

## Complete Technical Architecture

### Frontend Stack & Rendering

**Framework**: Next.js 16.1.6 with App Router (React 19.2.3)
- All user-facing routes use `"use client"` directive (client-side rendering)
- Server components used sparingly (root layout, metadata exports)
- Static pages: root redirect, login, signup
- Dynamic routes use `params as Promise` pattern for async unwrapping

**Styling & Theme**
- Tailwind CSS v4 with custom theme tokens in `:root` CSS variables
- Color palette defined in `src/app/globals.css`:
  - `--uber-black: #000000` — primary text, borders, buttons
  - `--uber-white: #FFFFFF` — cards, panels
  - `--uber-green: #06C167` — active states, CTAs, badges
  - `--uber-surface: #F6F6F6` — page backgrounds
  - `--gold: #D4AF37` — sponsored badges and fee banners only
  - `--uber-border: rgba(0,0,0,0.09)` — hairline 0.5px borders
- Dark mode toggle implemented via `ThemeContext` (persisted to localStorage)
- Responsive breakpoints: mobile-first (375px+), lg breakpoint (1024px) for desktop sidebar layout

**Animation Framework**
- Framer Motion v12.35.0 for page transitions, card overlays, modal animations
- `PageTransition` wrapper in `(main)/layout.tsx` applies fade/slide to all child routes
- Constraints: motion animations must not interfere with scroll performance or Supabase Realtime listeners

**Web Push & PWA**
- next-pwa v5.6.0 for service worker registration and offline caching
- Web Push API (VAPID) for server-to-client notifications
- Push subscription stored in `push_subscriptions` table with VAPID public/private keys
- Notifications triggered via `/api/push-notify` endpoint when admin sends messages to seeker

### Backend Architecture

**API Routes** (Next.js `/app/api/`)
- `/api/upload-image` — POST handler for image uploads via FormData
  - Accepts: file, userId, path (Supabase storage path)
  - Converts File to Buffer and uploads to `listing-images` storage bucket
  - Uses anon key (fallback from service role key if empty)
  - Returns public URL on success
  - **Security**: No auth check — relies on RLS policies in Supabase storage
- `/api/push-subscribe` — POST handler to store push subscriptions
  - Accepts: userId, subscription (endpoint, p256dh, auth keys)
  - Upserts to `push_subscriptions` table with onConflict on (user_id, endpoint)
  - No auth validation — client must send valid userId
- `/api/push-notify` — POST handler to send web push notifications
  - Server-only runtime (Node.js, not Edge)
  - Accepts: userId, title, body, url
  - Fetches all subscriptions for user_id from `push_subscriptions` table
  - Sends via `web-push` npm library (requires VAPID details set at runtime)
  - Auto-cleans stale subscriptions (410 Gone responses)
  - Fallback: uses anon key if SUPABASE_SERVICE_ROLE_KEY is empty

**Supabase Client Initialization**
- `src/lib/supabase.ts` creates single Supabase client with anon key
- Used for all client-side and server-side API routes
- **No service role key available** (SUPABASE_SERVICE_ROLE_KEY is empty string in .env.local)
  - RLS policies must handle all auth via anon + row-level checking
  - Admin endpoints rely on `profiles.role = 'admin'` checks in RLS policies
  - Cannot perform super-user operations like bulk deletes or bypassing RLS

### Database Layer (Supabase Postgres)

**Core Tables**

`profiles`
- Fields: id (UUID), full_name, phone, avatar_url, role, kyc_status, agent_mode_enabled, created_at
- RLS: Anyone can read; INSERT allowed via Supabase Auth trigger `on_auth_user_created`
- Role assignment: default to "seeker", promoted to "owner"/"manager" on listing submission, "admin" manually

`homes`
- Fields: id (text UUID), property_type, title, description, price (bigint), price_label, for_sale (bool),
  beds, baths, sqft, address, city, state, images (text[]), amenities (text[]), owner_phone, owner_id,
  lat, lng, is_sponsored (bool), sponsored_until (timestamptz), priority_score (int), video_url,
  lifestyle_tags (text[]), created_at
- RLS: SELECT allow anyone; INSERT/UPDATE allow owner_id match; DELETE allow admin or owner

`hostels`
- Fields: similar to homes but with manager_id instead of owner_id, nearby_universities (text[]),
  total_rooms (int), available_rooms (int), price_range_min/max (bigint), price_range_label
- RLS: SELECT allow anyone; INSERT/UPDATE allow manager_id match; DELETE allow admin or manager

`rooms`
- Fields: id, hostel_id (FK to hostels), name, room_type, price, price_label, capacity, available (bool),
  amenities (text[]), images (text[]), description, created_at
- RLS: SELECT allow anyone; INSERT/UPDATE/DELETE restricted to hostel manager

`bookings` (enquiries)
- Fields: id (UUID), user_id, property_type ("home"|"hostel"), property_id, status
  (pending|accepted|fee_paid|viewing_scheduled|completed|rejected), viewing_date, message,
  payment_reference, created_at, updated_at
- RLS: SELECT allow user_id match or admin; INSERT allow authenticated; UPDATE allow admin

`conversations`
- Fields: id (UUID), seeker_id, property_id (nullable), property_type (nullable), property_title,
  property_image, created_at, updated_at
- RLS: SELECT allow seeker_id match or admin; INSERT allow authenticated; UPDATE allow admin

`messages`
- Fields: id (UUID), conversation_id, sender_id, content (text), is_read (bool), created_at
- RLS: SELECT allow conversation participants or admin; INSERT allow authenticated; UPDATE admin only

`push_subscriptions`
- Fields: id (UUID), user_id, endpoint (text), p256dh (text), auth (text), created_at
- RLS: SELECT allow user_id match; UPSERT allow authenticated

`landlord_leads` — seeker property suggestions for owners

`kyc_submissions` — identity verification requests (currently disabled)

**Migrations Applied** (in /supabase/migrations/)
- 001-initial_schema: homes, hostels, rooms, RLS read policies
- 003-auth_profiles: profiles table, Supabase Auth integration
- 018-bookings_and_chat_schema: bookings, conversations, messages tables
- 020-fix_messages_admin_rls: admin-specific message read policies
- 022b-property_anchored_chat: conversations.property_* fields
- 024-booking_payment: payment_reference field
- 025-push_subscriptions: push subscriptions table + RLS
- 027-realtime_replica_identity: REPLICA IDENTITY FULL on messages for Realtime

**Realtime Subscriptions**
- `postgres_changes` on `messages` table for chat updates (watched in AdminInbox, seeker chat)
- Listens for INSERT events (new messages), UPDATE events (is_read flag)
- Polling fallback: AdminInbox polls conversations every 8s and messages every 3s (tolerance for rate limits)

### Authentication & Authorization

**Supabase Auth Integration**
- Email/password login at `/login` page
- Social OAuth support: Google, Apple (via `signInWithOAuth`)
- OTP mock verification in login flow (hardcoded "123456" for testing)
- Session persisted in browser via Supabase Auth SDK
- `AuthProvider` in `src/lib/auth-context.tsx` wraps entire app:
  - Fetches user + profile on mount and auth state changes
  - Exposes `useAuth()` hook: returns `{ user, session, profile, loading, signOut }`
  - Profile includes role, kyc_status, agent_mode_enabled

**Role-Based Access Control (RBAC)**
- Roles: seeker, owner, manager, admin
- Routes protected via client-side `useAuth()` checks:
  - `/post` — requires seeker/owner/manager (listing creators)
  - `/dashboard` — requires owner/manager/admin
  - `/admin` — requires admin only (AdminInbox component)
- **No backend middleware** — all auth checks are client-side or via RLS
- RLS policies check `auth.uid()` and `profiles.role` in WHERE clauses

**RLS Policy Example (homes table)**
```sql
-- Anyone can read
CREATE POLICY "Anyone can read homes" ON homes FOR SELECT USING (true);
-- Owner can update their own
CREATE POLICY "Owner can update own home" ON homes FOR UPDATE
  USING (auth.uid()::text = owner_id);
-- Admin can delete any
CREATE POLICY "Admin can delete homes" ON homes FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()::text AND profiles.role = 'admin')
  );
```

### Payment Processing

**Paystack Integration**
- Public key stored in `NEXT_PUBLIC_PAYSTACK_KEY` (test key: pk_test_419b6efc...)
- Implementation in `src/lib/paystack.ts`:
  - `usePaystackScript()` hook loads Paystack inline script on first use
  - `openPaystackPopup(options)` opens Paystack iframe modal
  - Options: email, amount (in pesewas = GHS × 100), currency (GHS), ref (unique per transaction),
    metadata, onSuccess, onClose callbacks
- Charge: GH₵ 200 per accepted inquiry = 20000 pesewas
- Flow: Admin accepts booking → seeker sees "Pay GH₵ 200" in chat → Paystack modal → on success,
  booking.status → "fee_paid", payment_reference stored
- **No server-side payment verification** — relies on client-side callback; production should verify
  against Paystack API

### Storage & File Uploads

**Supabase Storage Bucket**
- Bucket name: `listing-images` (public, unauthenticated read allowed)
- Upload path pattern: `{property_type}/{property_id}/{file_uuid}.{ext}`
  - Example: `homes/home-abc-123/550e8400-e29b-41d4-a716-446655440000.jpg`
- Upload method: `/api/upload-image` API route (server-side)
  - Client sends FormData with file, userId, path
  - Server creates Buffer and uploads via Supabase anon key
  - Returns `{ success: true, url, path }` or error
- Public URL format: `https://mflxmulbguafoyytgumk.supabase.co/storage/v1/object/public/listing-images/{path}`
- **RLS not used for storage** — bucket is public; access control via path obfuscation + UUIDs

### State Management

**No Redux/Zustand** — uses:
- React Context for auth (`AuthProvider`, `useAuth()`)
- React Context for theme (`ThemeProvider`, useTheme hook)
- localStorage for saved items (`src/lib/saved-store.ts`):
  - Functions: `addSaved(id, type)`, `removeSaved(id)`, `isSaved(id)`, `getSavedCount(type)`
  - Persists SavedItem[] with `{ id, type, savedAt }`
  - Hook: `useSavedCount(type)` returns count
- Supabase Realtime for chat messages (listener in AdminInbox, seeker chat page)
- useState for UI-level state (modals, form fields, loading flags)

**Data Fetching**
- `src/lib/api.ts` provides query helpers:
  - `getHomes()` — SELECT all with sponsored-first ordering
  - `getHostels()` — SELECT all with rooms + sponsored-first ordering
  - `getHomeById(id)` — SELECT single home
  - `getHostelById(id)` — SELECT single hostel with rooms
  - `getRoomById(hostelId, roomId)` — SELECT single room
  - `toggleSponsored(table, id, sponsored, durationDays)` — admin-only
- No caching layer (relies on browser cache + Supabase edge caching)
- No error boundary — errors logged to console and caught at route level

### Key Components

**UI Components** (src/components/ui/)
- `BottomNav` — fixed navigation for mobile (homes, hostels, saved, profile, admin if admin)
- `SideNav` — desktop left sidebar (hidden <lg breakpoint)
- `BottomNav` / `SideNav` both fetch unread message count every 10s
- `FilterModal` / `FilterSheet` — modal/sheet overlays for amenity/price/distance filters
- `DistanceBadge` — geolocation distance display (requires browser permission)
- `AdminLocationButton` — admin-only button to open property coordinates in Google Maps (no API key)
  - Uses URL scheme: `https://maps.google.com/?q={lat},{lng}`
- `ProfileCornerButton` — floating avatar in top-right (mobile only)
- `PropertyMap` — Google Maps embed (used in property detail, admin-only)
- `PwaInit` — service worker registration, push notification setup, offline detection

**Swipe Components** (src/components/swipe/)
- `SwipeCard` — individual card with drag gesture detection
- `SwipeDeck` — stack manager, swipe animations
- `HomeCardContent` / `HostelCardContent` — card interior layouts
- `ExpandedCardOverlay` — expanded view (currently dormant)
- Used only in dev/demo; not wired to live browse pages

**Admin Components** (src/components/admin/)
- `AdminInbox` — full chat interface for admins (100+ lines)
  - Lists conversations (seekers)
  - Fetches messages on conversation select
  - Polling + Realtime listeners for new messages
  - Booking acceptance/rejection UI (toggles status)
  - Viewing date scheduling
  - Message sending with optimistic updates (temp "opt-" prefix IDs)
  - Unread message tracking

**Pages**

`(main)/homes/` — home grid browse
- Filters: property type, amenities, price range, distance (geolocation)
- Grid layout: 2 columns mobile, 3 columns md, 4 columns xl
- Sponsored items pinned at top with gold shimmer badge
- Tap card → `/homes/[id]` detail

`(main)/homes/[id]/` — home detail + booking flow
- Full property images carousel, specs (beds, baths, sqft), description, amenities
- Admin inline edit mode: shows form to edit title, price, beds, baths, sqft, description, amenities
  - Save button triggers `supabase.from("homes").update({...}).eq("id", id)`
  - Updates local state immediately
- Seeker booking flow: "Request to Book" CTA → modal with viewing date + message
  - On confirm: inserts to bookings table, creates/updates conversation anchored to property
- Save button (heart icon) for logged-in seekers (localStorage)
- Property map (admin-only)

`(main)/hostels/` — hostel grid browse (similar to homes)

`(main)/hostels/[id]/` — room picker grid
- Shows all rooms in hostel (2-column grid)
- Tap room → `/hostels/[id]/rooms/[roomId]` detail

`(main)/hostels/[id]/rooms/[roomId]/` — room detail + booking (same flow as homes)

`(main)/chat/` — seeker chat interface
- Shows single conversation (seeker's only)
- Property-anchored header: shows property image + title (tappable to property detail)
- Gold fee banner if conversation is property-anchored
- Message list + input field
- "Pay GH₵ 200" button appears when booking.status === "accepted"
  - Triggers Paystack modal
  - On success: updates booking.status → "fee_paid"

`(main)/admin/` — admin dashboard entry point
- Displays AdminInbox component (full chat + conversation management)
- Admin-only access (client-side guard via `useAuth()`)

`(main)/admin/post/` — direct listing upload for admins
- Similar to `/post` but admin creates listings without owner/manager role requirement
- Properties created with admin as owner_id

`(main)/post/` — multi-step listing form (owners/managers)
- Step 1: Role selection (home vs hostel)
- Step 2: Basic info (title, description, address, city, price, etc.)
- Step 3: Photos upload (5+ images required, images only)
  - Uses `/api/upload-image` endpoint
  - Auto-geolocation: "Use My Location" button calls `navigator.geolocation.getCurrentPosition()`
  - On success: lat/lng auto-populate
- Step 4: Amenities (checkboxes for AC, Generator, Pool, Security, Parking, Furnished, WiFi, CCTV, Borehole)
- Step 5: Review + submit
- On submit: inserts to homes/hostels table, promotes user role if needed, redirects to property detail

`/login` — email/password + social OAuth (Google, Apple)
- OTP verification mock (hardcoded "123456")
- Redirects to /homes on success

`/signup` — role-based signup (seeker / owner / manager)
- Step 1: role selection
- Step 2: email, password, full name, phone
- Creates auth user + profile row via Supabase Auth trigger
- Redirects to /homes on success

`(main)/profile/` — user profile page
- Shows auth state (logged in user details, login link if guest)
- Phone, full name, avatar (editable)
- Link to /dashboard (owner/manager/admin)
- Logout button

`(main)/saved/` — saved items (localStorage)
- Two tabs: Homes, Hostels
- Lists saved items with save date
- Tap to property detail

`(main)/dashboard/` — owner/manager dashboard
- Lists owned/managed properties
- Shows booking inquiries for each property
- Ability to view, accept/reject bookings
- Viewing date scheduling
- Link to admin page (admin only)

---

## Security Analysis

### Data Protection & Encryption

**In Transit**
- All Supabase connections via HTTPS (mandatory)
- No plaintext API keys in client code (only public anon key exposed)
- Paystack integration uses script-based iframe (no client-side key handling)

**At Rest**
- Supabase Postgres encryption at rest (default managed by Supabase)
- Authentication tokens in browser localStorage (standard, vulnerable to XSS)
- Push subscription keys (p256dh, auth) stored in Supabase (not encrypted in application layer)

**Client-Side Storage**
- localStorage used for: auth session (Supabase), saved items, theme preference
- No sensitive data cached locally (payment details, booking messages)

### Authentication & Authorization Vulnerabilities

**Current State**
- Supabase Auth handles session management (industry standard)
- RLS policies check `auth.uid()` (PostgreSQL JWT claim) for row-level access
- **No CSRF protection** on API routes (POST routes don't validate origin/referer)
- **OTP mock hardcoded** to "123456" for development (security risk if not removed in prod)
- **No rate limiting** on login endpoint (brute force possible)

**Admin Privilege Escalation**
- Admin status read from `profiles.role` table
- No cryptographic verification (relies on RLS policy checks)
- If RLS policy is misconfigured, unauthorized users can read/modify admin-only data
- Mitigation: RLS policies are strict (checked in DB layer, not bypassable from client)

**OAuth Social Login**
- Redirect URI hardcoded to `${window.location.origin}/homes` (safe, no open redirect)
- Provider apps configured in Supabase dashboard (not in code)

### Sensitive Data Exposure

**Owner Phone Numbers**
- Visible to other seekers in public listing cards
- Only hidden from seekers until they submit a booking and it's accepted
- **Exposure Risk**: phone number revealed after viewing confirmation (design choice)
- Mitigation: design-by-intent; no technical fix needed

**Seeker Information in Admin Inbox**
- Admin can see all seeker conversations (full_name, phone, avatar_url)
- No column-level security (all fields visible to admin)
- **Exposure Risk**: low (admin is trusted role)

**Booking Messages**
- Stored in plaintext in `bookings.message` field
- Visible to admin and booking seeker only (RLS enforced)
- No end-to-end encryption

**Payment Reference**
- Paystack reference stored in plaintext in `bookings.payment_reference`
- Visible to admin and seeker (tied to booking_id)

### API & Route Security

**Public Routes**
- `/`, `/login`, `/signup` — no auth required (intentional)
- `/homes`, `/hostels`, `/saved` — read-only, no auth required

**Protected Routes (Client-Side Only)**
- `/post` — checks `useAuth()` for user existence (no server-side guard)
  - If user object exists, form is shown
  - If not logged in, user redirected to login (via client navigation)
  - **Risk**: if client-side check is bypassed, POST request to Supabase would fail (RLS enforced)
- `/dashboard` — requires owner/manager/admin role (client-side check)
- `/admin` — requires admin role (client-side check)

**API Endpoints**
- `/api/upload-image` — no authentication required (accepts public requests)
  - **Risk**: any user can upload files to any path
  - **Mitigation**: storage bucket is public anyway; path obfuscation with UUIDs; no sensitive data
  - **Improvement**: should validate userId and path ownership
- `/api/push-subscribe` — accepts userId from client (no auth validation)
  - **Risk**: user A could subscribe user B to push notifications
  - **Mitigation**: client sends own userId; database UPSERT overwrites previous subscription
  - **Improvement**: should validate userId from auth session
- `/api/push-notify` — accepts userId from request body (no auth validation)
  - **Risk**: any caller can trigger notifications for any user
  - **Improvement**: should be called server-to-server (not exposed to client)

### Database & RLS Issues

**Weak Points**
- Admin role only checked in RLS (no backend middleware)
- If admin profiles.role field is compromised, unauthorized access possible
- Service role key unavailable (can't perform admin operations server-side)
- **No audit logging** of sensitive operations (edits, deletions)

**Strong Points**
- All SELECT, INSERT, UPDATE, DELETE on data tables require RLS policy match
- Policies explicit and checked at DB layer (cannot be bypassed from client)
- Anonymous users cannot write to any table (INSERT requires auth)

### XSS (Cross-Site Scripting) Risks

**Client-Side Rendering**
- All pages use React (JSX, auto-escaped by default)
- `dangerouslySetInnerHTML` **not used** anywhere in codebase
- User input (listing descriptions, messages) rendered as text (safe)
- Third-party scripts: only Paystack (loaded via trusted CDN)

**Potential XSS Vectors**
- Property titles/descriptions from Supabase — stored as text, rendered in JSX (safe)
- Seeker messages in AdminInbox — rendered as plain text (safe)
- Amenity arrays — mapped to hardcoded labels (safe)

### SQL Injection

**Risk Level: Low**
- All Supabase queries use `.from().select()` / `.insert()` / `.update()` SDK (parameterized)
- No raw SQL queries in application code
- Supabase SDK escapes all values before sending to Postgres

### CSRF (Cross-Site Request Forgery)

**Risk Level: Medium**
- No CSRF tokens on POST endpoints (`/api/upload-image`, `/api/push-subscribe`, `/api/push-notify`)
- POST requests from client include `Content-Type: application/json` or `multipart/form-data`
- Browser same-site cookie policy does NOT apply to API routes (cookies not used)
- **Mitigation**: limited impact because:
  - No session cookies (Supabase Auth uses Bearer token in header)
  - POST endpoints don't modify critical state (uploads, subscriptions, notifications are low-impact)

### Environment Variables & Secrets

**Exposed (by design)**
- `NEXT_PUBLIC_SUPABASE_URL` — project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key (intended for client use)
- `NEXT_PUBLIC_PAYSTACK_KEY` — Paystack public key (intended for inline script)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — Web Push public key (intended for browser)

**Hidden (server-only)**
- `SUPABASE_SERVICE_ROLE_KEY` — **empty in .env.local** (not available)
- `VAPID_PRIVATE_KEY` — only available in `/api/push-notify` (server-only runtime)
- `VAPID_EMAIL` — only used in `/api/push-notify`

**Risks**
- Anon key allows anyone to query Supabase (RLS enforces row-level access)
- If anon key is leaked/rotated, need to redeploy
- VAPID keys stored in Next.js env (accessible to all server routes, but only used in push-notify)

### Third-Party Dependencies

**High Risk (Supply Chain)**
- No `npm audit` run before commit (package-lock.json not checked)
- Dependencies include: @supabase/supabase-js, framer-motion, next, react, web-push
- All deps pinned to specific versions (good for reproducibility)
- No deprecated packages detected

**Transitive Dependencies**
- `web-push` — production dependency, requires native modules (not a security issue but deployment risk)

### Deployment Security

**Vercel Hosting**
- Environment variables stored in Vercel dashboard (encrypted at rest)
- Deployment logs accessible via Vercel CLI
- **Risk**: if Vercel account is compromised, all env vars exposed
- **Mitigation**: use GitHub-based deployments, enforce SSO for Vercel account

**GitHub Repository**
- Linked to Vercel (auto-deploy on push to main)
- **Risk**: if GitHub account is compromised, code can be modified
- **Mitigation**: branch protection rules, require PR reviews, enforce signed commits

**Secrets in Git History**
- `.env.local` is in .gitignore (not committed)
- **Risk**: if accidentally committed, available in git history forever
- **Mitigation**: use `git-secrets` pre-commit hook, monitor commits

### Missing Security Features

1. **Rate Limiting** — no endpoint rate limiting (brute force attacks possible)
2. **Input Validation** — minimal (forms rely on HTML5 required, no server-side validation)
3. **Audit Logging** — no logging of sensitive operations (admin edits, deletions, bookings)
4. **Two-Factor Authentication** — not implemented (OTP is mocked)
5. **API Keys/Webhooks** — no webhook verification for Paystack callbacks
6. **Encryption at Rest** — payment references stored in plaintext
7. **Session Timeout** — Supabase auth sessions valid until manually signed out
8. **CORS Headers** — not configured (defaults to allow-all from Supabase)

### Recommended Security Improvements

1. **Enable service role key** in Supabase and store securely in Vercel
2. **Add CSRF tokens** to POST endpoints (or use SameSite cookie policy)
3. **Validate userId** in `/api/push-subscribe` and `/api/push-notify` against session
4. **Implement rate limiting** on `/api/upload-image` and login endpoint
5. **Add audit logging** for admin operations (database triggers or separate audit table)
6. **Verify Paystack webhooks** with signature validation before updating booking status
7. **Hash payment references** or encrypt before storing in database
8. **Implement 2FA** for admin accounts (use Supabase MFA plugin)
9. **Add input validation** on server-side API routes (not just client)
10. **Monitor for leaked credentials** in GitHub (use GitHub secret scanning)

---

## Summary

StayMate is a full-stack Next.js + Supabase P2P real estate platform with dual revenue streams (coordination fees + sponsored listings). The architecture prioritizes **simplicity and rapid iteration** over security hardening:

- **Strengths**: RLS enforced at database layer, no third-party auth integrations, minimal dependencies
- **Weaknesses**: client-side route guards, unvalidated API endpoints, no rate limiting, missing audit logs
- **Deployment**: Vercel + GitHub auto-deploy, environment variables in Vercel dashboard
- **Scale**: optimized for <100k concurrent users; Supabase Postgres should handle 10k+ connections
- **Cost Model**: pay-as-you-go Supabase + Vercel usage-based pricing; Paystack takes 1.95% + GHS 0.50 per transaction

For production deployment, prioritize: service role key setup, API validation, rate limiting, and audit logging.
