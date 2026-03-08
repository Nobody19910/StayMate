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

## Project Structure

```
src/
  app/
    (main)/               # App shell with bottom nav
      homes/              # Home swipe browse
      hostels/            # Hostel swipe browse
      hostels/[id]/       # Hostel room picker
      hostels/[id]/rooms/[roomId]/  # Room detail
      saved/              # Saved homes + hostels tabs
      profile/            # User profile
    layout.tsx            # Root layout
    page.tsx              # Redirect → /homes
  components/
    swipe/                # SwipeCard, SwipeDeck (shared)
    ui/                   # BottomNav, Badge, Button, etc.
  lib/
    types.ts              # All TypeScript interfaces
    mock-data.ts          # Dev mock data
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

## Amenity System (Hostels)

Each `Room` has an `amenities` array typed as `RoomAmenity[]`. Defined amenities:
`wifi` | `ac` | `attached-bath` | `hot-water` | `laundry` | `study-desk` |
`wardrobe` | `balcony` | `meal-included` | `security` | `cctv` | `generator`

Room types: `single` | `double` | `triple` | `quad` | `dormitory`

## Phase Tracker

- [x] Phase 1 — Foundation & Core Swipe UI (in progress)
- [ ] Phase 2 — Listings, Filters & Property Detail
- [ ] Phase 3 — Auth & Two-Sided User System
- [ ] Phase 4 — Direct Messaging & Booking Flow
- [ ] Phase 5 — Trust, Verification & Monetisation
