import { z } from "zod";
import { defaultCategories } from "@/data/categories";

const looseText = z.union([z.number(), z.string()]).nullish();
const looseString = z.string().nullish();

const scanJson = z
  .object({
    amount: looseText,
    "Total amount": looseText,
    date: looseText,
    Date: looseText,
    description: looseString,
    Description: looseString,
    merchantName: looseString,
    "Merchant name": looseString,
    category: looseString,
    Category: looseString,
  })
  .passthrough();

export type MappedScan = {
  amount: string;
  date: Date;
  type: "EXPENSE" | "INCOME";
  category: string;
  description: string;
};

function money(value: unknown) {
  const raw = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(raw)) return "0.00";
  return Math.abs(raw).toFixed(2);
}

function parsedDate(value: unknown, now: Date) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date(now.getTime());
}

export function mapScanReceipt(input: unknown, now = new Date()): MappedScan {
  const parsed = scanJson.safeParse(input);
  if (!parsed.success) throw new Error("unparsable");

  const data = parsed.data;
  const categoryId = `${data.category ?? data.Category ?? ""}`.trim();
  const match = defaultCategories.find((category) => category.id === categoryId);
  const type = match?.type === "INCOME" ? "INCOME" : "EXPENSE";
  const fallback = type === "INCOME" ? "other-income" : "other-expense";
  const category = match && match.type === type ? match.id : fallback;
  const merchant = `${data.merchantName ?? data["Merchant name"] ?? ""}`.trim();
  const description = `${data.description ?? data.Description ?? ""}`.trim();

  return {
    amount: money(data.amount ?? data["Total amount"]),
    date: parsedDate(data.date ?? data.Date, now),
    type,
    category,
    description: (merchant || description).slice(0, 100),
  };
}
