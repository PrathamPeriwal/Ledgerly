import arcjet, { createMiddleware, detectBot, shield } from "@arcjet/next";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/account(.*)", "/transaction(.*)"]);
const isDemoRoute = createRouteMatcher(["/demo", "/api/demo-session"]);

const arcjetMode =
  process.env.NODE_ENV === "development" || process.env.ARCJET_ENV === "development" ? "DRY_RUN" : "LIVE";

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({ mode: arcjetMode }),
    detectBot({
      mode: arcjetMode,
      allow: ["CATEGORY:SEARCH_ENGINE", "GO_HTTP", "CURL"],
    }),
  ],
});

function isAuthPath(pathname) {
  return (
    pathname === "/sign-in" ||
    pathname.startsWith("/sign-in/") ||
    pathname === "/sign-up" ||
    pathname.startsWith("/sign-up/")
  );
}

function cleanAppUrl(url) {
  const next = new URL(url.pathname, url.origin);
  for (const [key, value] of url.searchParams) {
    if (key === "redirect_url" || key.startsWith("__clerk")) continue;
    next.searchParams.append(key, value);
  }
  if (isAuthPath(next.pathname)) return new URL("/dashboard", url.origin);
  return next;
}

function unwrapReturn(value, origin) {
  let current = value;
  for (let i = 0; i < 5; i += 1) {
    let parsed;
    try {
      parsed = new URL(current, origin);
    } catch {
      return "/dashboard";
    }
    const inner = parsed.searchParams.get("redirect_url");
    if (inner && (isAuthPath(parsed.pathname) || current.includes("redirect_url=") || current.includes("__clerk"))) {
      current = inner;
      continue;
    }
    const clean = cleanAppUrl(parsed);
    return `${clean.pathname}${clean.search}`;
  }
  return "/dashboard";
}

function sanitize(req) {
  const url = req.nextUrl.clone();
  const size = url.pathname.length + url.search.length;
  const redirect = url.searchParams.get("redirect_url");
  if (size <= 1800 && !redirect) return null;

  if (size > 1800) {
    if (isAuthPath(url.pathname)) {
      const back = redirect ? unwrapReturn(redirect, url.origin) : "";
      const clean = new URL(url.pathname, url.origin);
      if (back && !isAuthPath(new URL(back, url.origin).pathname)) clean.searchParams.set("redirect_url", back);
      return NextResponse.redirect(clean);
    }
    return NextResponse.redirect(cleanAppUrl(url));
  }

  const back = unwrapReturn(redirect, url.origin);
  const parsed = new URL(back, url.origin);
  const short = `${parsed.pathname}${parsed.search}`;
  let already = redirect === short;
  if (!already) {
    try {
      const given = new URL(redirect, url.origin);
      already =
        `${given.pathname}${given.search}` === short &&
        !given.searchParams.has("redirect_url") &&
        ![...given.searchParams.keys()].some((key) => key.startsWith("__clerk"));
    } catch {
      already = false;
    }
  }
  if (isAuthPath(url.pathname)) {
    if (isAuthPath(parsed.pathname)) {
      url.searchParams.delete("redirect_url");
      return NextResponse.redirect(url);
    }
    if (!already) {
      url.searchParams.set("redirect_url", short);
      return NextResponse.redirect(url);
    }
    return null;
  }

  if (redirect.includes("redirect_url=") || redirect.includes("__clerk")) {
    url.searchParams.delete("redirect_url");
    return NextResponse.redirect(url);
  }
  return null;
}

const clerk = clerkMiddleware(async (auth, req) => {
  if (isDemoRoute(req)) return NextResponse.next();

  const { userId, redirectToSignIn } = await auth();
  const path = req.nextUrl.pathname;

  if (userId && (path === "/sign-in" || path === "/sign-up")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (!isProtectedRoute(req)) return NextResponse.next();
  if (userId) {
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  const back = cleanAppUrl(req.nextUrl);
  const res = redirectToSignIn({ returnBackUrl: back.href });
  res.headers.set("Cache-Control", "no-store");
  return res;
});

const shielded = createMiddleware(aj, clerk);

export default async function middleware(req, event) {
  const cleaned = sanitize(req);
  if (cleaned) {
    cleaned.headers.set("Cache-Control", "no-store");
    return cleaned;
  }
  const path = req.nextUrl.pathname;
  const needsArcjet =
    path.startsWith("/api/") ||
    path === "/demo" ||
    path.startsWith("/demo/") ||
    req.method !== "GET";
  const run = arcjetMode === "DRY_RUN" || !needsArcjet ? clerk : shielded;
  const res = await run(req, event);
  if (res && isProtectedRoute(req)) res.headers.set("Cache-Control", "no-store");
  return res;
}

// Public marketing routes ("/", "/privacy", robots, sitemap, manifest, generated images, icons) and
// static assets never run middleware. ".+" after the first slash also leaves "/" out.
// Everything else (dashboard, account, transaction, demo, auth, API, dev) stays matched.
export const config = {
  matcher: [
    "/((?!_next|privacy$|robots\\.txt$|sitemap\\.xml$|manifest\\.webmanifest$|opengraph-image|twitter-image|icon|apple-icon|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).+)",
    "/(api|trpc)(.*)",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/demo",
    "/api/demo-session",
  ],
};
