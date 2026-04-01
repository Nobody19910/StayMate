import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import PwaInit from "@/components/ui/PwaInit";
import ThemeProvider from "@/lib/theme-context";
import AppShell from "@/components/ui/AppShell";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StayMate — Find Your Perfect Home in Ghana",
  description: "Browse verified homes and hostels for rent and sale across Ghana. No broker fees. Direct from owners.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StayMate",
  },
  openGraph: {
    title: "StayMate — Find Your Perfect Home in Ghana",
    description: "Browse verified homes and hostels for rent and sale across Ghana. No broker fees. Direct from owners.",
    images: [{ url: "https://staymate-eight.vercel.app/og-default.jpg", width: 1200, height: 630 }],
    siteName: "StayMate",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StayMate",
    description: "Find your perfect home in Ghana.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <ErrorBoundary>
              <AppShell>{children}</AppShell>
            </ErrorBoundary>
          </AuthProvider>
          <PwaInit />
        </ThemeProvider>
      </body>
    </html>
  );
}
