import { cache } from "react";
import type { User } from "@prisma/client";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

// Warm path is a single lookup by Clerk id; Clerk's API is only called to create a missing row.
export const ensureUser = cache(async (): Promise<User | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;
  try {
    return await db.user.create({
      data: {
        clerkUserId: clerkUser.id,
        name: `${clerkUser.firstName} ${clerkUser.lastName}`,
        imageUrl: clerkUser.imageUrl,
        email: clerkUser.emailAddresses[0].emailAddress,
      },
    });
  } catch (err) {
    console.error("[ensureUser]", err instanceof Error ? err.name : "unknown error");
    return null;
  }
});
