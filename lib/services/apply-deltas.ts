import type { Prisma } from "@prisma/client";
import { NotFoundError } from "@/lib/errors";
import { nonZeroDeltas, type Deltas } from "@/lib/services/balance";

// Applies balance deltas inside the caller's transaction; a foreign or missing account aborts it.
export async function applyDeltas(tx: Prisma.TransactionClient, userId: string, deltas: Deltas) {
  for (const [accountId, delta] of nonZeroDeltas(deltas)) {
    const result = await tx.account.updateMany({
      where: { id: accountId, userId },
      data: { balance: { increment: delta } },
    });
    if (result.count === 0) throw new NotFoundError();
  }
}
