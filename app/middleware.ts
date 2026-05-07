// middleware.ts — StarsQ Route Protection
// ─────────────────────────────────────────────────────────────────────────────
// Runs on the Edge runtime before every matching request.
// /filmlab and /signal require a valid starsq_session cookie.
// Unauthenticated requests are redirected to /login with ?from= so the
// login page can redirect back after successful authentication.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

// Cookie name must match what /app/login/page.tsx writes on successful auth.
export const SESSION_COOKIE = "starsq_session";

// Routes that require authentication.
// Add future protected modules here — e.g. "/castlab", "/risklab".
const PROTECTED_PREFIXES = ["/filmlab", "/signal"];

// Routes that are always public (login page must never redirect-loop).
const PUBLIC_PREFIXES = ["/login", "/_next", "/favicon", "/api"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never intercept public routes
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check if this path requires authentication
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // Validate session cookie
  const session = request.cookies.get(SESSION_COOKIE);
  if (session?.value) {
    return NextResponse.next();
  }

  // No valid session — redirect to /login with return URL
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

// Explicit path matchers — middleware only runs on protected routes.
// More precise than a broad catch-all; avoids intercepting static assets.
export const config = {
  matcher: [
    "/filmlab/:path*",
    "/signal/:path*",
  ],
};
