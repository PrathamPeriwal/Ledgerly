// Demo personas for Ledgerly. Default is a dry run.
//   npm run seed:demo
//   npm run seed:demo -- --confirm
//   npm run seed:demo -- --confirm --allow-live
//
// --confirm wipes transactions, budgets, accounts, and users, then inserts
// the six personas. It never deletes a Clerk user.

import { createClerkClient } from "@clerk/backend";
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEMO_START,
  anchorToday,
  generatePersonaData,
  monthExpense,
  shapedSpendTarget,
  type DemoData,
  type DemoTransaction,
} from "../lib/demo/generate.ts";
import { DEMO_EMAIL_DOMAIN, PERSONAS, personaByKey, type PersonaKey } from "../lib/demo/personas.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHUNK = 500;
const KNOWN_ARGS = new Set(["--confirm", "--allow-live"]);

type Identity = {
  key: PersonaKey;
  firstName: string;
  lastName: string;
  email: string;
};

type ClerkEmail = { id: string; emailAddress: string; verification?: { status: string | null } | null };
type ClerkUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  emailAddresses: ClerkEmail[];
};

function loadEnv(file: string) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function redact(value: unknown) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://[redacted]")
    .replace(/sk_(?:test|live)_[A-Za-z0-9]+/g, "sk_[redacted]");
}

function databaseHost(connectionString: string | undefined) {
  if (!connectionString) return "(DIRECT_URL is not set)";
  try {
    const url = new URL(connectionString);
    return url.port ? `${url.hostname}:${url.port}` : url.hostname;
  } catch {
    return "(DIRECT_URL could not be parsed)";
  }
}

function clerkKeyKind(secret: string | undefined) {
  if (!secret) return "missing";
  if (secret.startsWith("sk_live")) return "sk_live";
  if (secret.startsWith("sk_test")) return "sk_test";
  return "unrecognized";
}

function newestBackup() {
  const dir = path.join(ROOT, "backups");
  if (!existsSync(dir)) return null;
  let best: { name: string; mtimeMs: number; ageDays: number } | null = null;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    let info;
    try {
      info = statSync(full);
    } catch {
      continue;
    }
    if (!info.isFile()) continue;
    if (!best || info.mtimeMs > best.mtimeMs) {
      best = { name, mtimeMs: info.mtimeMs, ageDays: (Date.now() - info.mtimeMs) / 86400000 };
    }
  }
  return best;
}

function loadCategories() {
  const source = readFileSync(path.join(ROOT, "data", "categories.js"), "utf8");
  const found = [...source.matchAll(/\{\s*id:\s*"([^"]+)",\s*name:\s*"[^"]+",\s*type:\s*"(INCOME|EXPENSE)"/g)];
  if (found.length < 10) throw new Error("Could not read category ids from data/categories.js");
  return new Map(found.map((match) => [match[1], match[2]]));
}

function money(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function dayStamp(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcMonths(date: Date, count: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, date.getUTCDate(), 12, 0, 0, 0));
}

function cents(amount: number) {
  return Math.round(amount * 100);
}

function netCents(data: DemoData, accountKey: string) {
  return data.transactions.reduce((sum, entry) => {
    if (entry.accountKey !== accountKey) return sum;
    return sum + (entry.type === "INCOME" ? cents(entry.amount) : -cents(entry.amount));
  }, 0);
}

