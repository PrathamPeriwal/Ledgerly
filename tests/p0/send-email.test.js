import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function sourceFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git" || entry === "tests") {
      continue;
    }
    const full = path.join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) sourceFiles(full, acc);
    else if (/\.(js|jsx|mjs|cjs|ts|tsx)$/.test(entry)) acc.push(full);
  }
  return acc;
}

describe("sendEmail", () => {
  it("lives in a plain server module without the use server directive", () => {
    const file = path.join(root, "lib", "send-email.js");
    const source = readFileSync(file, "utf8");

    expect(existsSync(path.join(root, "actions", "send-email.js"))).toBe(false);
    expect(source).not.toMatch(/["']use server["']/);
    expect(source).toMatch(/export async function sendEmail/);
  });

  it("is imported from lib/send-email by every caller", () => {
    const callers = sourceFiles(root).filter((file) => {
      const source = readFileSync(file, "utf8");
      return source.includes("sendEmail") && !file.endsWith(`${path.sep}lib${path.sep}send-email.js`);
    });

    expect(callers.map((file) => path.relative(root, file)).sort()).toEqual([
      path.join("lib", "services", "budget-alerts.ts"),
      path.join("lib", "services", "monthly-report.ts"),
    ]);

    for (const file of callers) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain('from "@/lib/send-email"');
      expect(source).not.toContain("actions/send-email");
    }
  });
});
