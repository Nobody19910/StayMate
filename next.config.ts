import type { NextConfig } from "next";
import withPWA from "next-pwa";

const config: NextConfig = {
  // @ts-ignore
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "mflxmulbguafoyytgumk.supabase.co",
      },
    ],
  },
};

const nextConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
})(config);

export default nextConfig;
