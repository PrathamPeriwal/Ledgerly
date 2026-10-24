import { defaultCategories } from "@/data/categories";
import { generatePersonaData, type DemoData } from "@/lib/demo/generate";
import { PERSONAS, personaByKey, type PersonaKey } from "@/lib/demo/personas";
import { describe, expect, it } from "vitest";

const TODAY = new Date(Date.UTC(2026, 9, 23, 12, 0, 0, 0));
const CATEGORIES = new Map(defaultCategories.map((category) => [category.id, category.type]));

function cents(amount: number) {
  return Math.round(amount * 100);
}

function netCents(data: DemoData, accountKey: string) {
  return data.transactions.reduce((sum, entry) => {
    if (entry.accountKey !== accountKey) return sum;
    return sum + cents(entry.amount) * (entry.type === "INCOME" ? 1 : -1);
  }, 0);
}

function pack(data: DemoData) {
  return JSON.parse(JSON.stringify(data)) as unknown;
}

describe("generatePersonaData", () => {
  it("keeps five personas near one thousand transactions", () => {
    expect(PERSONAS.map((persona) => [persona.key, persona.target])).toEqual([
      ["maya", 280],
      ["daniel", 200],
      ["priya", 200],
      ["lucas", 300],
      ["hana", 12],
    ]);
    expect(PERSONAS.reduce((sum, persona) => sum + persona.target, 0)).toBe(992);
  });

  it("is deterministic and keeps every persona reconcilable", () => {
    for (const persona of PERSONAS) {
      const first = generatePersonaData(persona.key, TODAY);
      const second = generatePersonaData(persona.key, TODAY);
      expect(pack(first)).toEqual(pack(second));
      expect(first.transactions).toHaveLength(persona.target);
      expect(first.transactions.every((entry) => entry.date.getTime() <= TODAY.getTime())).toBe(true);
      expect(first.transactions.every((entry) => CATEGORIES.get(entry.category) === entry.type)).toBe(true);
      for (const account of first.accounts) {
        const net = netCents(first, account.key);
        const balance = cents(account.balance);
        const opening = balance - net;
        expect(balance).toBeGreaterThan(0);
        expect(opening + net).toBe(balance);
        expect(opening % 50).toBe(0);
      }
    }
  });

  it("gives Maya a budget and two accounts", () => {
    const maya = generatePersonaData("maya" satisfies PersonaKey, TODAY);
    expect(personaByKey("maya").accounts).toHaveLength(2);
    expect(maya.accounts.map((account) => account.key)).toEqual(["checking", "savings"]);
    expect(maya.budget?.amount).toBeGreaterThan(0);
    expect(maya.accounts.filter((account) => account.isDefault)).toHaveLength(1);
  });
});
