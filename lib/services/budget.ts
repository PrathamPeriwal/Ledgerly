import { Prisma } from "@prisma/client";
import { db } from "@/lib/prisma";
import type { BudgetInput } from "@/lib/validation/budget";

export async function saveBudget(userId: string, input: BudgetInput) {
  const amount = new Prisma.Decimal(String(input.amount));
  return db.budget.upsert({
    where: { userId },
    update: { amount },
    create: { userId, amount },
  });
}
