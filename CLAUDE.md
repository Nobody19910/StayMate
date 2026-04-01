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
| Payments     | Paystack (GHS) — TEST KEY ONLY | —        |
| Push         | Web Push API (VAPID)           | —        |
| Native shell | Capacitor                      | 7.x      |
| Runtime      | Node.js 20+                    | —        |

> ⚠️ **Paystack is on the TEST secret key.** When the user provides the live key, replace `PAYSTACK_SECRET_KEY` in Vercel env vars and update `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` to the live public key.

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
    (main)/
      homes/            # Home browse + detail
      hostels/          # Hostel browse + room picker + room detail
      saved/            # Saved homes + hostels
      profile/          # User profile + booking tickets
      chat/             # Seeker chat
      admin/            # Admin dashboard
    auth/
      callback/         # OAuth PKCE server route
      complete/         # Client page — exchanges code → session
    post/               # Multi-step listing submission form
    login/
    signup/
    dashboard/          # Owner/agent property dashboard
    receipt/[bookingId] # Printable payment receipt
    api/
      upload-image/     # Supabase storage upload
      push-subscribe/   # Store VAPID push subscription
      push-notify/      # Send web push notification

  components/
    swipe/              # SwipeCard + SwipeDeck — DORMANT, do not modify
    ui/                 # BottomNav, TopNav, FilterModal, PhoneInput, ReviewsSection,
                        # NotificationCenter, SavedSearches, BookingKanbanCard, etc.

  lib/
    types.ts            # All TypeScript interfaces (Property, Hostel, Room, etc.)
    auth-context.tsx    # AuthProvider + useAuth hook
    api.ts              # Supabase query helpers — rowToProperty mapper lives here
    supabase.ts         # Supabase client
    paystack.ts         # Paystack script loader + openPaystackPopup
    saved-store.ts      # localStorage saved items
    theme-context.tsx   # ThemeProvider (dark/light toggle)
    african-countries.ts # 54 African countries with dial codes, toE164() helper
    ghana-locations.ts  # Ghana regions + districts for location filter

  proxy.ts              # Sub-domain routing
```

---

## How the App Works

### Two Core Sections

**Homes (P2P Property)**
- Browse grouped by city (default), toggle to flat list
- Sponsored listings appear first (gold shimmer badge `✦ Sponsored`)
- Filters: listing type (rent/sale), amenities, price range, radius (geolocation)
- Card tap → property detail → inquiry CTA
- Rented/Sold listings stay visible with amber overlay + free waitlist (no fee)

**Hostels (Student Accommodation)**
- Same pattern as homes, grouped by city
- Hostel card → room picker → room detail
- Full hostel shows "Join Waitlist — Free" flow

### Booking / Enquiry State Machine
```
pending → accepted → fee_paid → viewing_scheduled → completed
                ↘ rejected
