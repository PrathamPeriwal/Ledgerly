import type { Account, Prisma, Transaction } from "@prisma/client";

export function serializeAccount<T extends { balance: Prisma.Decimal }>(account: T) {
  return { ...account, balance: account.balance.toNumber() };
}

export function serializeTransaction<T extends { amount: Prisma.Decimal }>(row: T) {
  return { ...row, amount: row.amount.toNumber() };
}

export type SerializedAccount = ReturnType<typeof serializeAccount<Account>>;
export type SerializedTransaction = ReturnType<typeof serializeTransaction<Transaction>>;
