import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";

const BASE = "https://staymate-eight.vercel.app";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabase
    .from("homes")
    .select("title, description, images, price_label, city, state")
    .eq("id", id)
    .single();

  if (!data) return { title: "StayMate — Find Your Home" };

  const title = `${data.title} — ${data.price_label} | StayMate`;
  const description =
    data.description?.slice(0, 155) ||
    `${data.title} in ${data.city}, ${data.state}. Find your perfect home on StayMate.`;

  const ogParams = new URLSearchParams({
    title: data.title,
    price: data.price_label ?? "",
    city: data.city ?? "",
    type: "home",
    ...(data.images?.[0] ? { image: data.images[0] } : {}),
  });
  const image = `${BASE}/api/og?${ogParams.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: data.title }],
      type: "website",
      siteName: "StayMate",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function HomeDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
