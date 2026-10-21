import arcjet, { detectBot, fixedWindow, request, shield } from "@arcjet/next";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isDemoEmail } from "@/lib/send-email";

const arcjetMode =
  process.env.NODE_ENV === "development" || process.env.ARCJET_ENV === "development"
    ? "DRY_RUN"
    : "LIVE";

const aj = arcjet({
  key: process.env.ARCJET_KEY ?? "",
  rules: [
    shield({ mode: arcjetMode }),
    detectBot({
      mode: arcjetMode,
      allow: ["CATEGORY:SEARCH_ENGINE", "GO_HTTP"],
    }),
    fixedWindow({
      mode: "LIVE",
      window: "10m",
      max: 10,
    }),
  ],
});

function demoEmail() {
  return (process.env.DEMO_USER_EMAIL || "maya@example.com").trim().toLowerCase();
}

export async function POST(incoming: Request) {
  try {
    const req = await request();
    const decision = await aj.protect({
      ...req,
      headers: incoming.headers,
    });
    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return NextResponse.json({ error: "Too many requests." }, { status: 429 });
      }
      if (arcjetMode === "LIVE") {
        return NextResponse.json({ error: "Request blocked." }, { status: 403 });
      }
    }
  } catch {
    // Arcjet itself failed; allow the request.
  }

  const email = demoEmail();
  if (!isDemoEmail(email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const client = await clerkClient();
    const list = await client.users.getUserList({ emailAddress: [email], limit: 1 });
    const user = list.data[0];
    if (!user) {
      return NextResponse.json({ error: "Demo user was not found." }, { status: 404 });
    }
    const token = await client.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 60,
    });
    return NextResponse.json({ ticket: token.token });
  } catch {
    return NextResponse.json({ error: "The demo is unavailable right now." }, { status: 503 });
  }
}
