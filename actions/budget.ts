"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { toFailure } from "@/lib/errors";
import { saveBudget } from "@/lib/services/budget";
import { budgetInputSchema } from "@/lib/validation/budget";

export async function updateBudget(amount: unknown) {
  try {
    const user = await requireUser();
    const parsed = budgetInputSchema.safeParse({ amount });
    if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message };

    const budget = await saveBudget(user.id, parsed.data);
    revalidatePath("/dashboard");
    return { success: true as const, data: { ...budget, amount: budget.amount.toNumber() } };
  } catch (err) {
    return toFailure("updateBudget", err);
  }
}
