import { cache } from "react";
import { ensureUser } from "@/lib/ensure-user";
import { db } from "@/lib/prisma";
import type { DashboardAccount, DashboardTx, DashboardViewModel } from "@/lib/types/dashboard";
import {
  buildFlow,
  daysLeftInMonth,
  flowStartUtc,
  groupByCategory,
  monthBoundsUtc,
  pacePct,
  safePerDay,
} from "@/lib/data/dashboard-calc";

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function asNumber(value: unknown) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const decimal = value as { toNumber: () => number };
    if (typeof decimal.toNumber === "function") return decimal.toNumber();
  }
  return Number(value);
}

function monthLabel(value: unknown) {
  if (value instanceof Date) {
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    return `${value.getUTCFullYear()}-${month}`;
  }
  const match = String(value).match(/^(\d{4}-\d{2})/);
  return match ? match[1] : String(value);
}

type AccountRow = {
  id: string;
  name: string;
  type: "CURRENT" | "SAVINGS";
  balance: unknown;
  isDefault: boolean;
  _count: { transactions: number };
};

type RecentRow = {
  id: string;
  description: string | null;
  category: string;
  amount: unknown;
  type: string;
  date: Date;
  account: { name: string };
};

const recentSelect = {
  id: true,
  description: true,
  category: true,
  amount: true,
  type: true,
  date: true,
  account: { select: { name: true } },
} as const;

function mapRecent(row: RecentRow): DashboardTx {
  return {
    id: row.id,
    description: row.description?.trim() || "Untitled",
    category: row.category,
    amount: roundMoney(asNumber(row.amount)),
    type: row.type === "INCOME" ? "INCOME" : "EXPENSE",
    date: row.date.toISOString(),
    accountName: row.account.name,
  };
}

export const getDashboardViewModel = cache(async (): Promise<DashboardViewModel> => {
  const user = await ensureUser();
  if (!user) throw new Error("User not found");

  const now = new Date();
  const bounds = monthBoundsUtc(now);
  const flowStart = flowStartUtc(now);
  const completed = { userId: user.id, status: "COMPLETED" as const };

  const [accountRows, budgetRow, incomeAgg, spentAgg, categoryRows, flowRows, recentAll] =
    await Promise.all([
      db.account.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        include: { _count: { select: { transactions: true } } },
      }),
      db.budget.findUnique({ where: { userId: user.id } }),
      db.transaction.aggregate({
        where: { ...completed, type: "INCOME", date: { gte: bounds.start, lt: bounds.endExclusive } },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { ...completed, type: "EXPENSE", date: { gte: bounds.start, lt: bounds.endExclusive } },
        _sum: { amount: true },
      }),
      db.transaction.groupBy({
        by: ["category"],
        where: { ...completed, type: "EXPENSE", date: { gte: bounds.start, lt: bounds.endExclusive } },
        _sum: { amount: true },
      }),
      db.$queryRaw<Array<{ month: unknown; type: string; total: unknown }>>`
        SELECT to_char(date_trunc('month', "date"), 'YYYY-MM') AS month,
               "type"::text AS type,
               SUM("amount") AS total
        FROM "transactions"
        WHERE "userId" = ${user.id}
          AND "status" = 'COMPLETED'::"TransactionStatus"
          AND "date" >= ${flowStart}
          AND "date" < ${bounds.endExclusive}
        GROUP BY 1, 2
      `,
      db.transaction.findMany({
        where: { userId: user.id },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: 5,
        select: recentSelect,
      }),
    ]) as [
    AccountRow[],
    { amount: unknown } | null,
    { _sum: { amount: unknown } },
    { _sum: { amount: unknown } },
    { category: string; _sum: { amount: unknown } }[],
    { month: unknown; type: string; total: unknown }[],
    RecentRow[],
  ];

  const perAccount = await Promise.all(
    accountRows.map(async (account) => {
      const rows = (await db.transaction.findMany({
        where: { userId: user.id, accountId: account.id },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: 5,
        select: recentSelect,
      })) as RecentRow[];
      return [account.id, rows.map(mapRecent)] as const;
    }),
  );

  const accounts: DashboardAccount[] = accountRows.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    balance: roundMoney(asNumber(account.balance)),
    isDefault: account.isDefault,
    txCount: account._count.transactions,
  }));

  const income = roundMoney(asNumber(incomeAgg._sum.amount));
  const spent = roundMoney(asNumber(spentAgg._sum.amount));
  const byCategory = groupByCategory(
    categoryRows.map((row) => ({
      category: row.category,
      amount: asNumber(row._sum.amount),
    })),
  ).map((row) => ({ ...row, amount: roundMoney(row.amount) }));

  const flow = buildFlow(
    now,
    flowRows.map((row) => ({
      month: monthLabel(row.month),
      type: row.type === "INCOME" ? "INCOME" : "EXPENSE",
      amount: asNumber(row.total),
    })),
  ).map((point) => ({
    month: point.month,
    income: roundMoney(point.income),
    expense: roundMoney(point.expense),
  }));

  const recent: DashboardViewModel["recent"] = { all: recentAll.map(mapRecent) };
  for (const [id, rows] of perAccount) recent[id] = rows;

  const daysLeft = daysLeftInMonth(bounds.dayOfMonth, bounds.daysInMonth);
  const budget = budgetRow
    ? {
        amount: roundMoney(asNumber(budgetRow.amount)),
        spent,
        pacePct: pacePct(bounds.dayOfMonth, bounds.daysInMonth),
        daysLeft,
        safePerDay: roundMoney(safePerDay(asNumber(budgetRow.amount), spent, daysLeft)),
      }
    : null;

  return {
    accounts,
    totalBalance: roundMoney(accounts.reduce((sum, account) => sum + account.balance, 0)),
    month: { income, spent, byCategory },
    flow,
    recent,
    budget,
  };
});
