import { Prisma } from "@prisma/client";
import { db } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import type { TransactionInput } from "@/lib/validation/transaction";
import { accountDeltas, updateDeltas } from "@/lib/services/balance";
import { applyDeltas } from "@/lib/services/apply-deltas";

export function calculateNextRecurringDate(startDate: Date | string, interval: string): Date {
  const date = new Date(startDate);
  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date;
}

function rowData(input: TransactionInput) {
  const recurring = input.isRecurring && input.recurringInterval ? input.recurringInterval : null;
  return {
    type: input.type,
    amount: new Prisma.Decimal(String(input.amount)),
    description: input.description,
    date: input.date,
    category: input.category,
    accountId: input.accountId,
    isRecurring: input.isRecurring,
    recurringInterval: recurring,
    nextRecurringDate: recurring ? calculateNextRecurringDate(input.date, recurring) : null,
  };
}

export async function createTransaction(userId: string, input: TransactionInput) {
  return db.$transaction(async (tx) => {
    const account = await tx.account.findFirst({ where: { id: input.accountId, userId }, select: { id: true } });
    if (!account) throw new NotFoundError();
    const row = await tx.transaction.create({ data: { ...rowData(input), userId } });
    await applyDeltas(tx, userId, accountDeltas([row]));
    return row;
  });
}

export async function updateTransaction(userId: string, id: string, input: TransactionInput) {
  return db.$transaction(async (tx) => {
    const old = await tx.transaction.findFirst({ where: { id, userId } });
    if (!old) throw new NotFoundError();
    const account = await tx.account.findFirst({ where: { id: input.accountId, userId }, select: { id: true } });
    if (!account) throw new NotFoundError();
    const row = await tx.transaction.update({ where: { id, userId }, data: rowData(input) });
    // The status is not editable, so the new row keeps the old row's status.
    await applyDeltas(tx, userId, updateDeltas(old, { ...row, status: old.status }));
    return { row, oldAccountId: old.accountId };
  });
}

export async function deleteTransactions(userId: string, ids: string[]) {
  return db.$transaction(async (tx) => {
    const rows = await tx.transaction.findMany({ where: { id: { in: ids }, userId } });
    if (rows.length === 0) return { accountIds: [] as string[] };
    await tx.transaction.deleteMany({ where: { id: { in: rows.map((row) => row.id) }, userId } });
    await applyDeltas(tx, userId, accountDeltas(rows, -1));
    return { accountIds: [...new Set(rows.map((row) => row.accountId))] };
  });
}
