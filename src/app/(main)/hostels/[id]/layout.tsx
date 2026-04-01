import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";

const BASE = "https://staymate-eight.vercel.app";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabase
    .from("hostels")
    .select("name, description, images, city, state")
    .eq("id", id)
    .single();

  if (!data) return { title: "StayMate — Find Your Hostel" };

  const title = `${data.name} | StayMate`;
  const description =
    data.description?.slice(0, 155) ||
    `${data.name} in ${data.city}, ${data.state}. Find student accommodation on StayMate.`;

  const ogParams = new URLSearchParams({
    title: data.name,
    city: data.city ?? "",
    type: "hostel",
    ...(data.images?.[0] ? { image: data.images[0] } : {}),
  });
  const image = `${BASE}/api/og?${ogParams.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: data.name }],
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

export default function HostelDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