function verifyPlan(plans: Map<PersonaKey, DemoData>, identities: Identity[], now: Date, today: Date, categories: Map<string, string>) {
  const problems: string[] = [];
  const fail = (message: string) => problems.push(message);
  for (const identity of identities) {
    const persona = personaByKey(identity.key);
    const data = plans.get(identity.key);
    if (!data) {
      fail(`${identity.key} is missing`);
      continue;
    }
    if (data.transactions.length !== persona.target) {
      fail(`${identity.key} has ${data.transactions.length} transactions, expected ${persona.target}`);
    }
    if (data.accounts.filter((account) => account.isDefault).length !== 1) fail(`${identity.key} should have one default account`);
    if ((data.budget == null) !== (persona.budgetDollars == null)) fail(`${identity.key} budget presence does not match`);
    if (identity.key === "hana" && data.budget != null) fail("Hana should not have a budget");
    const keys = new Set(data.accounts.map((account) => account.key));
    for (const entry of data.transactions) {
      if (!keys.has(entry.accountKey)) fail(`${identity.key} transaction uses an unknown account ${entry.accountKey}`);
      if (entry.date.getTime() > now.getTime() || entry.date > today) fail(`${identity.key} has a future date ${entry.date.toISOString()}`);
      if (entry.date < DEMO_START) fail(`${identity.key} has a date before 2026-04-01`);
      if (entry.date.getUTCHours() !== 12 || entry.date.getUTCMinutes() !== 0 || entry.date.getUTCSeconds() !== 0) {
        fail(`${identity.key} date is not 12:00 UTC`);
      }
      if (!Number.isInteger(cents(entry.amount)) || cents(entry.amount) <= 0) fail(`${identity.key} amount is not a positive cent value`);
      if (entry.status !== "COMPLETED" || entry.receiptUrl !== null) fail(`${identity.key} transaction is not completed or has a receipt`);
      const categoryType = categories.get(entry.category);
      if (!categoryType) fail(`${identity.key} category ${entry.category} is not in data/categories.js`);
      else if (categoryType !== entry.type) fail(`${identity.key} ${entry.category} is ${categoryType} but the row is ${entry.type}`);
      checkRecurring(identity.key, entry, now, fail);
    }
    for (const account of data.accounts) {
      const balance = cents(account.balance);
      const net = netCents(data, account.key);
      if (balance <= 0 || balance - net + net !== balance) fail(`${identity.key} ${account.name} balance does not reconcile`);
    }
    if (identity.key === "hana") {
      const earliest = today.getTime() - 13 * 86400000;
      if (data.transactions.some((entry) => entry.isRecurring || entry.date.getTime() < earliest)) {
        fail("Hana should have only the last 14 days and no recurring rows");
      }
    }
    const target = shapedSpendTarget(identity.key);
    if (target != null) {
      const accountKey = identity.key === "daniel" ? "business" : "checking";
      const spent = monthExpense(data, accountKey, today);
      const stable = monthExpense(data, accountKey, today, true);
      if (cents(spent) !== cents(target) || cents(stable) !== cents(target)) {
        fail(`${identity.key} current-month spending is ${money(spent)} (stable ${money(stable)}), expected ${money(target)}`);
      }
    }
  }
  if (problems.length > 0) throw new Error(`Seed plan failed verification:\n${problems.join("\n")}`);
}

function checkRecurring(key: string, entry: DemoTransaction, now: Date, fail: (message: string) => void) {
  if (entry.isRecurring) {
    if (entry.recurringInterval !== "MONTHLY" || !entry.nextRecurringDate || !entry.lastProcessed) {
      fail(`${key} template ${entry.description} is missing monthly schedule fields`);
    } else if (entry.description.endsWith("(Recurring)")) {
      fail(`${key} template description should not include (Recurring)`);
    } else if (entry.nextRecurringDate.getTime() <= now.getTime()) {
      fail(`${key} next recurring date is not after today`);
    } else if (entry.lastProcessed.getTime() !== entry.date.getTime()) {
      fail(`${key} lastProcessed does not match the template date`);
    } else if (addUtcMonths(entry.date, 1).getTime() !== entry.nextRecurringDate.getTime()) {
      fail(`${key} next recurring date is not one month after the template`);
    }
    return;
  }
  if (entry.recurringInterval || entry.nextRecurringDate || entry.lastProcessed) fail(`${key} non-recurring row has schedule fields`);
}

