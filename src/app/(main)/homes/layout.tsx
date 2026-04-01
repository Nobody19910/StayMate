import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Homes for Rent & Sale in Ghana | StayMate",
  description: "Browse verified homes and apartments for rent and sale across Ghana. No broker fees. Find your perfect home directly from owners on StayMate.",
  openGraph: {
    title: "Homes for Rent & Sale in Ghana | StayMate",
    description: "Browse verified homes and apartments for rent and sale across Ghana. No broker fees. Find your perfect home directly from owners on StayMate.",
    images: [{ url: "https://staymate-eight.vercel.app/og-default.jpg", width: 1200, height: 630 }],
    siteName: "StayMate",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Homes for Rent & Sale in Ghana | StayMate",
    description: "Browse verified homes and apartments for rent and sale across Ghana.",
  },
};

export default function HomesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
