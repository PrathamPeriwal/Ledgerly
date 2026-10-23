import { Prisma } from "@prisma/client";
import { db } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import type { AccountInput } from "@/lib/validation/account";

export async function createAccount(userId: string, input: AccountInput) {
  return db.$transaction(async (tx) => {
    const existing = await tx.account.count({ where: { userId } });
    // The first account is always the default; otherwise honour the user's choice.
    const isDefault = existing === 0 ? true : input.isDefault;
    if (isDefault) {
      await tx.account.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }
    return tx.account.create({
      data: {
        name: input.name,
        type: input.type,
        balance: new Prisma.Decimal(String(input.balance)),
        isDefault,
        userId,
      },
    });
  });
}

export async function setDefaultAccount(userId: string, accountId: string) {
  return db.$transaction(async (tx) => {
    const target = await tx.account.findFirst({ where: { id: accountId, userId }, select: { id: true } });
    if (!target) throw new NotFoundError();
    await tx.account.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    return tx.account.update({ where: { id: accountId, userId }, data: { isDefault: true } });
  });
}