function printPlan(
  plans: Map<PersonaKey, DemoData>,
  identities: Identity[],
  now: Date,
  meta: {
    confirm: boolean;
    host: string;
    keyKind: string;
    backup: { name: string; ageDays: number } | null;
    passwordSet: boolean;
    today: Date;
    counts: Record<string, number>;
    blockers: string[];
  },
) {
  console.log(meta.confirm ? "seed:demo result" : "seed:demo DRY RUN — nothing will be written");
  console.log("");
  console.log(`Database host: ${meta.host}`);
  console.log(`Clerk key: ${meta.keyKind}`);
  console.log(meta.backup ? `Backup: ${meta.backup.name} (${meta.backup.ageDays.toFixed(1)} days old)` : "Backup: none in backups/");
  console.log(`DEMO_USER_PASSWORD: ${meta.passwordSet ? "set" : "missing"}`);
  console.log(`Date window: ${dayStamp(DEMO_START)} .. ${dayStamp(meta.today)} (12:00 UTC)`);
  console.log("");
  console.log("Current rows");
  for (const [table, count] of Object.entries(meta.counts)) console.log(`  ${table.padEnd(14)} ${count}`);
  console.log("");
  if (meta.blockers.length > 0) {
    console.log("Confirm would be refused:");
    for (const blocker of meta.blockers) console.log(`  - ${blocker}`);
    console.log("");
  }
  console.log("Wipe plan (only with --confirm)");
  console.log("  delete transactions, budgets, accounts, users in one transaction");
  console.log("  Clerk users are created or updated, never deleted");
  console.log("");
  const total = identities.reduce((sum, identity) => sum + (plans.get(identity.key)?.transactions.length ?? 0), 0);
  console.log(`Planned personas (${total} transactions)`);
  for (const identity of identities) printPersona(identity, plans.get(identity.key), now);
  console.log("");
  console.log("Notes");
  console.log("  Recurring templates are the latest occurrence. Earlier months are \"<Name> (Recurring)\" rows.");
  console.log("  Weekly payroll is a completed row every Friday, funded by a transfer. Cafe rent is the MONTHLY template.");
  console.log("  Daniel's Business Checking October expenses are 90% of his ₹70,000.00 budget.");
  console.log("  Priya's October expenses are 115% of her ₹30,000.00 budget.");
  console.log("  Those two totals stay put for the whole local day: nothing that counts is dated on the 1st.");
  console.log("  --confirm replaces every application row. It does not delete Clerk users.");
}

function printPersona(identity: Identity, data: DemoData | undefined, now: Date) {
  if (!data) return;
  console.log("");
  console.log(`${identity.firstName} ${identity.lastName}  ${identity.email}`);
  console.log(data.budget == null ? "  budget: none" : `  budget: ${money(data.budget.amount)}`);
  for (const account of data.accounts) {
    const count = data.transactions.filter((entry) => entry.accountKey === account.key).length;
    const flag = account.isDefault ? "default" : "       ";
    const opening = (cents(account.balance) - netCents(data, account.key)) / 100;
    console.log(
      `  ${account.name.padEnd(22)} ${account.type.padEnd(8)} ${flag}  opening ${money(opening).padStart(12)}  balance ${money(account.balance).padStart(12)}  txs ${String(count).padStart(4)}`,
    );
  }
  const times = data.transactions.map((entry) => entry.date.getTime());
  const income = data.transactions.filter((entry) => entry.type === "INCOME").reduce((sum, entry) => sum + cents(entry.amount), 0) / 100;
  const expense = data.transactions.filter((entry) => entry.type === "EXPENSE").reduce((sum, entry) => sum + cents(entry.amount), 0) / 100;
  console.log(
    `  transactions ${data.transactions.length}  ${dayStamp(new Date(Math.min(...times)))} .. ${dayStamp(new Date(Math.max(...times)))}  income ${money(income)}  expense ${money(expense)}`,
  );
  const templates = data.transactions.filter((entry) => entry.isRecurring);
  if (templates.length === 0) console.log("  recurring templates: none");
  else {
    console.log("  recurring templates:");
    for (const template of templates) {
      const account = data.accounts.find((item) => item.key === template.accountKey);
      console.log(
        `    ${template.description} (${template.type}, ${account?.name})  ${money(template.amount)}  next ${template.nextRecurringDate?.toISOString()}`,
      );
    }
  }
  if (data.budget != null) {
    const account = data.accounts.find((item) => item.isDefault);
    if (!account) return;
    const spent = monthExpense(data, account.key, anchorToday(now));
    const pct = ((spent / data.budget.amount) * 100).toFixed(1);
    console.log(`  current-month default-account expenses: ${money(spent)} (${pct}% of budget)`);
  }
}

function clerkErrorText(error: unknown) {
  const record = error as { message?: string; errors?: { code?: string; message?: string; longMessage?: string }[] };
  const parts = [record?.message];
  if (Array.isArray(record?.errors)) {
    for (const item of record.errors) parts.push(item.code, item.message, item.longMessage);
  }
  return parts.filter(Boolean).join(" ");
}

