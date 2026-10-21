import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/format";

describe("format", () => {
  it("formats USD with two decimals and an optional sign", () => {
    expect(formatCurrency(12)).toBe("$12.00");
    expect(formatCurrency(-3.5)).toBe("-$3.50");
    expect(formatCurrency(8, { sign: true })).toBe("+$8.00");
    expect(formatCurrency(-8, { sign: true })).toBe("-$8.00");
  });

  it("formats a calendar date", () => {
    expect(formatDate(new Date(2026, 9, 21))).toBe("Oct 21, 2026");
  });

  it("drops the year on formatDateShort when it is the current year", () => {
    const year = new Date().getFullYear();
    expect(formatDateShort(new Date(year, 9, 20))).toBe("Oct 20");
    expect(formatDateShort(new Date(year - 1, 9, 20))).toBe(`Oct 20, ${year - 1}`);
  });
});
