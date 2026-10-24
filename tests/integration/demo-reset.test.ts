import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { anchorToday, generatePersonaData } from "@/lib/demo/generate";
import { testPrisma } from "../helpers/db";

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

function cents(value: { toString(): string } | number) {
  const text = typeof value === "number" ? value.toFixed(2) : value.toString();
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace("-", "").split(".");
  const amount = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return negative ? -amount : amount;
}

async function fingerprint(prisma: PrismaClient, email: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { email }, include: { accounts: { orderBy: { id: "asc" } } } });
  return {
    transactions: await prisma.transaction.count({ where: { userId: user.id } }),
    balances: user.accounts.map((account) => [account.id, account.balance.toString()]),
  };
}

describe.skipIf(!directUrl)("demo reset integration (Maya, DIRECT_URL)", () => {
  it("resets Maya twice and leaves Hana and Omar untouched", async () => {
    process.env.DIRECT_URL = directUrl;
    process.env.DATABASE_URL = directUrl;
    const previousEmail = process.env.DEMO_USER_EMAIL;
    process.env.DEMO_USER_EMAIL = "maya@example.com";
    const prisma = testPrisma();
    const { resetDemoUser } = await import("@/lib/services/demo-reset");

    const maya = await prisma.user.findUniqueOrThrow({ where: { email: "maya@example.com" } });
    const savedAccounts = await prisma.account.findMany({ where: { userId: maya.id } });
    const savedTransactions = await prisma.transaction.findMany({ where: { userId: maya.id } });
    const savedBudget = await prisma.budget.findUnique({ where: { userId: maya.id } });

    const restore = async () => {
      await prisma.transaction.deleteMany({ where: { userId: maya.id } });
      await prisma.account.deleteMany({ where: { userId: maya.id } });
      await prisma.budget.deleteMany({ where: { userId: maya.id } });
      if (savedAccounts.length) {
        await prisma.account.createMany({
          data: savedAccounts.map((account) => ({
            id: account.id,
            name: account.name,
            type: account.type,
            balance: account.balance,
            isDefault: account.isDefault,
            userId: account.userId,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
          })),
        });
      }
      if (savedBudget) {
        await prisma.budget.create({
          data: {
            id: savedBudget.id,
            amount: savedBudget.amount,
            lastAlertSent: savedBudget.lastAlertSent,
            userId: savedBudget.userId,
            createdAt: savedBudget.createdAt,
            updatedAt: savedBudget.updatedAt,
          },
        });
      }
      for (let index = 0; index < savedTransactions.length; index += 500) {
        await prisma.transaction.createMany({
          data: savedTransactions.slice(index, index + 500).map((entry) => ({
            id: entry.id,
            type: entry.type,
            amount: entry.amount,
            description: entry.description,
            date: entry.date,
            category: entry.category,
            receiptUrl: entry.receiptUrl,
            isRecurring: entry.isRecurring,
            recurringInterval: entry.recurringInterval,
            nextRecurringDate: entry.nextRecurringDate,
            lastProcessed: entry.lastProcessed,
            status: entry.status,
            userId: entry.userId,
            accountId: entry.accountId,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
          })),
        });
      }
    };

    try {
      await prisma.$executeRaw`SELECT pg_advisory_lock(hashtext('hana-integration'))`;
      await prisma.$executeRaw`SELECT pg_advisory_lock(hashtext('maya-demo-reset'))`;
      const hanaBefore = await fingerprint(prisma, "hana@example.com");
      const omarBefore = await fingerprint(prisma, "omar@example.com");
      await resetDemoUser();

      const expected = generatePersonaData("maya", anchorToday());
      const accounts = await prisma.account.findMany({ where: { userId: maya.id }, orderBy: { name: "asc" } });
      const transactions = await prisma.transaction.findMany({ where: { userId: maya.id } });
      const budget = await prisma.budget.findUniqueOrThrow({ where: { userId: maya.id } });
      const user = await prisma.user.findUniqueOrThrow({ where: { id: maya.id } });

      expect(user.id).toBe(maya.id);
      expect(user.clerkUserId).toBe(maya.clerkUserId);
      expect(accounts.map((account) => account.name).sort()).toEqual(expected.accounts.map((account) => account.name).sort());
      expect(transactions).toHaveLength(expected.transactions.length);
      expect(cents(budget.amount)).toBe(cents(expected.budget?.amount ?? 0));
      for (const account of accounts) {
        const plan = expected.accounts.find((item) => item.name === account.name);
        expect(plan).toBeTruthy();
        const storedNet = transactions
          .filter((entry) => entry.accountId === account.id)
          .reduce((sum, entry) => sum + (entry.type === "INCOME" ? cents(entry.amount) : -cents(entry.amount)), 0);
        const plannedNet = expected.transactions
          .filter((entry) => entry.accountKey === plan?.key)
          .reduce((sum, entry) => sum + (entry.type === "INCOME" ? cents(entry.amount) : -cents(entry.amount)), 0);
        expect(cents(account.balance)).toBe(cents(plan?.balance ?? 0));
        expect(storedNet).toBe(plannedNet);
        expect(cents(account.balance) - storedNet + storedNet).toBe(cents(account.balance));
      }

      const firstCounts = {
        accounts: accounts.length,
        transactions: transactions.length,
        budgets: await prisma.budget.count({ where: { userId: maya.id } }),
      };
      await resetDemoUser();
      expect({
        accounts: await prisma.account.count({ where: { userId: maya.id } }),
        transactions: await prisma.transaction.count({ where: { userId: maya.id } }),
        budgets: await prisma.budget.count({ where: { userId: maya.id } }),
      }).toEqual(firstCounts);
      expect(await fingerprint(prisma, "hana@example.com")).toEqual(hanaBefore);
      expect(await fingerprint(prisma, "omar@example.com")).toEqual(omarBefore);
    } finally {
      await restore();
      if (previousEmail === undefined) delete process.env.DEMO_USER_EMAIL;
      else process.env.DEMO_USER_EMAIL = previousEmail;
      await prisma.$executeRaw`SELECT pg_advisory_unlock(hashtext('maya-demo-reset'))`;
      await prisma.$executeRaw`SELECT pg_advisory_unlock(hashtext('hana-integration'))`;
      await prisma.$disconnect();
    }
  }, 120_000);
});
