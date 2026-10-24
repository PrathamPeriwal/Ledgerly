import { notFound } from "next/navigation";
import { ensureUser } from "@/lib/ensure-user";
import { db } from "@/lib/prisma";
import { serializeTransaction } from "@/lib/services/serialize";

// Used by the edit form; another user's id is indistinguishable from a missing one.
export async function getTransaction(id: string) {
  const user = await ensureUser();
  if (!user) notFound();
  const row = await db.transaction.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      type: true,
      amount: true,
      description: true,
      accountId: true,
      category: true,
      date: true,
      isRecurring: true,
      recurringInterval: true,
    },
  });
  if (!row) notFound();
  return serializeTransaction(row);
}
