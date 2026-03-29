# StayMate Web — CLAUDE.md
**Platform:** Web (Desktop + Mobile browser) + Capacitor (iOS/Android shell)
**Framework:** Next.js 16.x (App Router) + TypeScript 5 + Tailwind CSS v4
**Folder:** `StayMate Apps / StayMate Web`

---

## Mission
StayMate is a luxury P2P real estate platform and dual-income marketplace. Owners list their own homes, hostel managers list their own buildings — seekers contact them directly through StayMate as the coordinating concierge. No third-party broker. No commission.

**Two revenue streams:**
1. **GH₵ 200 Coordination & Viewing Fee** — charged to seekers per accepted inquiry (Paystack)
2. **Sponsored Listings Revenue** — property owners pay to pin listings at the top of browse

---

## Tech Stack

| Layer        | Choice                         | Version  |
|--------------|--------------------------------|----------|
| Framework    | Next.js (App Router)           | 16.1.6   |
| Language     | TypeScript                     | 5.x      |
| Styling      | Tailwind CSS                   | 4.x      |
| Fonts        | Inter + Playfair Display       | —        |
| Animation    | Framer Motion                  | 12.x     |
| Database     | Supabase (Postgres)            | latest   |
| Auth         | Supabase Auth (email + OAuth)  | latest   |
| Realtime     | Supabase Realtime              | latest   |
| Payments     | Paystack (GHS)                 | —        |
| Push         | Web Push API (VAPID)           | —        |
| Native shell | Capacitor                      | 7.x      |
| Runtime      | Node.js 20+                    | —        |

---

## Design System: Uber Noir

| Token              | Light                    | Dark                       | Usage                         |
|--------------------|--------------------------|----------------------------|-------------------------------|
| `--uber-black`     | `#000000`                | `#FFFFFF`                  | Primary text, accents         |
| `--uber-white`     | `#FFFFFF`                | `#1A1A1A`                  | Cards, panels                 |
| `--uber-green`     | `#06C167`                | `#06C167`                  | CTAs, badges, active nav      |
| `--uber-surface`   | `#F6F6F6`                | `#111111`                  | Page background               |
| `--uber-surface2`  | `#EEEEEE`                | `#1E1E1E`                  | Secondary surfaces            |
| `--uber-text`      | `#1A1A1A`                | `#F0F0F0`                  | Body text                     |
| `--uber-muted`     | `#6B6B6B`                | `#8E8E8E`                  | Secondary text, placeholders  |
| `--uber-btn-bg`    | `#1A1A1A`                | `#F0F0F0`                  | Button backgrounds (inverts)  |
| `--uber-btn-text`  | `#FFFFFF`                | `#111111`                  | Button text                   |
| `--uber-card-bg`   | `#FFFFFF`                | `#1A1A1A`                  | Card backgrounds              |
| `--uber-border`    | `rgba(0,0,0,0.09)`       | `rgba(255,255,255,0.10)`   | Hairline borders (0.5px)      |
| `--gold`           | `#D4AF37`                | `#D4AF37`                  | Sponsored badges, fee banners |

- Dark mode via `html.dark` class (ThemeProvider, persisted to localStorage)
- All borders: `0.5px` hairlines — never Tailwind `border-gray-*`
- Shadows: `box-shadow: 0 2px 16px rgba(0,0,0,0.07)`
- Serif font (Playfair Display): property titles, H1s
- Sans font (Inter): all UI text
- Use CSS variables (`var(--uber-text)`) not hardcoded hex

---

## Project Structure

```
src/
  app/
    (seeker)/           # Seeker-facing routes
      homes/            # Home grid browse + detail
      hostels/          # Hostel grid + room picker + room detail
      saved/            # Saved homes + hostels (localStorage)
      profile/          # User profile + inquiries
      chat/             # Seeker ↔ concierge chat
    (admin)/            # Admin-facing routes
      inbox/            # AdminInbox (chat + booking management)
    auth/
      callback/         # OAuth PKCE server route (receives ?code=)
      complete/         # Client page — exchanges code → session → /homes
    post/               # Multi-step listing submission form
    login/
    signup/
    dashboard/          # Owner/manager property dashboard
    api/
      upload-image/     # Supabase storage upload
      push-subscribe/   # Store VAPID push subscription
      push-notify/      # Send web push notification

  components/
    swipe/              # SwipeCard + SwipeDeck — DORMANT, do not modify
    ui/                 # BottomNav, SideNav, FilterModal, DistanceBadge, etc.
    admin/              # AdminInbox component

  lib/
    types.ts            # All TypeScript interfaces
    auth-context.tsx    # AuthProvider + useAuth hook
    api.ts              # Supabase query helpers (sponsored-first ordering)
    supabase.ts         # Supabase client
    paystack.ts         # Paystack script loader + openPaystackPopup
    saved-store.ts      # localStorage saved items
    theme-context.tsx   # ThemeProvider (dark/light toggle)

  proxy.ts              # Sub-domain routing (seeker vs admin by host header)
```

