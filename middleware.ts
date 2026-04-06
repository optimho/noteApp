import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isRateLimited } from "./lib/rateLimit";

const protectedPaths = ["/dashboard", "/notes"];

const authRateLimitedPaths = [
  "/api/auth/sign-in",
  "/api/auth/sign-up",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limit auth endpoints
  if (authRateLimitedPaths.some((p) => pathname.startsWith(p))) {
    const forwarded = request.headers.get("x-forwarded-for");
    const forwardedIp = forwarded ? (forwarded.split(",")[0] ?? "").trim() || null : null;
    const ip = forwardedIp ?? request.headers.get("x-real-ip") ?? "unknown";

    if (isRateLimited(ip)) {
      return new NextResponse(
        JSON.stringify({ error: "Too many attempts. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // better-auth session cookie check
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ??
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/notes/:path*", "/api/auth/:path*"],
};
