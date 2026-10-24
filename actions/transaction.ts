"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { toFailure } from "@/lib/errors";
import { serializeTransaction } from "@/lib/services/serialize";
import * as transactions from "@/lib/services/transactions";
import { idSchema, transactionInputSchema } from "@/lib/validation/transaction";

export async function createTransaction(data: unknown) {
  try {
    const user = await requireUser();
    const parsed = transactionInputSchema.safeParse(data);
    if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message };
    await enforceRateLimit(user.clerkUserId);

    const row = await transactions.createTransaction(user.id, parsed.data);
    revalidatePath("/dashboard");
    revalidatePath(`/account/${row.accountId}`);
    return { success: true as const, data: serializeTransaction(row) };
  } catch (err) {
    return toFailure("createTransaction", err);
  }
}

export async function updateTransaction(id: unknown, data: unknown) {
  try {
    const user = await requireUser();
    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success) return { success: false as const, error: parsedId.error.issues[0].message };
    const parsed = transactionInputSchema.safeParse(data);
    if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message };

    const { row, oldAccountId } = await transactions.updateTransaction(user.id, parsedId.data, parsed.data);
    revalidatePath("/dashboard");
    for (const accountId of new Set([oldAccountId, row.accountId])) revalidatePath(`/account/${accountId}`);
    return { success: true as const, data: serializeTransaction(row) };
  } catch (err) {
    return toFailure("updateTransaction", err);
  }
}
