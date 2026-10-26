import { NextResponse } from "next/server";
import { fixedWindow, request } from "@arcjet/next";
import aj from "@/lib/arcjet";
import { db } from "@/lib/prisma";

const limit = aj.withRule(
  fixedWindow({ mode: "LIVE", characteristics: ["ip.src"], window: "1m", max: 30 }),
);

const headers = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
};

export async function GET() {
  try {
    const decision = await limit.protect(await request(), { userId: "health", requested: 1 });
    if (decision.isDenied()) {
      return NextResponse.json({ ok: false }, { status: 429, headers });
    }
  } catch {
    // Arcjet itself failed; allow the ping.
  }

  try {
    await db.budget.count();
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers });
  }
}
