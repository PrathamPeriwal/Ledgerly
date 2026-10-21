import arcjet, { createMiddleware, detectBot, shield } from "@arcjet/next";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/account(.*)",
  "/transaction(.*)",
]);

const isDemoRoute = createRouteMatcher(["/demo", "/api/demo-session"]);

// Headless checks set ARCJET_ENV=development. Live bot rules block that traffic.
const arcjetMode =
  process.env.NODE_ENV === "development" || process.env.ARCJET_ENV === "development"
    ? "DRY_RUN"
    : "LIVE";

// Create Arcjet middleware
const aj = arcjet({
  key: process.env.ARCJET_KEY,
  // characteristics: ["userId"], // Track based on Clerk userId
  rules: [
    // Shield protection for content and security
    shield({
      mode: arcjetMode,
    }),
    detectBot({
      mode: arcjetMode,
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        "GO_HTTP", // For Inngest
        // See the full list at https://arcjet.com/bot-list
      ],
    }),
  ],
});

// Create base Clerk middleware
const clerk = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const url = req.nextUrl;

  if (isDemoRoute(req)) {
    return NextResponse.next();
  }

  // If user is signed in and trying to access auth pages, redirect to dashboard
  if (userId && (url.pathname === '/sign-in' || url.pathname === '/sign-up')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // If user is not signed in and trying to access protected routes, redirect to sign-in
  if (!userId && isProtectedRoute(req)) {
    const { redirectToSignIn } = await auth();
    return redirectToSignIn();
  }

  return NextResponse.next();
});

const shielded = createMiddleware(aj, clerk);

export default function middleware(req, event) {
  if (isDemoRoute(req) || arcjetMode === "DRY_RUN") return clerk(req, event);
  return shielded(req, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Include auth routes
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/demo",
    "/api/demo-session",
  ],
};
