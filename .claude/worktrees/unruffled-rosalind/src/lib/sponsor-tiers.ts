import type { SponsorTierOption } from "./types";

/** Legacy tiers — kept for backward-compat with existing DB rows */
export const LEGACY_SPONSOR_TIERS: SponsorTierOption[] = [
  {
    tier: "basic",
    label: "3-Day Boost",
    price: 15,
    pricePesewas: 1500,
    durationDays: 3,
    perks: ["Pinned to top of listings for 3 days"],
  },
  {
    tier: "standard",
    label: "10-Day Boost",
    price: 50,
    pricePesewas: 5000,
    durationDays: 10,
    perks: ["Pinned to top of listings for 10 days"],
  },
  {
    tier: "featured",
    label: "Featured Spotlight",
    price: 70,
    pricePesewas: 7000,
    durationDays: 10,
    perks: [
      "Appears in Featured Carousel",
      "Pinned to top of listings",
      "Gold sponsored badge",
    ],
  },
];

/** New sponsor tiers — shown to users */
export const SPONSOR_TIERS: SponsorTierOption[] = [
  {
    tier: "starter",
    label: "Starter",
    price: 20,
    pricePesewas: 2000,
    durationDays: 3,
    perks: [
      "Pinned to top for 3 days",
      "Sponsored badge on card",
    ],
  },
  {
    tier: "growth",
    label: "Growth",
    price: 55,
    pricePesewas: 5500,
    durationDays: 7,
    perks: [
      "Pinned to top for 7 days",
      "Gold sponsored badge",
      "Priority in search results",
    ],
  },
  {
    tier: "premium",
    label: "Premium",
    price: 90,
    pricePesewas: 9000,
    durationDays: 14,
    perks: [
      "Featured Carousel placement",
      "Pinned to top for 14 days",
      "Gold sponsored badge",
      "\"Hot\" tag on listing card",
      "Performance analytics access",
    ],
  },
];

export const FREE_LISTING_LIMIT = 3;
export const PER_LISTING_FEE = 20; // GHS per listing after free limit
export const PER_LISTING_FEE_PESEWAS = 2000;
export const AGENT_SUBSCRIPTION_PRICE = 100; // GHS
export const AGENT_SUBSCRIPTION_PESEWAS = 10000;
export const AGENT_SUBSCRIPTION_DAYS = 30;
