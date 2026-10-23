"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { toFailure } from "@/lib/errors";
import { serializeAccount } from "@/lib/services/serialize";
import * as accounts from "@/lib/services/accounts";
import * as transactions from "@/lib/services/transactions";
import { accountInputSchema } from "@/lib/validation/account";
import { idListSchema, idSchema } from "@/lib/validation/transaction";

export async function createAccount(data: unknown) {
  try {
    const user = await requireUser();
    const parsed = accountInputSchema.safeParse(data);
    if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message };
    await enforceRateLimit(user.clerkUserId);

    const account = await accounts.createAccount(user.id, parsed.data);
    revalidatePath("/dashboard");
    return { success: true as const, data: serializeAccount(account) };
  } catch (err) {
    return toFailure("createAccount", err);
  }
}

export async function updateDefaultAccount(accountId: unknown) {
  try {
    const user = await requireUser();
    const parsed = idSchema.safeParse(accountId);
    if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message };

    const account = await accounts.setDefaultAccount(user.id, parsed.data);
    revalidatePath("/dashboard");
    return { success: true as const, data: serializeAccount(account) };
  } catch (err) {
    return toFailure("updateDefaultAccount", err);
  }
}

export async function bulkDeleteTransactions(transactionIds: unknown) {
  try {
    const user = await requireUser();
    const parsed = idListSchema.safeParse(transactionIds);
    if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message };

    const { accountIds } = await transactions.deleteTransactions(user.id, parsed.data);
    revalidatePath("/dashboard");
    for (const id of accountIds) revalidatePath(`/account/${id}`);
    return { success: true as const };
  } catch (err) {
    return toFailure("bulkDeleteTransactions", err);
  }
}