function isDomainRejection(error: unknown) {
  const text = clerkErrorText(error).toLowerCase();
  return (
    text.includes("form_email_address_blocked") ||
    text.includes("form_param_format_invalid") ||
    (text.includes("domain") && (text.includes("not allowed") || text.includes("invalid") || text.includes("blocked")))
  );
}

type ClerkApi = {
  users: {
    getUserList: (query: { emailAddress: string[]; limit: number }) => Promise<{ data: ClerkUser[] }>;
    updateUser: (id: string, data: { firstName: string; lastName: string; password: string; skipPasswordChecks: boolean }) => Promise<ClerkUser>;
    createUser: (data: {
      emailAddress: string[];
      username: string;
      password: string;
      firstName: string;
      lastName: string;
      skipPasswordChecks: boolean;
      skipLegalChecks: boolean;
    }) => Promise<ClerkUser>;
    getUser: (id: string) => Promise<ClerkUser>;
  };
  emailAddresses: {
    updateEmailAddress: (id: string, data: { verified: boolean; primary: boolean }) => Promise<unknown>;
  };
};

async function upsertClerkUser(clerk: ClerkApi, persona: Identity, password: string) {
  const list = await clerk.users.getUserList({ emailAddress: [persona.email], limit: 10 });
  const existing = list.data.find((user) =>
    user.emailAddresses.some((email) => email.emailAddress.toLowerCase() === persona.email.toLowerCase()),
  );
  const username = `${persona.firstName}-${persona.lastName}`.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  let user = existing
    ? await clerk.users.updateUser(existing.id, {
        firstName: persona.firstName,
        lastName: persona.lastName,
        password,
        skipPasswordChecks: true,
      })
    : await clerk.users.createUser({
        emailAddress: [persona.email],
        username,
        password,
        firstName: persona.firstName,
        lastName: persona.lastName,
        skipPasswordChecks: true,
        skipLegalChecks: true,
      });
  const email = user.emailAddresses.find((item) => item.emailAddress.toLowerCase() === persona.email.toLowerCase());
  if (email && email.verification?.status !== "verified") {
    await clerk.emailAddresses.updateEmailAddress(email.id, { verified: true, primary: true });
  }
  user = await clerk.users.getUser(user.id);
  return user;
}

async function ensureClerkUsers(clerk: ClerkApi, personas: Identity[], password: string): Promise<ClerkUser[]> {
  try {
    const users: ClerkUser[] = [];
    for (const persona of personas) users.push(await upsertClerkUser(clerk, persona, password));
    return users;
  } catch (error) {
    if (personas[0]?.email.endsWith(`@${DEMO_EMAIL_DOMAIN}`) && isDomainRejection(error)) {
      console.log(`Clerk rejected @${DEMO_EMAIL_DOMAIN} (${clerkErrorText(error).replace(/\s+/g, " ")}). Retrying with @example.com.`);
      return ensureClerkUsers(
        clerk,
        personas.map((persona) => ({ ...persona, email: persona.email.replace(`@${DEMO_EMAIL_DOMAIN}`, "@example.com") })),
        password,
      );
    }
    throw new Error(clerkErrorText(error));
  }
}

function decimalToCents(value: { toString(): string }) {
  const text = value.toString();
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace("-", "").split(".");
  const amount = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return negative ? -amount : amount;
}

