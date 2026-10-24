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

function asIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

type AccountSql = {
  id: string;
  name: string;
  type: string;
  balance: unknown;
  isDefault: boolean;
  txCount: number | bigint;
};

type SumSql = {
  type: string;
  category: string;
  total: unknown;
};

type FlowSql = {
  month: unknown;
  type: string;
  total: unknown;
};

type RecentSql = {
  id: string;
  description: string | null;
  category: string;
  amount: unknown;
  type: string;
  date: unknown;
  accountId: string;
  accountName: string;
  rn_account: number | bigint;
  rn_all: number | bigint;
};

type BudgetSql = {
  amount: unknown;
};

function mapRecent(row: RecentSql): DashboardTx {
  return {
    id: row.id,
    description: row.description?.trim() || "Untitled",
    category: row.category,
    amount: roundMoney(asNumber(row.amount)),
    type: row.type === "INCOME" ? "INCOME" : "EXPENSE",
    date: asIso(row.date),
    accountName: row.accountName,
  };
}

function byRecent(a: DashboardTx, b: DashboardTx) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.id < b.id ? 1 : -1;
}

export async function buildDashboardViewModel(userId: string): Promise<DashboardViewModel> {
  const now = new Date();
  const bounds = monthBoundsUtc(now);
  const flowStart = flowStartUtc(now);

  const [accountRows, monthRows, flowRows, recentRows, budgetRows] = await Promise.all([
    db.$queryRaw<AccountSql[]>`
      SELECT a."id",
             a."name",
             a."type"::text AS type,
             a."balance",
             a."isDefault",
             COUNT(t."id")::int AS "txCount"
      FROM "accounts" a
      LEFT JOIN "transactions" t ON t."accountId" = a."id"
      WHERE a."userId" = ${userId}
      GROUP BY a."id", a."name", a."type", a."balance", a."isDefault", a."createdAt"
      ORDER BY a."isDefault" DESC, a."createdAt" ASC
    `,
    db.$queryRaw<SumSql[]>`
      SELECT "type"::text AS type,
             "category",
             SUM("amount") AS total
      FROM "transactions"
      WHERE "userId" = ${userId}
        AND "status" = 'COMPLETED'::"TransactionStatus"
        AND "date" >= ${bounds.start}
        AND "date" < ${bounds.endExclusive}
      GROUP BY "type", "category"
    `,
    db.$queryRaw<FlowSql[]>`
      SELECT to_char(date_trunc('month', "date"), 'YYYY-MM') AS month,
             "type"::text AS type,
             SUM("amount") AS total
      FROM "transactions"
      WHERE "userId" = ${userId}
        AND "status" = 'COMPLETED'::"TransactionStatus"
        AND "date" >= ${flowStart}
        AND "date" < ${bounds.endExclusive}
      GROUP BY 1, 2
    `,
    db.$queryRaw<RecentSql[]>`
      SELECT "id",
             "description",
             "category",
             "amount",
             "type",
             "date",
             "accountId",
             "accountName",
             rn_account,
             rn_all
      FROM (
        SELECT t."id",
               t."description",
               t."category",
               t."amount",
               t."type"::text AS type,
               t."date",
               t."accountId",
               a."name" AS "accountName",
               row_number() OVER (
                 PARTITION BY t."accountId"
                 ORDER BY t."date" DESC, t."id" DESC
               ) AS rn_account,
               row_number() OVER (
                 ORDER BY t."date" DESC, t."id" DESC
               ) AS rn_all
          FROM "transactions" t
          INNER JOIN "accounts" a ON a."id" = t."accountId"
          WHERE t."userId" = ${userId}
      ) ranked
      WHERE rn_account <= 5 OR rn_all <= 5
    `,
    db.$queryRaw<BudgetSql[]>`
      SELECT "amount"
      FROM "budgets"
      WHERE "userId" = ${userId}
      LIMIT 1
    `,
  ]);

  const accounts: DashboardAccount[] = accountRows.map((account: AccountSql) => ({
    id: account.id,
    name: account.name,
    type: account.type === "SAVINGS" ? "SAVINGS" : "CURRENT",
    balance: roundMoney(asNumber(account.balance)),
    isDefault: account.isDefault,
    txCount: Number(account.txCount),
  }));

  let income = 0;
  let spent = 0;
  const expenseCategories: { category: string; amount: number }[] = [];
  for (const row of monthRows as SumSql[]) {
    const amount = asNumber(row.total);
    if (row.type === "INCOME") income += amount;
    else if (row.type === "EXPENSE") {
      spent += amount;
      expenseCategories.push({ category: row.category, amount });
    }
  }
  income = roundMoney(income);
  spent = roundMoney(spent);
  const byCategory = groupByCategory(expenseCategories).map((row) => ({
    ...row,
    amount: roundMoney(row.amount),
  }));

  const flow = buildFlow(
    now,
    (flowRows as FlowSql[]).map((row) => ({
      month: String(row.month).slice(0, 7),
      type: row.type === "INCOME" ? "INCOME" : "EXPENSE",
      amount: asNumber(row.total),
    })),
  ).map((point) => ({
    month: point.month,
    income: roundMoney(point.income),
    expense: roundMoney(point.expense),
  }));

  const perAccount = new Map<string, DashboardTx[]>();
  const all: DashboardTx[] = [];
  for (const row of recentRows as RecentSql[]) {
    const tx = mapRecent(row);
    if (Number(row.rn_all) <= 5) all.push(tx);
    if (Number(row.rn_account) <= 5) {
      const list = perAccount.get(row.accountId);
      if (list) list.push(tx);
      else perAccount.set(row.accountId, [tx]);
    }
  }
  all.sort(byRecent);
  for (const list of perAccount.values()) list.sort(byRecent);

  const recent: DashboardViewModel["recent"] = { all };
  for (const account of accounts) recent[account.id] = perAccount.get(account.id) ?? [];

  const daysLeft = daysLeftInMonth(bounds.dayOfMonth, bounds.daysInMonth);
  const budgetRow = budgetRows[0];
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
}

export const getDashboardViewModel = cache(async (): Promise<DashboardViewModel> => {
  const user = await ensureUser();
  if (!user) throw new Error("User not found");
  return buildDashboardViewModel(user.id);
});
