import { NextRequest, NextResponse } from "next/server";

// This route catches the OAuth code and hands it to the client-side page
// to exchange (since auth state lives in browser localStorage, not cookies).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }

  // Pass the code along to a client page that can exchange it and persist the session
  if (code) {
    return NextResponse.redirect(`${origin}/auth/complete?code=${encodeURIComponent(code)}`);
  }

  return NextResponse.redirect(`${origin}/homes`);
}
