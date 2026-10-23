import { Prisma } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import EmailTemplate from "@/emails/template";
import { monthBoundsUtc, type MonthBounds } from "@/lib/data/dashboard-calc";
import { formatCurrency } from "@/lib/format";
import { db } from "@/lib/prisma";
import { isDemoEmail, sendEmail } from "@/lib/send-email";

const INSIGHT_TIMEOUT_MS = 20_000;
const INSIGHT_ATTEMPTS = 2;

export type MonthStats = {
  totalIncome: number;
  totalExpenses: number;
  byCategory: Record<string, number>;
  transactionCount: number;
};

type StatSql = {
  type: string;
  category: string;
  total: unknown;
  count: number;
};

type ReportUserSql = { id: string; email: string };

export function previousMonthBounds(now: Date): MonthBounds {
  return monthBoundsUtc(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15)));
}

export function previousMonthName(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15)).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
}

function asDecimal(value: unknown): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) return value;
  if (typeof value === "number" || typeof value === "bigint") return new Prisma.Decimal(value.toString());
  if (typeof value === "string" && value.trim()) return new Prisma.Decimal(value);
  return new Prisma.Decimal(0);
}

function moneyNumber(value: Prisma.Decimal): number {
  return value.toDecimalPlaces(2).toNumber();
}

export function fallbackInsights(stats: MonthStats): [string, string, string] {
  const net = stats.totalIncome - stats.totalExpenses;
  const top = Object.entries(stats.byCategory).sort((left, right) => right[1] - left[1])[0];
  const largest = top
    ? `The largest expense category was ${top[0]} at ${formatCurrency(top[1])}.`
    : "There were no completed expenses to group by category.";
  return [
    `Income was ${formatCurrency(stats.totalIncome)} and expenses were ${formatCurrency(stats.totalExpenses)}.`,
    `Net income was ${formatCurrency(net)}.`,
    largest,
  ];
}

function asThreeSentences(value: unknown): [string, string, string] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const sentences = value.map((item) => (typeof item === "string" ? item.trim() : ""));
  if (sentences.some((sentence) => sentence.length === 0 || sentence.length > 400)) return null;
  return [sentences[0], sentences[1], sentences[2]];
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function generateFinancialInsights(stats: MonthStats, month: string): Promise<unknown> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const prompt = `
    Analyze this financial data and provide 3 concise, actionable insights.
    Focus on spending patterns and practical advice.
    Keep it friendly and conversational.

    Financial Data for ${month}:
    - Total Income: ${formatCurrency(stats.totalIncome)}
    - Total Expenses: ${formatCurrency(stats.totalExpenses)}
    - Net Income: ${formatCurrency(stats.totalIncome - stats.totalExpenses)}
    - Expense Categories: ${Object.entries(stats.byCategory)
      .map(([category, amount]) => `${category}: ${formatCurrency(amount)}`)
      .join(", ")}

    Format the response as a JSON array of strings, like this:
    ["insight 1", "insight 2", "insight 3"]
  `;
  const result = await model.generateContent(prompt, { timeout: INSIGHT_TIMEOUT_MS });
  const cleaned = result.response.text().replace(/```(?:json)?\n?/g, "").trim();
  return JSON.parse(cleaned) as unknown;
}

export async function resolveInsights(
  stats: MonthStats,
  month: string,
  generate: typeof generateFinancialInsights = generateFinancialInsights,
): Promise<[string, string, string]> {
  for (let attempt = 0; attempt < INSIGHT_ATTEMPTS; attempt += 1) {
    try {
      const parsed = asThreeSentences(await withTimeout(generate(stats, month), INSIGHT_TIMEOUT_MS));
      if (parsed) return parsed;
    } catch {
      // Gemini failures fall through to the plain sentences below.
    }
  }
  return fallbackInsights(stats);
}

export async function findMonthlyReportUsers(now = new Date()): Promise<{ id: string }[]> {
  const bounds = previousMonthBounds(now);
  const rows = await db.$queryRaw<ReportUserSql[]>`
    SELECT u."id", u."email"
    FROM "users" u
    WHERE EXISTS (
      SELECT 1
      FROM "transactions" t
      WHERE t."userId" = u."id"
        AND t."status" = 'COMPLETED'::"TransactionStatus"
        AND t."date" >= ${bounds.start}
        AND t."date" < ${bounds.endExclusive}
    )
  `;
  return rows.filter((row) => !isDemoEmail(row.email)).map((row) => ({ id: row.id }));
}

export async function monthlyStats(userId: string, now = new Date()): Promise<MonthStats> {
  const bounds = previousMonthBounds(now);
  const rows = await db.$queryRaw<StatSql[]>`
    SELECT "type"::text AS "type",
           "category",
           SUM("amount") AS "total",
           COUNT(*)::int AS "count"
    FROM "transactions"
    WHERE "userId" = ${userId}
      AND "status" = 'COMPLETED'::"TransactionStatus"
      AND "date" >= ${bounds.start}
      AND "date" < ${bounds.endExclusive}
    GROUP BY "type", "category"
  `;

  const stats: MonthStats = { totalIncome: 0, totalExpenses: 0, byCategory: {}, transactionCount: 0 };
  for (const row of rows) {
    const total = moneyNumber(asDecimal(row.total));
    stats.transactionCount += Number(row.count) || 0;
    if (row.type === "INCOME") stats.totalIncome += total;
    if (row.type === "EXPENSE") {
      stats.totalExpenses += total;
      stats.byCategory[row.category] = (stats.byCategory[row.category] ?? 0) + total;
    }
  }
  return stats;
}

export async function deliverMonthlyReport(userId: string, now = new Date()): Promise<{ sent: boolean }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user?.email || isDemoEmail(user.email)) return { sent: false };

  const month = previousMonthName(now);
  const stats = await monthlyStats(userId, now);
  const insights = await resolveInsights(stats, month);
  const result = await sendEmail({
    to: user.email,
    subject: `Your Monthly Financial Report - ${month}`,
    react: EmailTemplate({
      userName: user.name ?? "",
      type: "monthly-report",
      data: { stats, month, insights },
    }),
  });
  if (!result.success) throw new Error("email failed");
  return { sent: true };
}
