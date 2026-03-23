import type { SponsorTierOption } from "./types";

export const SPONSOR_TIERS: SponsorTierOption[] = [
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

export const AGENT_SUBSCRIPTION_PRICE = 100; // GHS
export const AGENT_SUBSCRIPTION_PESEWAS = 10000;
export const AGENT_SUBSCRIPTION_DAYS = 30;