---

## How the App Works

### Two Core Sections

**Homes (P2P Property)**
- 2-column grid browse with sticky search/filter header
- Sponsored listings appear first (gold shimmer badge `✦ Sponsored`)
- Filters: listing type (rent/sale), amenities, price range, radius (geolocation)
- Card tap → property detail → inquiry CTA

**Hostels (Student Accommodation)**
- Same grid pattern as homes
- Two levels of selection: hostel card → room picker grid → room detail
- Rooms have individual amenity badges, price, capacity, availability

### Booking / Enquiry State Machine
```
pending → accepted → fee_paid → viewing_scheduled → completed
                ↘ rejected
```
1. Seeker submits enquiry → status: `pending`
2. Admin accepts or rejects from AdminInbox
3. On `accepted`: Paystack modal auto-opens in seeker chat (GH₵ 200 = 20000 pesewas)
4. On payment: status → `fee_paid`, `payment_reference` stored
5. Admin schedules viewing → `viewing_scheduled` → `completed`

### Sub-Domain Architecture
- `staymate-eight.vercel.app` → Seeker domain (homes, hostels, chat, profile)
- `admin.staymate-eight.vercel.app` → Admin domain (inbox, management)
- `src/proxy.ts` reads `host` header and redirects accordingly

### OAuth Flow (PKCE)
- Google/Apple → Supabase PKCE → redirects to `/auth/callback`
- Server route extracts `?code=` → forwards to `/auth/complete`
- Client page exchanges code → session → navigates to `/homes`
- **Capacitor native:** `CapacitorOAuthHandler` listens for `appUrlOpen` deep link (`com.staymate.app://`) and calls `supabase.auth.exchangeCodeForSession(code)`

---

## User Roles

| Role      | How acquired                                      |
|-----------|---------------------------------------------------|
| `seeker`  | Default on signup                                 |
| `owner`   | Auto-promoted when seeker submits a home listing  |
| `manager` | Auto-promoted when seeker submits a hostel listing|
| `admin`   | Manually set in DB                                |

---

## DB Key Tables
- `profiles` — id, full_name, phone, role, avatar_url
- `homes` — listing data, owner_id, is_sponsored, priority_score, video_url
- `hostels` — listing data, manager_id, is_sponsored, nearby_universities
- `rooms` — linked to hostel_id, room_type, price, amenities
- `bookings` — user_id, property_id, status, payment_reference
- `conversations` — seeker_id, property_id, property_title, property_image
- `messages` — conversation_id, sender_id, content, is_read
- `push_subscriptions` — user_id, endpoint, p256dh, auth

---

## Phase Tracker

- [x] **Phase 1** — Foundation & Swipe UI (SwipeCard + SwipeDeck — dormant)
- [x] **Phase 2** — Listings, Filters & Property Detail
- [x] **Phase 3** — Auth, Roles & Two-Sided User System
- [x] **Phase 4** — Direct Messaging, Booking Flow & Admin Command Centre
- [x] **Phase 5** — Noir Rebrand, Sponsored Listings, Realtime Chat, Web Push Notifications
- [x] **Phase 6** — Uber Theme, Desktop Responsive Layout, Dark Mode Dual-Token System
- [x] **Phase 7** — Sub-Domain Split, OAuth PKCE fix, Capacitor deep-link (`com.staymate.app://`), CSS `content-visibility` performance, color token unification across all components
- [ ] **Phase 8** — Video Tours (video_url field exists in DB, UI not yet built)
- [ ] **Phase 9** — Full Capacitor iOS + Android production builds

---

## Key Rules

1. **Swipe components** (`src/components/swipe/`) are DORMANT — do not modify or delete
2. All borders must be `0.5px` hairlines — never `border-gray-*` Tailwind classes
3. Use CSS variables (`var(--uber-text)`) not hardcoded hex — dark mode compatibility
4. Gold (`#D4AF37`) used **only** for sponsored badges and fee banners
5. No "agent", "broker", "commission" in UI — use "concierge"
6. Realtime for chat/bookings; polling only for unread badge (10s interval)
7. `Animated` API (built-in) for splash — do not introduce Reanimated conflicts

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_EMAIL
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
PAYSTACK_SECRET_KEY
```

---

## Deployment

- **Web:** Vercel — auto-deploys from GitHub `main` branch
- **iOS (Capacitor):** `npx cap sync ios` → Xcode → Archive → App Store
- **Android (Capacitor):** `npx cap sync android` → Android Studio → APK/AAB