async function verifyDatabase(prisma: PrismaClient, identities: Identity[], plans: Map<PersonaKey, DemoData>, now: Date, categories: Map<string, string>) {
  const users = await prisma.user.findMany({ include: { accounts: true, budgets: true } });
  const transactions = await prisma.transaction.findMany();
  const problems: string[] = [];
  const fail = (message: string) => problems.push(message);
  if (users.length !== identities.length) fail(`expected ${identities.length} users, found ${users.length}`);
  const accountsById = new Map<string, { id: string; userId: string }>();
  for (const user of users) for (const account of user.accounts) accountsById.set(account.id, account);
  for (const entry of transactions) {
    const account = accountsById.get(entry.accountId);
    if (!account || account.userId !== entry.userId) fail("a transaction account belongs to a different user");
    if (entry.date.getTime() > now.getTime()) fail("a stored transaction is in the future");
    if (entry.receiptUrl != null || entry.status !== "COMPLETED") fail("a stored transaction is not completed or has a receipt");
    if (!categories.has(entry.category)) fail(`stored category ${entry.category} is invalid`);
  }
  for (const identity of identities) {
    const data = plans.get(identity.key);
    const user = users.find((item) => item.email === identity.email);
    if (!data || !user) {
      fail(`missing database user ${identity.email}`);
      continue;
    }
    if (user.clerkUserId == null || user.name !== `${identity.firstName} ${identity.lastName}`) {
      fail(`${identity.email} was not stored with the checkUser fields`);
    }
    if ((user.budgets.length === 0) !== (data.budget == null)) fail(`${identity.email} budget presence does not match the plan`);
    if (user.budgets[0] && data.budget && decimalToCents(user.budgets[0].amount) !== cents(data.budget.amount)) {
      fail(`${identity.email} budget amount does not match`);
    }
    if (user.budgets[0] && user.budgets[0].lastAlertSent != null) fail(`${identity.email} lastAlertSent should be null`);
    for (const account of data.accounts) {
      const stored = user.accounts.find((item) => item.name === account.name);
      if (!stored) {
        fail(`missing account ${account.name}`);
        continue;
      }
      const rows = transactions.filter((entry) => entry.accountId === stored.id);
      const net = rows.reduce((sum, entry) => sum + (entry.type === "INCOME" ? decimalToCents(entry.amount) : -decimalToCents(entry.amount)), 0);
      if (decimalToCents(stored.balance) !== cents(account.balance) || net !== netCents(data, account.key)) {
        fail(`${account.name} balance does not reconcile`);
      }
    }
  }
  if (problems.length > 0) throw new Error(`Database verification failed:\n${problems.join("\n")}`);
}

async function writePersonas(prisma: PrismaClient, identities: Identity[], clerkUsers: ClerkUser[], plans: Map<PersonaKey, DemoData>) {
  await prisma.$transaction(
    async (tx) => {
      await tx.transaction.deleteMany();
      await tx.budget.deleteMany();
      await tx.account.deleteMany();
      await tx.user.deleteMany();
    },
    { timeout: 120000, maxWait: 20000 },
  );

  const rows: {
    type: "INCOME" | "EXPENSE";
    amount: string;
    description: string;
    date: Date;
    category: string;
    receiptUrl: null;
    isRecurring: boolean;
    recurringInterval: "MONTHLY" | null;
    nextRecurringDate: Date | null;
    lastProcessed: Date | null;
    status: "COMPLETED";
    userId: string;
    accountId: string;
  }[] = [];

  for (let index = 0; index < identities.length; index += 1) {
    const identity = identities[index];
    const clerkUser = clerkUsers[index];
    const data = identity && plans.get(identity.key);
    if (!identity || !clerkUser || !data) throw new Error("Persona and Clerk user counts diverged");
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) throw new Error("Clerk user is missing an email");
    identity.email = email;
    identity.firstName = clerkUser.firstName ?? identity.firstName;
    identity.lastName = clerkUser.lastName ?? identity.lastName;
    const created = await prisma.user.create({
      data: { clerkUserId: clerkUser.id, name: `${clerkUser.firstName} ${clerkUser.lastName}`, imageUrl: clerkUser.imageUrl, email },
    });
    const accountIds = new Map<string, string>();
    for (const account of data.accounts) {
      const stored = await prisma.account.create({
        data: {
          name: account.name,
          type: account.type,
          balance: account.balance.toFixed(2),
          isDefault: account.isDefault,
          userId: created.id,
        },
      });
      accountIds.set(account.key, stored.id);
    }
    if (data.budget != null) {
      await prisma.budget.create({ data: { amount: data.budget.amount.toFixed(2), lastAlertSent: null, userId: created.id } });
    }
    for (const entry of data.transactions) {
      const accountId = accountIds.get(entry.accountKey);
      if (!accountId) throw new Error(`${identity.key} is missing account ${entry.accountKey}`);
      rows.push({
        type: entry.type,
        amount: entry.amount.toFixed(2),
        description: entry.description,
        date: entry.date,
        category: entry.category,
        receiptUrl: null,
        isRecurring: entry.isRecurring,
        recurringInterval: entry.recurringInterval,
        nextRecurringDate: entry.nextRecurringDate,
        lastProcessed: entry.lastProcessed,
        status: "COMPLETED",
        userId: created.id,
        accountId,
      });
    }
  }

  for (let index = 0; index < rows.length; index += CHUNK) {
    await prisma.transaction.createMany({ data: rows.slice(index, index + CHUNK) });
  }
}

