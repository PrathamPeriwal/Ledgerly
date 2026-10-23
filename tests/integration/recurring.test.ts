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

describe.skipIf(!directUrl)("recurring integration (Hana, DIRECT_URL)", () => {
  it("catches up two months once, then does nothing on the second run", async () => {
    process.env.DIRECT_URL = directUrl;
    process.env.DATABASE_URL = directUrl;
    const prisma = testPrisma();
    const { firstOccurrenceAfter, occurrenceDates, processRecurringTemplate } = await import("@/lib/services/recurring");

    const hana = await prisma.user.findFirstOrThrow({ where: { email: "hana@example.com" } });
    await prisma.$executeRaw`SELECT pg_advisory_lock(hashtext('hana-integration'))`;
    const snapshot = async () => ({
      accounts: (await prisma.account.findMany({ where: { userId: hana.id }, orderBy: { id: "asc" } })).map((account) => [
        account.id,
        account.balance.toString(),
      ]),
      transactions: (
        await prisma.transaction.findMany({
          where: { userId: hana.id },
          orderBy: { id: "asc" },
          select: { id: true, amount: true, accountId: true },
        })
      ).map((row) => [row.id, row.amount.toString(), row.accountId]),
      budgets: (await prisma.budget.findMany({ where: { userId: hana.id }, orderBy: { id: "asc" } })).map((budget) => [
        budget.id,
        budget.amount.toString(),
        budget.lastAlertSent?.toISOString() ?? null,
      ]),
    });
    const before = await snapshot();
    const opening = D("250.00");
    const amount = D("19.95");
    const now = new Date();
    const start = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
    let tempId: string | undefined;
    let caught: unknown;

    try {
      const temp = await prisma.account.create({
        data: { name: "B3a temp", type: "CURRENT", balance: opening, isDefault: false, userId: hana.id },
      });
      tempId = temp.id;
      const template = await prisma.transaction.create({
        data: {
          type: "EXPENSE",
          amount,
          description: "B3a rent",
          date: start,
          category: "rent",
          isRecurring: true,
          recurringInterval: "MONTHLY",
          nextRecurringDate: start,
          lastProcessed: null,
          status: "COMPLETED",
          userId: hana.id,
          accountId: temp.id,
        },
      });

      const expectedDates = occurrenceDates(start, "MONTHLY", now);
      expect(expectedDates).toHaveLength(2);

      const first = await processRecurringTemplate(template.id, hana.id, now);
      expect(first).toEqual({ created: 2, skipped: false });

      const children = await prisma.transaction.findMany({
        where: { accountId: temp.id, isRecurring: false },
        orderBy: { date: "asc" },
      });
      expect(children).toHaveLength(2);
      expect(children.map((row) => row.date.toISOString())).toEqual(expectedDates.map((date) => date.toISOString()));
      expect(children.map((row) => row.amount.toString())).toEqual([amount.toString(), amount.toString()]);
      expect(children.every((row) => row.description === "B3a rent (Recurring)" && row.status === "COMPLETED")).toBe(true);
      expect(children.every((row) => row.type === "EXPENSE" && row.userId === hana.id && row.category === "rent")).toBe(true);

      const account = await prisma.account.findFirstOrThrow({ where: { id: temp.id } });
      expect(account.balance.toString()).toBe(opening.minus(amount.times(2)).toString());

      const updated = await prisma.transaction.findFirstOrThrow({ where: { id: template.id } });
      const nextDate = firstOccurrenceAfter(start, "MONTHLY", now);
      expect(updated.nextRecurringDate?.toISOString()).toBe(nextDate.toISOString());
      expect(updated.nextRecurringDate && updated.nextRecurringDate.getTime()).toBeGreaterThan(now.getTime());
      expect(updated.lastProcessed?.toISOString()).toBe(now.toISOString());

      const second = await processRecurringTemplate(template.id, hana.id, now);
      expect(second).toEqual({ created: 0, skipped: true });
      expect(await prisma.transaction.count({ where: { accountId: temp.id, isRecurring: false } })).toBe(2);
      const afterSecond = await prisma.account.findFirstOrThrow({ where: { id: temp.id } });
      expect(afterSecond.balance.toString()).toBe(account.balance.toString());
    } catch (error) {
      caught = error;
    } finally {
      try {
        if (tempId) await prisma.account.deleteMany({ where: { id: tempId, userId: hana.id } });
        const after = await snapshot();
        expect(after).toEqual(before);
      } finally {
        await prisma.$executeRaw`SELECT pg_advisory_unlock(hashtext('hana-integration'))`;
        await prisma.$disconnect();
      }
      if (caught) throw caught;
    }
  }, 60_000);
});
