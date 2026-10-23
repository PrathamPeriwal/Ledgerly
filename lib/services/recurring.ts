import { Prisma, type RecurringInterval } from "@prisma/client";
import { db } from "@/lib/prisma";
import { accountDeltas } from "@/lib/services/balance";
import { applyDeltas } from "@/lib/services/apply-deltas";

export const MAX_CATCH_UP = 31;
const DAY_MS = 86_400_000;

export type RecurringIntervalName = RecurringInterval;

const INTERVALS: readonly RecurringIntervalName[] = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];

export function isRecurringInterval(value: string): value is RecurringIntervalName {
  return (INTERVALS as readonly string[]).includes(value);
}

export type DueTemplateRef = { id: string; userId: string };

export type DueRow = {
  isRecurring: boolean;
  status: string;
  recurringInterval: string | null;
  nextRecurringDate: Date | null;
  lastProcessed?: Date | null;
};

export type ProcessResult = { created: number; skipped: boolean };

// A null lastProcessed is not due. Due is the next date, and only the next date.
export function isDueTemplate(row: DueRow, now: Date): boolean {
  if (!row.isRecurring || row.status !== "COMPLETED") return false;
  if (!row.recurringInterval || !isRecurringInterval(row.recurringInterval)) return false;
  if (!row.nextRecurringDate) return false;
  return row.nextRecurringDate.getTime() <= now.getTime();
}

export function dueTemplateWhere(now: Date) {
  return {
    isRecurring: true,
    status: "COMPLETED" as const,
    recurringInterval: { not: null },
    nextRecurringDate: { not: null, lte: now },
  };
}

export function addInterval(start: Date, interval: RecurringIntervalName, steps = 1): Date {
  if (steps === 0) return new Date(start.getTime());
  if (interval === "DAILY") return new Date(start.getTime() + steps * DAY_MS);
  if (interval === "WEEKLY") return new Date(start.getTime() + steps * 7 * DAY_MS);
  const months = interval === "YEARLY" ? 12 * steps : steps;
  return addMonthsClamped(start, months);
}

function addMonthsClamped(start: Date, months: number): Date {
  const index = start.getUTCMonth() + months;
  const year = start.getUTCFullYear() + Math.floor(index / 12);
  const month = ((index % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(start.getUTCDate(), lastDay),
      start.getUTCHours(),
      start.getUTCMinutes(),
      start.getUTCSeconds(),
      start.getUTCMilliseconds(),
    ),
  );
}

export function occurrenceDates(start: Date, interval: RecurringIntervalName, now: Date, limit = MAX_CATCH_UP): Date[] {
  const dates: Date[] = [];
  for (let step = 0; step < limit; step += 1) {
    const date = addInterval(start, interval, step);
    if (date.getTime() > now.getTime()) break;
    dates.push(date);
  }
  return dates;
}

export function firstOccurrenceAfter(start: Date, interval: RecurringIntervalName, now: Date): Date {
  if (start.getTime() > now.getTime()) return new Date(start.getTime());
  if (interval === "DAILY" || interval === "WEEKLY") {
    const stepMs = (interval === "DAILY" ? 1 : 7) * DAY_MS;
    const steps = Math.floor((now.getTime() - start.getTime()) / stepMs) + 1;
    return new Date(start.getTime() + steps * stepMs);
  }
  for (let step = 1; step <= 2400; step += 1) {
    const date = addInterval(start, interval, step);
    if (date.getTime() > now.getTime()) return date;
  }
  throw new Error("interval did not advance");
}

export async function findDueTemplates(now = new Date()): Promise<DueTemplateRef[]> {
  return db.transaction.findMany({
    where: dueTemplateWhere(now),
    select: { id: true, userId: true },
  });
}

function childDescription(description: string | null): string {
  return description ? `${description} (Recurring)` : "(Recurring)";
}

export async function processRecurringTemplate(templateId: string, userId: string, now = new Date()): Promise<ProcessResult> {
  return db.$transaction(async (tx) => {
    const template = await tx.transaction.findFirst({ where: { id: templateId, userId } });
    if (!template || !isDueTemplate(template, now) || !template.recurringInterval || !template.nextRecurringDate) {
      return { created: 0, skipped: true };
    }

    const interval = template.recurringInterval;
    const start = template.nextRecurringDate;
    const occurrences = occurrenceDates(start, interval, now);
    if (occurrences.length === 0) return { created: 0, skipped: true };

    const guard = await tx.transaction.updateMany({
      where: { id: template.id, userId, nextRecurringDate: start },
      data: {
        lastProcessed: now,
        nextRecurringDate: firstOccurrenceAfter(start, interval, now),
      },
    });
    if (guard.count !== 1) return { created: 0, skipped: true };

    const rows: Prisma.TransactionCreateManyInput[] = occurrences.map((date) => ({
      type: template.type,
      amount: template.amount,
      description: childDescription(template.description),
      date,
      category: template.category,
      userId: template.userId,
      accountId: template.accountId,
      isRecurring: false,
      status: "COMPLETED",
    }));
    await tx.transaction.createMany({ data: rows });
    await applyDeltas(
      tx,
      template.userId,
      accountDeltas(
        occurrences.map(() => ({
          type: template.type,
          amount: template.amount,
          accountId: template.accountId,
          status: "COMPLETED" as const,
        })),
      ),
    );
    return { created: rows.length, skipped: false };
  });
}
