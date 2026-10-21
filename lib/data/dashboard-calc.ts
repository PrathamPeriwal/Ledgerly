export type FlowRow = {
  month: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
};

export type CategoryRow = {
  category: string;
  amount: number;
};

export type MonthBounds = {
  start: Date;
  endExclusive: Date;
  dayOfMonth: number;
  daysInMonth: number;
  key: string;
};

export function monthKey(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

export function monthBoundsUtc(now: Date): MonthBounds {
  const year = now.getUTCFullYear();
  const monthIndex = now.getUTCMonth();
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const endExclusive = new Date(Date.UTC(year, monthIndex + 1, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return {
    start,
    endExclusive,
    dayOfMonth: now.getUTCDate(),
    daysInMonth,
    key: monthKey(start),
  };
}

export function inMonth(date: Date, now: Date) {
  const bounds = monthBoundsUtc(now);
  return date >= bounds.start && date < bounds.endExclusive;
}

export function lastSixMonthKeys(now: Date) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const keys: string[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    keys.push(monthKey(new Date(Date.UTC(year, month - offset, 1))));
  }
  return keys;
}

export function flowStartUtc(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
}

export function pacePct(dayOfMonth: number, daysInMonth: number) {
  if (daysInMonth <= 0) return 0;
  return dayOfMonth / daysInMonth;
}

export function daysLeftInMonth(dayOfMonth: number, daysInMonth: number) {
  return Math.max(1, daysInMonth - dayOfMonth + 1);
}

export function safePerDay(amount: number, spent: number, daysLeft: number) {
  const days = Math.max(1, daysLeft);
  return Math.max(0, amount - spent) / days;
}

export function groupByCategory(rows: CategoryRow[]): CategoryRow[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const name = row.category.trim() || "Uncategorized";
    totals.set(name, (totals.get(name) ?? 0) + row.amount);
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
}

export function buildFlow(now: Date, rows: FlowRow[]) {
  const buckets = new Map<string, { income: number; expense: number }>();
  for (const key of lastSixMonthKeys(now)) buckets.set(key, { income: 0, expense: 0 });
  for (const row of rows) {
    const bucket = buckets.get(row.month);
    if (!bucket) continue;
    if (row.type === "INCOME") bucket.income += row.amount;
    else bucket.expense += row.amount;
  }
  return [...buckets.entries()].map(([month, totals]) => ({
    month,
    income: totals.income,
    expense: totals.expense,
  }));
}
