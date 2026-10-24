import { cache } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ensureUser } from "@/lib/ensure-user";
import { db } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { AccountHeader, AccountParams, AccountSummary, AccountTxPage, AccountTxRow } from "@/lib/types/account";
import {
  PAGE_SIZE,
  buildSeries,
  buildTransactionWhere,
  bucketFor,
  pageCountFor,
  rangeStart,
  transactionOrder,
  type SeriesRow,
} from "@/lib/data/account-calc";

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

function asDate(value: unknown) {
  if (value instanceof Date) return value;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

const txSelect = {
  id: true,
  date: true,
  description: true,
  category: true,
  amount: true,
  type: true,
  isRecurring: true,
  recurringInterval: true,
  nextRecurringDate: true,
} as const;

type RawBucket = { bucket: unknown; type: string; total: unknown };

async function seriesQuery(accountId: string, userId: string, bucket: "day" | "week" | "month", start: Date | null) {
  if (bucket === "day" && start) {
    return db.$queryRaw<RawBucket[]>`
      SELECT date_trunc('day', "date") AS bucket, "type"::text AS type, SUM("amount") AS total
      FROM "transactions"
      WHERE "accountId" = ${accountId} AND "userId" = ${userId}
        AND "status" = 'COMPLETED'::"TransactionStatus" AND "date" >= ${start}
      GROUP BY 1, 2 ORDER BY 1
    `;
  }
  if (bucket === "week" && start) {
    return db.$queryRaw<RawBucket[]>`
      SELECT date_trunc('week', "date") AS bucket, "type"::text AS type, SUM("amount") AS total
      FROM "transactions"
      WHERE "accountId" = ${accountId} AND "userId" = ${userId}
        AND "status" = 'COMPLETED'::"TransactionStatus" AND "date" >= ${start}
      GROUP BY 1, 2 ORDER BY 1
    `;
  }
  if (bucket === "month" && start) {
    return db.$queryRaw<RawBucket[]>`
      SELECT date_trunc('month', "date") AS bucket, "type"::text AS type, SUM("amount") AS total
      FROM "transactions"
      WHERE "accountId" = ${accountId} AND "userId" = ${userId}
        AND "status" = 'COMPLETED'::"TransactionStatus" AND "date" >= ${start}
      GROUP BY 1, 2 ORDER BY 1
    `;
  }
  if (bucket === "day") {
    return db.$queryRaw<RawBucket[]>`
      SELECT date_trunc('day', "date") AS bucket, "type"::text AS type, SUM("amount") AS total
      FROM "transactions"
      WHERE "accountId" = ${accountId} AND "userId" = ${userId}
        AND "status" = 'COMPLETED'::"TransactionStatus"
      GROUP BY 1, 2 ORDER BY 1
    `;
  }
  if (bucket === "week") {
    return db.$queryRaw<RawBucket[]>`
      SELECT date_trunc('week', "date") AS bucket, "type"::text AS type, SUM("amount") AS total
      FROM "transactions"
      WHERE "accountId" = ${accountId} AND "userId" = ${userId}
        AND "status" = 'COMPLETED'::"TransactionStatus"
      GROUP BY 1, 2 ORDER BY 1
    `;
  }
  return db.$queryRaw<RawBucket[]>`
    SELECT date_trunc('month', "date") AS bucket, "type"::text AS type, SUM("amount") AS total
    FROM "transactions"
    WHERE "accountId" = ${accountId} AND "userId" = ${userId}
      AND "status" = 'COMPLETED'::"TransactionStatus"
    GROUP BY 1, 2 ORDER BY 1
  `;
}

// One query per request; the header lookup and the account switcher both read from it.
const loadUserAccounts = cache(async (userId: string) => {
  const rows = await db.account.findMany({
    where: { userId },
    select: { id: true, name: true, type: true, balance: true, isDefault: true },
    orderBy: { name: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    balance: roundMoney(asNumber(row.balance)),
    isDefault: row.isDefault,
  }));
});

export async function getAccountForUser(id: string): Promise<AccountHeader> {
  if (!z.string().uuid().safeParse(id).success) notFound();
  const user = await ensureUser();
  if (!user) notFound();
  const account = (await loadUserAccounts(user.id)).find((row) => row.id === id);
  if (!account) notFound();
  return account;
}

export async function listAccountNames() {
  const user = await ensureUser();
  if (!user) return [];
  return (await loadUserAccounts(user.id)).map(({ id, name }) => ({ id, name }));
}

type TransactionAccountRow = {
  id: string;
  name: string;
  type: "CURRENT" | "SAVINGS";
  balance: number;
  isDefault: boolean;
};

export async function listTransactionAccounts(): Promise<TransactionAccountRow[]> {
  const user = await ensureUser();
  if (!user) return [];
  return loadUserAccounts(user.id);
}

export async function getAccountSummary(id: string, range: AccountParams["range"]): Promise<AccountSummary> {
  const account = await getAccountForUser(id);
  const user = await ensureUser();
  if (!user) notFound();

  const now = new Date();
  const start = rangeStart(range, now);
  const bucket = bucketFor(range);
  const base = {
    accountId: account.id,
    userId: user.id,
    status: "COMPLETED" as const,
    ...(start ? { date: { gte: start } } : {}),
  };

  const [totals, raw] = await Promise.all([
    db.transaction.groupBy({ by: ["type"], where: base, _sum: { amount: true }, _count: { _all: true } }),
    seriesQuery(account.id, user.id, bucket, start),
  ]);

  const income = roundMoney(asNumber(totals.find((row) => row.type === "INCOME")?._sum.amount));
  const expense = roundMoney(asNumber(totals.find((row) => row.type === "EXPENSE")?._sum.amount));
  const count = totals.reduce((sum, row) => sum + row._count._all, 0);
  const rows: SeriesRow[] = raw.map((row: RawBucket) => ({
    at: asDate(row.bucket),
    type: row.type === "INCOME" ? "INCOME" : "EXPENSE",
    total: roundMoney(asNumber(row.total)),
  }));

  return {
    income,
    expense,
    net: roundMoney(income - expense),
    count,
    series: buildSeries(range, now, rows),
  };
}

export async function getAccountTransactions(id: string, params: AccountParams): Promise<AccountTxPage> {
  const account = await getAccountForUser(id);
  const user = await ensureUser();
  if (!user) notFound();

  const where = {
    ...buildTransactionWhere(account.id, params),
    userId: user.id,
  } as Prisma.TransactionWhereInput;

  const [found, total] = await Promise.all([
    db.transaction.findMany({
      where,
      orderBy: transactionOrder(params),
      skip: (params.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: txSelect,
    }),
    db.transaction.count({ where }),
  ]);

  const rows: AccountTxRow[] = found.map((row: {
    id: string;
    date: Date;
    description: string | null;
    category: string;
    amount: unknown;
    type: string;
    isRecurring: boolean;
    recurringInterval: AccountTxRow["recurringInterval"];
    nextRecurringDate: Date | null;
  }) => ({
    id: row.id,
    date: row.date.toISOString(),
    description: row.description?.trim() || "Untitled",
    category: row.category,
    amount: roundMoney(asNumber(row.amount)),
    type: row.type === "INCOME" ? "INCOME" : "EXPENSE",
    isRecurring: row.isRecurring,
    recurringInterval: row.recurringInterval,
    nextRecurringDate: row.nextRecurringDate ? row.nextRecurringDate.toISOString() : null,
  }));

  return {
    rows,
    total,
    page: params.page,
    pageCount: pageCountFor(total),
  };
}

