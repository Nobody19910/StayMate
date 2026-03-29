import { NextRequest, NextResponse } from "next/server";

/**
 * Validates the Origin header to prevent cross-site request forgery.
 * Returns a 403 response if the origin is not allowed, or null if OK.
 */

const ALLOWED_ORIGINS = [
  "https://staymate-eight.vercel.app",
  "https://admin-staymate-eight.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://admin.localhost:3000",
];

export function checkCsrf(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");

  // No origin header = same-origin request or non-browser client (allow)
  if (!origin) return null;

  if (ALLOWED_ORIGINS.includes(origin)) return null;

  return NextResponse.json(
    { error: "Forbidden: invalid origin" },
    { status: 403 }
  );
}
