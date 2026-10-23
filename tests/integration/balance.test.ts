import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { testPrisma } from "../helpers/db";
import { describe, expect, it } from "vitest";

function loadDirectUrl() {
  if (process.env.DIRECT_URL) return process.env.DIRECT_URL;
  const file = path.join(process.cwd(), ".env");
  if (!existsSync(file)) return undefined;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*DIRECT_URL\s*=\s*(.*)$/);
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return undefined;
}

const directUrl = loadDirectUrl();
const D = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value);

describe.skipIf(!directUrl)("balance integration (Hana, DIRECT_URL)", () => {
  it("keeps balances exact through create, move and bulk delete", async () => {
    process.env.DIRECT_URL = directUrl;
    process.env.DATABASE_URL = directUrl;
    const prisma = testPrisma();
    const { createTransaction, updateTransaction, deleteTransactions } = await import("@/lib/services/transactions");
    const { transactionInputSchema } = await import("@/lib/validation/transaction");

    const hana = await prisma.user.findFirstOrThrow({ where: { email: "hana@example.com" } });
    await prisma.$executeRaw`SELECT pg_advisory_lock(hashtext('hana-integration'))`;
    const snapshot = async () => ({
      accounts: (await prisma.account.findMany({ where: { userId: hana.id }, orderBy: { id: "asc" } })).map((a) => [a.id, a.balance.toString()]),
      txCount: await prisma.transaction.count({ where: { userId: hana.id } }),
    });
    const before = await snapshot();
    const original = await prisma.account.findFirstOrThrow({ where: { userId: hana.id, isDefault: true } });
    const originalStart = original.balance;
    let tempId: string | undefined;
    const created: string[] = [];

    const expectBalances = async (originalDelta: Prisma.Decimal.Value, tempDelta: Prisma.Decimal.Value) => {
      const a = await prisma.account.findFirstOrThrow({ where: { id: original.id } });
      const b = await prisma.account.findFirstOrThrow({ where: { id: tempId! } });
      expect(a.balance.toString()).toBe(originalStart.plus(originalDelta).toString());
      expect(b.balance.toString()).toBe(D(100).plus(tempDelta).toString());
    };
    const input = (accountId: string, amount: number) =>
      transactionInputSchema.parse({
        type: "EXPENSE",
        amount,
        description: "B2 integration",
        date: new Date(),
        accountId,
        category: "food",
        isRecurring: false,
      });

    try {
      const temp = await prisma.account.create({
        data: { name: "B2 temp", type: "CURRENT", balance: D(100), isDefault: false, userId: hana.id },
      });
      tempId = temp.id;

      const row = await createTransaction(hana.id, input(original.id, 12.34));
      created.push(row.id);
      await expectBalances(-12.34, 0);

      await updateTransaction(hana.id, row.id, input(temp.id, 20.1));
      await expectBalances(0, -20.1);

      await deleteTransactions(hana.id, [row.id]);
      await expectBalances(0, 0);
      expect(await prisma.transaction.count({ where: { id: row.id } })).toBe(0);
    } finally {
      if (created.length) await prisma.transaction.deleteMany({ where: { id: { in: created }, userId: hana.id } });
      if (tempId) await prisma.account.deleteMany({ where: { id: tempId, userId: hana.id } });
      await prisma.account.updateMany({ where: { id: original.id, userId: hana.id }, data: { balance: originalStart } });
      const after = await snapshot();
      await prisma.$executeRaw`SELECT pg_advisory_unlock(hashtext('hana-integration'))`;
      await prisma.$disconnect();
      expect(after).toEqual(before);
    }
  }, 60_000);
});
