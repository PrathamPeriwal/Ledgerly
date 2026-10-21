import { z } from "zod";
import type {
  AccountDir,
  AccountFlowPoint,
  AccountParams,
  AccountRange,
  AccountRecurring,
  AccountSort,
  AccountTxType,
} from "@/lib/types/account";

export const PAGE_SIZE = 15;
export const MAX_PAGE = 1000;

export const DEFAULT_ACCOUNT_PARAMS: AccountParams = {
  range: "3m",
  q: "",
  type: "all",
  recurring: "all",
  sort: "date",
  dir: "desc",
  page: 1,
};

const rangeSchema = z.enum(["7d", "1m", "3m", "6m", "all"]).catch("3m");
const typeSchema = z.enum(["all", "income", "expense"]).catch("all");
const recurringSchema = z.enum(["all", "recurring", "one-time"]).catch("all");
const sortSchema = z.enum(["date", "amount"]).catch("date");
const dirSchema = z.enum(["asc", "desc"]).catch("desc");
const pageSchema = z.coerce.number().catch(1);

type RawParam = string | string[] | undefined;

function first(value: RawParam) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseAccountParams(input: {
  range?: RawParam;
  q?: RawParam;
  type?: RawParam;
  recurring?: RawParam;
  sort?: RawParam;
  dir?: RawParam;
  page?: RawParam;
}): AccountParams {
  const page = clampPage(pageSchema.parse(first(input.page) ?? ""));
  const q = (first(input.q) ?? "").trim().slice(0, 200);
  return {
    range: rangeSchema.parse(first(input.range)) as AccountRange,
    q,
    type: typeSchema.parse(first(input.type)) as AccountTxType,
    recurring: recurringSchema.parse(first(input.recurring)) as AccountRecurring,
    sort: sortSchema.parse(first(input.sort)) as AccountSort,
    dir: dirSchema.parse(first(input.dir)) as AccountDir,
    page,
  };
}

export function clampPage(value: number) {
  if (!Number.isFinite(value)) return 1;
  const page = Math.trunc(value);
  if (page < 1) return 1;
  if (page > MAX_PAGE) return MAX_PAGE;
  return page;
}

export function serializeAccountParams(params: AccountParams) {
  return [params.range, params.q, params.type, params.recurring, params.sort, params.dir, String(params.page)].join(
    "|",
  );
}

export function hasActiveFilters(params: AccountParams) {
  return (
    params.q.length > 0 ||
    params.type !== "all" ||
    params.recurring !== "all" ||
    params.range !== "3m"
  );
}

export function toAccountSearch(params: AccountParams) {
  const search = new URLSearchParams();
  if (params.range !== "3m") search.set("range", params.range);
  if (params.q) search.set("q", params.q);
  if (params.type !== "all") search.set("type", params.type);
  if (params.recurring !== "all") search.set("recurring", params.recurring);
  if (params.sort !== "date") search.set("sort", params.sort);
  if (params.dir !== "desc") search.set("dir", params.dir);
  if (params.page > 1) search.set("page", String(params.page));
  return search.toString();
}

function utcStartOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcMonths(date: Date, months: number) {
  const day = date.getUTCDate();
  const cursor = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const last = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), Math.min(day, last)));
}

export function rangeStart(range: AccountRange, now: Date) {
  const today = utcStartOfDay(now);
  if (range === "all") return null;
  if (range === "7d") {
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - 6);
    return start;
  }
  if (range === "1m") return addUtcMonths(today, -1);
  if (range === "3m") return addUtcMonths(today, -3);
  return addUtcMonths(today, -6);
}

export type AccountBucket = "day" | "week" | "month";

export function bucketFor(range: AccountRange): AccountBucket {
  if (range === "7d" || range === "1m") return "day";
  if (range === "3m" || range === "6m") return "week";
  return "month";
}

export function bucketLabel(date: Date, bucket: AccountBucket) {
  if (bucket === "day") return String(date.getUTCDate());
  if (bucket === "month") {
    return date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  }
  return date.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export type SeriesRow = {
  at: Date;
  type: "INCOME" | "EXPENSE";
  total: number;
};

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildSeries(range: AccountRange, now: Date, rows: SeriesRow[]): AccountFlowPoint[] {
  const bucket = bucketFor(range);
  const grouped = new Map<string, { at: Date; income: number; expense: number }>();

  for (const row of rows) {
    const at = bucket === "day" ? utcStartOfDay(row.at) : row.at;
    const key = bucket === "day" ? dayKey(at) : at.toISOString();
    const entry = grouped.get(key) ?? { at, income: 0, expense: 0 };
    if (row.type === "INCOME") entry.income += row.total;
    else entry.expense += row.total;
    grouped.set(key, entry);
  }

  if (bucket === "day") {
    const start = rangeStart(range, now);
    if (!start) return [];
    const end = utcStartOfDay(now);
    const points: AccountFlowPoint[] = [];
    for (let cursor = new Date(start); cursor.getTime() <= end.getTime(); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const entry = grouped.get(dayKey(cursor));
      points.push({
        label: bucketLabel(cursor, "day"),
        income: entry?.income ?? 0,
        expense: entry?.expense ?? 0,
      });
    }
    return points;
  }

  return [...grouped.values()]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((entry) => ({
      label: bucketLabel(entry.at, bucket),
      income: entry.income,
      expense: entry.expense,
    }));
}

export function buildTransactionWhere(accountId: string, params: AccountParams, now = new Date()) {
  const start = rangeStart(params.range, now);
  const where: Record<string, unknown> = {
    accountId,
    status: "COMPLETED",
  };
  if (start) where.date = { gte: start };
  if (params.q) {
    where.OR = [
      { description: { contains: params.q, mode: "insensitive" } },
      { category: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.type === "income") where.type = "INCOME";
  if (params.type === "expense") where.type = "EXPENSE";
  if (params.recurring === "recurring") where.isRecurring = true;
  if (params.recurring === "one-time") where.isRecurring = false;
  return where;
}

export function transactionOrder(params: AccountParams) {
  if (params.sort === "amount") return [{ amount: params.dir }, { id: "desc" as const }];
  return [{ date: params.dir }, { id: "desc" as const }];
}

export function pageCountFor(total: number, pageSize = PAGE_SIZE) {
  if (total <= 0) return 1;
  return Math.ceil(total / pageSize);
}

export function showingRange(page: number, total: number, pageSize = PAGE_SIZE) {
  if (total <= 0) return { from: 0, to: 0 };
  const pageCount = pageCountFor(total, pageSize);
  const safe = Math.min(Math.max(page, 1), pageCount);
  const from = (safe - 1) * pageSize + 1;
  return { from, to: Math.min(safe * pageSize, total) };
}
