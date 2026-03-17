import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  // Skip proxy for assets and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  const isAdminDomain = host.startsWith("admin.");

  // Redirect root path based on domain
  if (pathname === "/") {
    if (isAdminDomain) {
      return NextResponse.redirect(new URL("/inbox", request.url));
    }
    // Seeker domain: /homes is the default (handled by (seeker)/page.tsx redirect)
    return NextResponse.next();
  }

  // Allow /inbox on all domains — admin page has its own client-side auth guard
  // (subdomain routing is optional; admins can access /inbox directly)

  // Block seeker routes on admin domain
  if (
    isAdminDomain &&
    (pathname.startsWith("/homes") ||
      pathname.startsWith("/hostels") ||
      pathname.startsWith("/post") ||
      pathname.startsWith("/saved") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/dashboard"))
  ) {
    return NextResponse.redirect(new URL("/inbox", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