function confirmBlockers(meta: { keyKind: string; allowLive: boolean; backup: { ageDays: number } | null }) {
  const blockers: string[] = [];
  if (!process.env.DIRECT_URL) blockers.push("DIRECT_URL is missing");
  if (!process.env.CLERK_SECRET_KEY) blockers.push("CLERK_SECRET_KEY is missing");
  if (!process.env.DEMO_USER_PASSWORD) blockers.push("DEMO_USER_PASSWORD is missing");
  if (meta.keyKind === "sk_live" && !meta.allowLive) blockers.push("CLERK_SECRET_KEY is sk_live; pass --allow-live to override");
  if (meta.keyKind === "unrecognized") blockers.push("CLERK_SECRET_KEY is not sk_test or sk_live");
  if (!meta.backup) blockers.push("backups/ has no file");
  else if (meta.backup.ageDays >= 7) blockers.push(`newest backup is ${meta.backup.ageDays.toFixed(1)} days old (need less than 7)`);
  return blockers;
}

async function main() {
  const args = process.argv.slice(2);
  for (const arg of args) if (!KNOWN_ARGS.has(arg)) throw new Error(`Unknown argument: ${arg}`);
  const confirm = args.includes("--confirm");
  const allowLive = args.includes("--allow-live");
  loadEnv(path.join(ROOT, ".env"));

  const now = new Date();
  const today = anchorToday(now);
  if (today < DEMO_START) throw new Error("The date window ends before 2026-04-01");
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) throw new Error("DIRECT_URL is not set");

  const categories = loadCategories();
  const prisma = new PrismaClient({ datasourceUrl: directUrl, log: ["error"] });
  try {
    const [users, accounts, transactions, budgets] = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.transaction.count(),
      prisma.budget.count(),
    ]);
    const identities: Identity[] = PERSONAS.map((persona) => ({
      key: persona.key,
      firstName: persona.firstName,
      lastName: persona.lastName,
      email: persona.email,
    }));
    const plans = new Map<PersonaKey, DemoData>(identities.map((identity) => [identity.key, generatePersonaData(identity.key, today)]));
    verifyPlan(plans, identities, now, today, categories);

    const meta = {
      host: databaseHost(directUrl),
      keyKind: clerkKeyKind(process.env.CLERK_SECRET_KEY),
      backup: newestBackup(),
      passwordSet: Boolean(process.env.DEMO_USER_PASSWORD),
      today,
      allowLive,
      confirm,
      counts: { users, accounts, transactions, budgets },
      blockers: [] as string[],
    };
    meta.blockers = confirmBlockers(meta);
    if (!confirm) {
      printPlan(plans, identities, now, meta);
      return;
    }
    if (meta.blockers.length > 0) throw new Error(`Refusing to seed:\n${meta.blockers.map((item) => `- ${item}`).join("\n")}`);

    console.log(`Seeding ${meta.host} (${meta.keyKind}). Clerk users will not be deleted.`);
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const clerkUsers = await ensureClerkUsers(clerk as unknown as ClerkApi, identities, process.env.DEMO_USER_PASSWORD ?? "");
    await writePersonas(prisma, identities, clerkUsers, plans);
    await verifyDatabase(prisma, identities, plans, now, categories);
    printPlan(plans, identities, now, { ...meta, blockers: [] });
    console.log("");
    console.log("Credentials");
    console.log("email                         password");
    for (const identity of identities) console.log(`${identity.email.padEnd(29)} ${process.env.DEMO_USER_PASSWORD}`);
    console.log("");
    console.log("seed:demo wrote the six demo personas");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(redact(error instanceof Error ? error.stack || error.message : error));
  process.exitCode = 1;
});
