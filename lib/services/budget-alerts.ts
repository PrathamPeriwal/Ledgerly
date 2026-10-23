import { Prisma } from "@prisma/client";
import EmailTemplate from "@/emails/template";
import { monthBoundsUtc, monthKey } from "@/lib/data/dashboard-calc";
import { db } from "@/lib/prisma";
import { sendEmail } from "@/lib/send-email";

export type BudgetAlert = {
  userId: string;
  percentageUsed: number;
  budgetAmount: number;
  totalExpenses: number;
};

type BudgetSql = {
  userId: string;
  amount: unknown;
  lastAlertSent: Date | string | null;
  spent: unknown;
};

function asDecimal(value: unknown): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) return value;
  if (typeof value === "number" || typeof value === "bigint") return new Prisma.Decimal(value.toString());
  if (typeof value === "string" && value.trim()) return new Prisma.Decimal(value);
  return new Prisma.Decimal(0);
}

function asDate(value: Date | string | null): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function moneyNumber(value: Prisma.Decimal): number {
  return value.toDecimalPlaces(2).toNumber();
}

export function isBudgetAlertDue(
  input: { amount: Prisma.Decimal; spent: Prisma.Decimal; lastAlertSent: Date | null },
  now: Date,
): boolean {
  if (input.amount.lessThanOrEqualTo(0)) return false;
  if (input.spent.lessThan(input.amount.times("0.8"))) return false;
  if (!input.lastAlertSent) return true;
  return monthKey(input.lastAlertSent) !== monthKey(now);
}

export async function findBudgetAlerts(now = new Date()): Promise<BudgetAlert[]> {
  const bounds = monthBoundsUtc(now);
  const rows = await db.$queryRaw<BudgetSql[]>`
    SELECT b."userId" AS "userId",
           b."amount" AS "amount",
           b."lastAlertSent" AS "lastAlertSent",
           COALESCE(SUM(t."amount"), 0) AS "spent"
    FROM "budgets" b
    LEFT JOIN "transactions" t
      ON t."userId" = b."userId"
     AND t."type" = 'EXPENSE'::"TransactionType"
     AND t."status" = 'COMPLETED'::"TransactionStatus"
     AND t."date" >= ${bounds.start}
     AND t."date" < ${bounds.endExclusive}
    GROUP BY b."userId", b."amount", b."lastAlertSent"
  `;

  const alerts: BudgetAlert[] = [];
  for (const row of rows) {
    const amount = asDecimal(row.amount);
    const spent = asDecimal(row.spent);
    const lastAlertSent = asDate(row.lastAlertSent);
    if (!isBudgetAlertDue({ amount, spent, lastAlertSent }, now)) continue;
    alerts.push({
      userId: row.userId,
      percentageUsed: spent.dividedBy(amount).times(100).toNumber(),
      budgetAmount: moneyNumber(amount),
      totalExpenses: moneyNumber(spent),
    });
  }
  return alerts;
}

export async function deliverBudgetAlert(alert: BudgetAlert, now = new Date()): Promise<{ sent: boolean }> {
  const user = await db.user.findUnique({
    where: { id: alert.userId },
    select: { email: true, name: true },
  });
  if (!user?.email) return { sent: false };

  const result = await sendEmail({
    to: user.email,
    subject: "Budget Alert",
    react: EmailTemplate({
      userName: user.name ?? "",
      type: "budget-alert",
      data: {
        percentageUsed: alert.percentageUsed,
        budgetAmount: alert.budgetAmount,
        totalExpenses: alert.totalExpenses,
      },
    }),
  });
  if (!result.success) throw new Error("email failed");

  await db.budget.updateMany({
    where: { userId: alert.userId },
    data: { lastAlertSent: now },
  });
  return { sent: true };
}
