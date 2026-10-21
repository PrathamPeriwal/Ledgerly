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

const SYNONYMS: Record<string, string> = {
  grocery: "groceries",
  supermarket: "groceries",
  market: "groceries",
  restaurant: "food",
  cafe: "food",
  coffee: "food",
  dining: "food",
  takeaway: "food",
  "fast food": "food",
  "food and drink": "food",
  bar: "food",
  fuel: "transportation",
  gas: "transportation",
  petrol: "transportation",
  taxi: "transportation",
  ride: "transportation",
  rideshare: "transportation",
  transit: "transportation",
  parking: "transportation",
  pharmacy: "healthcare",
  medical: "healthcare",
  doctor: "healthcare",
  clinic: "healthcare",
  rent: "housing",
  mortgage: "housing",
  electric: "utilities",
  electricity: "utilities",
  internet: "utilities",
  movie: "entertainment",
  movies: "entertainment",
  streaming: "entertainment",
  clothing: "shopping",
  clothes: "shopping",
  tuition: "education",
  haircut: "personal",
  gym: "personal",
  flight: "travel",
  hotel: "travel",
  gift: "gifts",
  donation: "gifts",
  paycheck: "salary",
  wage: "salary",
};

function norm(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function singular(value: string) {
  if (value.endsWith("ies")) return `${value.slice(0, -3)}y`;
  if (value.endsWith("s") && !value.endsWith("ss")) return value.slice(0, -1);
  return value;
}

function tokens(value: string) {
  return norm(value)
    .split(" ")
    .filter((token) => token && token !== "and" && token !== "the");
}

function resolveCategory(raw: string) {
  const text = norm(raw);
  if (!text) return undefined;
  const folded = singular(text);
  const byId = defaultCategories.find((category) => category.id === text || singular(category.id) === folded);
  if (byId) return byId;
  const byLabel = defaultCategories.find((category) => {
    const label = norm(category.name);
    return label === text || singular(label) === folded;
  });
  if (byLabel) return byLabel;
  const synonym = SYNONYMS[text] ?? SYNONYMS[folded];
  const synonymMatch = synonym ? defaultCategories.find((category) => category.id === synonym) : undefined;
  if (synonymMatch) return synonymMatch;
  const words = new Set(tokens(text));
  let best: (typeof defaultCategories)[number] | undefined;
  let bestScore = 0;
  for (const category of defaultCategories) {
    const labelTokens = tokens(category.name);
    if (labelTokens.length === 0 || !labelTokens.every((token) => words.has(token))) continue;
    if (labelTokens.length > bestScore) {
      best = category;
      bestScore = labelTokens.length;
    }
  }
  return best;
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
  const match = resolveCategory(`${data.category ?? data.Category ?? ""}`);
  const type = match?.type === "INCOME" ? "INCOME" : "EXPENSE";
  const fallback = type === "INCOME" ? "other-income" : "other-expense";
  const category = match?.id ?? fallback;
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