waitlist  (rented/sold properties — no fee, notification queue only)
```
1. Seeker submits enquiry → `pending`
2. Admin accepts/rejects from Admin dashboard
3. On `accepted`: Paystack modal opens (GH₵ 200 = 20000 pesewas)
4. Payment → `fee_paid`, `payment_reference` stored, receipt available at `/receipt/[id]`
5. Admin OR Owner clicks "🔑 Rented" / "🏷 Sold" → `completed`
6. Property status → rented/sold → seeker sees rating prompt (property + agent + concierge)

### Admin Dashboard Tabs
Pipeline | Dashboard | Approval Queue | Audit | Live Properties | Live Hostels | Booked/Rented | Featured | Seeker Leads | Agents | Applications | Users | KYC

- **Live Properties / Hostels**: searchable, groupable by location or agent, Edit button bypasses owner check for admin
- **Booked/Rented**: all rented+sold properties with "✓ Mark Available" to re-list
- Admin can post any listing (auto-approved), edit any listing (owner check bypassed)

---

## User Roles

| Role      | How acquired                                        |
|-----------|-----------------------------------------------------|
| `seeker`  | Default on signup                                   |
| `owner`   | Auto-promoted when first home listing submitted     |
| `manager` | Auto-promoted when first hostel listing submitted   |
| `agent`   | Subscription-based; 3+ properties requires upgrade  |
| `admin`   | Manually set in DB                                  |

---

## DB Key Tables
- `profiles` — id, full_name, phone, role, avatar_url, is_agent, agent_subscription_until
- `homes` — listing data, owner_id, is_sponsored, priority_score, video_url, rules (jsonb), nearby (jsonb), view_count, is_verified, status
- `hostels` — listing data, manager_id, is_sponsored, nearby_universities, view_count, status
- `rooms` — linked to hostel_id, room_type, price, amenities
- `bookings` — user_id, property_id, property_ref, status, payment_reference, closed_by, close_action, waitlist flag
- `conversations` + `messages` — realtime chat
- `push_subscriptions` — VAPID web push
- `reviews` — booking_id, target_type (property/agent/concierge), rating 1–5, comment
- `saved_searches` — user_id, name, filters (jsonb), notify
- `notifications` — user_id, title, body, type, read, action_url
- `kyc_submissions` — user_id, document_type, document_url, status

---

## Phase Tracker

- [x] **Phase 1** — Foundation & Swipe UI (SwipeCard + SwipeDeck — dormant)
- [x] **Phase 2** — Listings, Filters & Property Detail
- [x] **Phase 3** — Auth, Roles & Two-Sided User System
- [x] **Phase 4** — Direct Messaging, Booking Flow & Admin Command Centre
- [x] **Phase 5** — Noir Rebrand, Sponsored Listings, Realtime Chat, Web Push Notifications
- [x] **Phase 6** — Uber Theme, Desktop Responsive Layout, Dark Mode Dual-Token System
- [x] **Phase 7** — Sub-Domain Split, OAuth PKCE fix, Capacitor deep-link, performance, token unification
- [x] **Phase 8** — African PhoneInput · Reviews & Ratings · Payment Receipts · Listing Analytics · Saved Searches · Verification Badge · Close Deal flow · Waitlist for rented/sold · Admin dashboard overhaul · Location grouping on browse · Hostel detail parity · Video Tours · Notification Centre · Admin edit/post bypass · Agent search · Rules & Nearby fix
- [ ] **Phase 9** — Capacitor iOS + Android production builds (`npx cap sync` ready)

---

## Roadmap — Pending Features

### 🟢 Quick Wins (do these next)
- [ ] **Recently Viewed** — localStorage, last 10 listings visited. Show on homes/hostels browse page. High retention.
- [ ] **Similar Properties** — 3–4 cards in same city/type shown below booking widget on detail page
- [ ] **Error Boundaries** — React error boundary wrapper around key pages, friendly fallback UI
- [ ] **Dark mode skeleton fix** — loading skeletons use hardcoded light colours, broken in dark mode
- [ ] **SEO / og:image** — each listing page needs `<meta og:image>`, `og:title`, `og:description` for WhatsApp/Twitter unfurling

### 🟡 Medium Priority
- [ ] **Email notifications** — Supabase transactional email: booking confirmed, inquiry received, deal closed, waitlist spot opened
- [ ] **Report listing** — flag button on listing → admin queue. Required before scaling.
- [ ] **Refund request flow** — in-app form instead of manual admin contact
- [ ] **File attachments in chat** — agents send floor plans, seekers send income proof
- [ ] **Onboarding flow** — 2–3 first-launch screens explaining how StayMate works

### 🔴 Bigger Initiatives
- [ ] **Full-text search** — Supabase `to_tsvector()` keyword search across titles + descriptions
- [ ] **Phase 9 — iOS/Android** — `npx cap sync ios` → Xcode → App Store; `npx cap sync android` → Play Store
- [ ] **Paystack live key** — swap test key for live key when provided (update both Vercel env vars)

---

## Key Rules

1. **Swipe components** (`src/components/swipe/`) are DORMANT — do not modify or delete
2. All borders must be `0.5px` hairlines — never `border-gray-*` Tailwind classes
3. Use CSS variables (`var(--uber-text)`) not hardcoded hex — dark mode compatibility
4. Gold (`#D4AF37`) used **only** for sponsored badges and fee banners
5. No "agent", "broker", "commission" in UI copy — use "concierge"
6. Realtime for chat/bookings; polling only for unread badge (10s interval)
7. **Map view is intentionally excluded** — showing exact locations lets seekers bypass the platform and talk directly to owners
8. Listings grouped by city on browse pages by default (toggle to flat list available)
9. Rented/sold listings stay visible in browse — they show a waitlist overlay, NOT hidden
10. `rowToProperty()` in `api.ts` is the single source of truth for DB→Property mapping — always add new columns here
11. Admin can edit/post any property — ownership check bypassed when `profile.role === "admin"`

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_EMAIL
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY   ← TEST key currently, swap for live when ready
PAYSTACK_SECRET_KEY               ← TEST key currently, swap for live when ready
```

---

## Deployment

- **Web:** `vercel --prod --yes` from project root
- **iOS (Capacitor):** `npx cap sync ios` → Xcode → Archive → App Store
- **Android (Capacitor):** `npx cap sync android` → Android Studio → APK/AAB
