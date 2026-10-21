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

const loadAccount = cache(async (id: string): Promise<AccountHeader | null> => {
  if (!z.string().uuid().safeParse(id).success) return null;
  const user = await ensureUser();
  if (!user) return null;

  const account = await db.account.findFirst({
    where: { id, userId: user.id },
    select: { id: true, name: true, type: true, balance: true, isDefault: true },
  });
  if (!account) return null;

  return {
    id: account.id,
    name: account.name,
    type: account.type,
    balance: roundMoney(asNumber(account.balance)),
    isDefault: account.isDefault,
  };
});

export async function getAccountForUser(id: string): Promise<AccountHeader> {
  const account = await loadAccount(id);
  if (!account) notFound();
  return account;
}

export async function listAccountNames() {
  const user = await ensureUser();
  if (!user) return [];
  return db.account.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
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

  const [incomeAgg, expenseAgg, count, raw] = await Promise.all([
    db.transaction.aggregate({ where: { ...base, type: "INCOME" }, _sum: { amount: true } }),
    db.transaction.aggregate({ where: { ...base, type: "EXPENSE" }, _sum: { amount: true } }),
    db.transaction.count({ where: base }),
    seriesQuery(account.id, user.id, bucket, start),
  ]);

  const income = roundMoney(asNumber(incomeAgg._sum.amount));
  const expense = roundMoney(asNumber(expenseAgg._sum.amount));
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
