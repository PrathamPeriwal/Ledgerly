import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { PrismaClient } from "@prisma/client";

const PORT = 3100;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const USERS = ["maya@example.com", "lucas@example.com"];

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.on("exit", () => resolve());
    child.on("error", () => resolve());
  });
}

async function killTree(child) {
  if (process.platform === "win32") {
    if (child?.pid) await run("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
    await run("powershell", [
      "-NoProfile",
      "-Command",
      `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`,
    ]);
    return;
  }
  if (child?.pid) child.kill("SIGTERM");
}

async function defaultAccountPath(email) {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        accounts: {
          select: { id: true, isDefault: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    const account = user?.accounts.find((row) => row.isDefault) ?? user?.accounts[0];
    if (!account) throw new Error(`No default account for ${email}`);
    return `/account/${account.id}`;
  } finally {
    await prisma.$disconnect();
  }
}

function countQueries(text, from) {
  return text.slice(from).split(/\r?\n/).filter((line) => line.includes("prisma:query")).length;
}

function readySelector(route) {
  if (route.startsWith("/transaction")) return "form";
  return '[data-testid="kpi"]';
}

async function measure(page, log, route) {
  const mark = log.text.length;
  const started = performance.now();
  await page.goto(`${ORIGIN}${route}`, { waitUntil: "networkidle", timeout: 120000 });
  try {
    await page.waitForSelector(readySelector(route), { state: "attached", timeout: 90000 });
  } catch (error) {
    const text = await page.locator("body").innerText().catch(() => "");
    throw new Error(`${route} at ${page.url()} :: ${text.replace(/\s+/g, " ").slice(0, 300)}`, { cause: error });
  }
  if (page.url().includes("/sign-in")) throw new Error(`Signed out before ${route}`);
  const loadMs = Math.round(performance.now() - started);
  await page.waitForTimeout(500);
  return { route, queries: countQueries(log.text, mark), loadMs };
}

async function main() {
  loadEnv(".env");
  let server;
  let browser;
  const stdout = { text: "", get length() { return this.text.length; } };

  try {
    server = spawn("npx", ["next", "start", "-p", String(PORT)], {
      env: {
        ...process.env,
        PRISMA_LOG_QUERIES: "1",
        ARCJET_ENV: "development",
        // Transaction-mode pooler (6543) drops prepared statements. Count through the session port.
        DATABASE_URL: process.env.DIRECT_URL || process.env.DATABASE_URL,
      },
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("next start timed out")), 180000);
      const onChunk = (chunk) => {
        const text = chunk.toString();
        stdout.text += text;
        if (text.includes("Ready") || text.includes(`localhost:${PORT}`)) {
          clearTimeout(timer);
          resolve();
        }
      };
      server.stdout.on("data", onChunk);
      server.stderr.on("data", (chunk) => {
        stdout.text += chunk.toString();
      });
      server.on("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`next start exited ${code} before ready`));
      });
    });
    await ready;

    const routesByUser = new Map();
    for (const email of USERS) {
      routesByUser.set(email, ["/dashboard", await defaultAccountPath(email), "/transaction/create"]);
    }

    await clerkSetup();
    browser = await chromium.launch({ headless: true });
    const rows = [];

    for (const email of USERS) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await clerk.signIn({ page, emailAddress: email });
      for (const route of routesByUser.get(email)) {
        await measure(page, stdout, route);
        const warm = await measure(page, stdout, route);
        rows.push({ user: email, ...warm });
      }
      await context.close();
    }

    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const errors = stdout.text
      .split(/\r?\n/)
      .filter((line) => /Error|prepared statement|User not found/i.test(line) && !line.includes("SELECT"))
      .slice(-6)
      .join("\n");
    throw new Error(`${message}\n${errors}`);
  } finally {
    if (browser) await browser.close();
    await killTree(server);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
