import { request } from "@arcjet/next";
import aj from "@/lib/arcjet";
import { UserFacingError } from "@/lib/errors";

export async function enforceRateLimit(clerkUserId: string) {
  const req = await request();
  const decision = await aj.protect(req, { userId: clerkUserId, requested: 1 });
  if (!decision.isDenied()) return;
  if (decision.reason.isRateLimit()) throw new UserFacingError("Too many requests. Please try again later.");
  throw new UserFacingError("Request blocked");
}
