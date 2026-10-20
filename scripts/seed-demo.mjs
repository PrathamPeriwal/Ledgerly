// Demo personas for Ledgerly. Default is a dry run.
//   node scripts/seed-demo.mjs
//   node scripts/seed-demo.mjs --confirm
//   node scripts/seed-demo.mjs --confirm --allow-live
//
// --confirm wipes transactions, budgets, accounts, and users, then inserts
// the six personas. It never deletes a Clerk user.

import { createClerkClient } from "@clerk/backend";
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// keep in sync with isDemoEmail() in lib/send-email.js
const DEMO_EMAIL_DOMAIN = "ledgerly-demo.test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const START = utcNoon(2026, 3, 1);
const CHUNK = 500;
const TARGETS = {
  maya: 300,
  daniel: 220,
  priya: 260,
  lucas: 380,
  omar: 3000,
  hana: 12,
};
const DANIEL_OCTOBER_CENTS = 252000; // 90% of $2,800
const PRIYA_OCTOBER_CENTS = 138000; // 115% of $1,200

const KNOWN_ARGS = new Set(["--confirm", "--allow-live"]);

function loadEnv(file) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
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

function redact(value) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://[redacted]")
    .replace(/sk_(?:test|live)_[A-Za-z0-9]+/g, "sk_[redacted]");
}

function databaseHost(connectionString) {
  if (!connectionString) return "(DIRECT_URL is not set)";
  try {
    const url = new URL(connectionString);
    return url.port ? `${url.hostname}:${url.port}` : url.hostname;
  } catch {
    return "(DIRECT_URL could not be parsed)";
  }
}

function clerkKeyKind(secret) {
  if (!secret) return "missing";
  if (secret.startsWith("sk_live")) return "sk_live";
  if (secret.startsWith("sk_test")) return "sk_test";
  return "unrecognized";
}

function newestBackup() {
  const dir = path.join(ROOT, "backups");
  if (!existsSync(dir)) return null;
  let best = null;
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
      best = {
        name,
        mtimeMs: info.mtimeMs,
        ageDays: (Date.now() - info.mtimeMs) / 86400000,
      };
    }
  }
  return best;
}

function loadCategories() {
  const source = readFileSync(path.join(ROOT, "data", "categories.js"), "utf8");
  const found = [
    ...source.matchAll(
      /\{\s*id:\s*"([^"]+)",\s*name:\s*"[^"]+",\s*type:\s*"(INCOME|EXPENSE)"/g
    ),
  ];
  if (found.length < 10) {
    throw new Error("Could not read category ids from data/categories.js");
  }
  return new Map(found.map((match) => [match[1], match[2]]));
}

function utcNoon(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0, 0));
}

function latestAllowedNoon(now) {
  let noon = utcNoon(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (noon.getTime() > now.getTime()) {
    noon = new Date(noon.getTime() - 86400000);
  }
  return noon;
}

function addUtcMonths(date, count) {
  return utcNoon(
    date.getUTCFullYear(),
    date.getUTCMonth() + count,
    date.getUTCDate()
  );
}

function hashSeed(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return function rand() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rand, min, max) {
  if (max < min) throw new Error(`bad range ${min}..${max}`);
  return min + Math.floor(rand() * (max - min + 1));
}

function dollarsToCents(value) {
  return Math.round(value * 100);
}

function betweenCents(rand, minDollars, maxDollars) {
  return randomInt(rand, dollarsToCents(minDollars), dollarsToCents(maxDollars));
}

function biasedLowCents(rand, minDollars, maxDollars) {
  const min = dollarsToCents(minDollars);
  const max = dollarsToCents(maxDollars);
  const skewed = rand() ** 3;
  return min + Math.floor(skewed * (max - min + 1));
}

function biasedHighCents(rand, minDollars, maxDollars) {
  const min = dollarsToCents(minDollars);
  const max = dollarsToCents(maxDollars);
  const skewed = 1 - (1 - rand()) ** 2;
  return min + Math.floor(skewed * (max - min + 1));
}

function pick(rand, list) {
  return list[randomInt(rand, 0, list.length - 1)];
}

function money(cents) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString("en-US");
  const rem = String(abs % 100).padStart(2, "0");
  return `${sign}$${dollars}.${rem}`;
}

function dayStamp(date) {
  return date.toISOString().slice(0, 10);
}

function buildMonths(today) {
  const months = [];
  let year = START.getUTCFullYear();
  let month = START.getUTCMonth();
  while (true) {
    const first = utcNoon(year, month, 1);
    if (first > today) break;
    const dim = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const dates = [];
    for (let day = 1; day <= dim; day += 1) {
      const date = utcNoon(year, month, day);
      if (date < START || date > today) continue;
      dates.push(date);
    }
    if (dates.length === 0) break;
    months.push({
      year,
      month,
      dates,
      partial: dates.length < dim,
    });
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return months;
}

function eachDay(today) {
  const dates = [];
  for (let time = START.getTime(); time <= today.getTime(); time += 86400000) {
    dates.push(new Date(time));
  }
  return dates;
}

function weekdayDates(today, weekday) {
  return eachDay(today).filter((date) => date.getUTCDay() === weekday);
}

function datesBeforeUtcMonth(today) {
  const first = utcNoon(today.getUTCFullYear(), today.getUTCMonth(), 1);
  return eachDay(today).filter((date) => date < first);
}

function lastNDays(today, count) {
  const dates = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    dates.push(new Date(today.getTime() - i * 86400000));
  }
  return dates;
}

function row(fields) {
  return {
    isRecurring: false,
    recurringInterval: null,
    nextRecurringDate: null,
    lastProcessed: null,
    locked: true,
    pad: false,
    flexible: false,
    minCents: null,
    status: "COMPLETED",
    receiptUrl: null,
    ...fields,
  };
}

function occurrenceDates(day, today) {
  const dates = [];
  let year = START.getUTCFullYear();
  let month = START.getUTCMonth();
  while (true) {
    const date = utcNoon(year, month, day);
    if (date > today) break;
    if (date >= START) dates.push(date);
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return dates;
}

function addMonthly(persona, spec) {
  const dates = occurrenceDates(spec.day, persona.today);
  if (dates.length === 0) {
    throw new Error(`${persona.key} has no dates for ${spec.name}`);
  }
  dates.forEach((date, index) => {
    const isTemplate = index === dates.length - 1;
    persona.txs.push(
      row({
        account: spec.account,
        type: spec.type,
        category: spec.category,
        description: isTemplate ? spec.name : `${spec.name} (Recurring)`,
        amountCents: spec.amountCents,
        date,
        isRecurring: isTemplate,
        recurringInterval: isTemplate ? "MONTHLY" : null,
        nextRecurringDate: isTemplate ? addUtcMonths(date, 1) : null,
        lastProcessed: isTemplate ? date : null,
      })
    );
  });
}

function addSpend(persona, spec) {
  if (!spec.dates?.length) {
    throw new Error(`${persona.key} has no dates for ${spec.description}`);
  }
  const description =
    typeof spec.description === "function"
      ? spec.description()
      : spec.description;
  persona.txs.push(
    row({
      account: spec.account,
      type: spec.type || "EXPENSE",
      category: spec.category,
      description,
      amountCents:
        spec.amountCents ??
        (spec.bias === "low"
          ? biasedLowCents(persona.rand, spec.min, spec.max)
          : spec.bias === "high"
            ? biasedHighCents(persona.rand, spec.min, spec.max)
            : betweenCents(persona.rand, spec.min, spec.max)),
      date: pick(persona.rand, spec.dates),
      locked: spec.locked !== false,
      pad: Boolean(spec.pad),
      flexible: Boolean(spec.flexible),
      minCents: spec.min == null ? null : dollarsToCents(spec.min),
    })
  );
}

function eachMonth(months, fullCount, partialCount, fn) {
  for (const month of months) {
    const count = month.partial ? partialCount : fullCount;
    for (let i = 0; i < count; i += 1) fn(month, i);
  }
}

function monthDates(month, { safeOnly = false } = {}) {
  if (!safeOnly) return month.dates;
  return month.dates.filter((date) => date.getUTCDate() >= 2);
}

function budgetWindow(now) {
  const start = new Date(now);
  start.setDate(1);
  const harsh = new Date(now.getFullYear(), now.getMonth(), 1, 23, 59, 59, 999);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, harsh, end };
}

function spentOn(persona, accountKey, from, to, { afterHarsh = null } = {}) {
  return persona.txs
    .filter(
      (entry) =>
        entry.account === accountKey &&
        entry.type === "EXPENSE" &&
        entry.date >= from &&
        entry.date < to &&
        (afterHarsh == null || entry.date > afterHarsh)
    )
    .reduce((sum, entry) => sum + entry.amountCents, 0);
}

function fitOctober(persona, accountKey, targetCents, now) {
  const { start, harsh, end } = budgetWindow(now);
  const unstable = persona.txs.filter(
    (entry) =>
      entry.account === accountKey &&
      entry.type === "EXPENSE" &&
      entry.date >= start &&
      entry.date < end &&
      entry.date <= harsh
  );
  if (unstable.length > 0) {
    throw new Error(
      `${persona.key} has ${unstable.length} ${accountKey} expenses on the 1st, so the budget percentage would change later in the day`
    );
  }

  const sum = spentOn(persona, accountKey, start, end);
  let delta = targetCents - sum;
  if (delta === 0) return;

  if (delta < 0) {
    const adjustable = persona.txs.filter(
      (entry) =>
        entry.account === accountKey &&
        entry.type === "EXPENSE" &&
        entry.date > harsh &&
        entry.date < end &&
        (entry.flexible || entry.pad)
    );
    for (const entry of adjustable) {
      if (delta === 0) break;
      const floor = entry.minCents ?? 100;
      const cut = Math.min(entry.amountCents - floor, -delta);
      if (cut > 0) {
        entry.amountCents -= cut;
        delta += cut;
      }
    }
    if (delta !== 0) {
      throw new Error(
        `${persona.key} October spending is ${money(sum)} and cannot be reduced to ${money(targetCents)}`
      );
    }
    return;
  }

  const dates = monthDates(
    { dates: eachDay(persona.today).filter((date) => date > harsh && date < end) },
    {}
  );
  if (dates.length === 0) {
    throw new Error(`${persona.key} has no safe October dates for budget shaping`);
  }
  persona.txs.push(
    row({
      account: accountKey,
      type: "EXPENSE",
      category: persona.topUp.category,
      description: persona.topUp.description,
      amountCents: delta,
      date: pick(persona.rand, dates),
    })
  );
}

function padTo(persona, target, spec) {
  if (!spec.dates.length) {
    throw new Error(`${persona.key} has no filler dates`);
  }
  let guard = 0;
  while (persona.txs.length > target) {
    const index = persona.txs.findIndex((entry) => entry.pad);
    if (index < 0) {
      throw new Error(
        `${persona.key} has ${persona.txs.length} transactions and no filler to remove (target ${target})`
      );
    }
    persona.txs.splice(index, 1);
    guard += 1;
    if (guard > 20000) throw new Error(`${persona.key} trim guard`);
  }
  while (persona.txs.length < target) {
    addSpend(persona, {
      account: spec.account,
      category: pick(persona.rand, spec.categories),
      description: pick(persona.rand, spec.descriptions),
      min: spec.min,
      max: spec.max,
      dates: spec.dates,
      locked: false,
      pad: true,
    });
    guard += 1;
    if (guard > 20000) throw new Error(`${persona.key} pad guard`);
  }
}

function assignBalances(persona) {
  for (const account of persona.accounts) {
    let income = 0;
    let expense = 0;
    for (const entry of persona.txs) {
      if (entry.account !== account.key) continue;
      if (entry.type === "INCOME") income += entry.amountCents;
      else expense += entry.amountCents;
    }
    account.incomeCents = income;
    account.expenseCents = expense;
    const net = income - expense;
    let opening = account.preferredOpeningCents;
    if (opening + net < account.minFinalCents) {
      opening = account.minFinalCents - net;
      opening = Math.ceil(opening / 100) * 100;
      if (opening + net < account.minFinalCents) opening += 100;
    }
    account.openingCents = opening;
    account.balanceCents = opening + net;
    if (account.balanceCents <= 0) {
      throw new Error(`${persona.key} ${account.name} balance is not positive`);
    }
  }
}

function accountSpec(key, name, type, isDefault, preferredDollars, minFinalDollars) {
  return {
    key,
    name,
    type,
    isDefault,
    preferredOpeningCents: dollarsToCents(preferredDollars),
    minFinalCents: dollarsToCents(minFinalDollars),
  };
}

function makePersona(spec, today) {
  return {
    ...spec,
    today,
    rand: mulberry32(hashSeed(spec.seed)),
    txs: [],
  };
}

function buildMaya(today, months) {
  const persona = makePersona(
    {
      key: "maya",
      seed: "maya-chen-demo-v1",
      firstName: "Maya",
      lastName: "Chen",
      email: `maya@${DEMO_EMAIL_DOMAIN}`,
      budgetCents: dollarsToCents(3600),
      accounts: [
        accountSpec("checking", "Everyday Checking", "CURRENT", true, 3200, 1500),
        accountSpec("savings", "High-Yield Savings", "SAVINGS", false, 18500, 18000),
      ],
    },
    today
  );
  const days = eachDay(today);
  addMonthly(persona, {
    name: "Salary",
    day: 1,
    amountCents: dollarsToCents(6800),
    type: "INCOME",
    category: "salary",
    account: "checking",
  });
  addMonthly(persona, {
    name: "Rent",
    day: 1,
    amountCents: dollarsToCents(2150),
    type: "EXPENSE",
    category: "housing",
    account: "checking",
  });
  for (const name of [
    ["Netflix", 15.49],
    ["Spotify", 11.99],
    ["Gym", 45],
  ]) {
    addMonthly(persona, {
      name: name[0],
      day: 4,
      amountCents: dollarsToCents(name[1]),
      type: "EXPENSE",
      category: name[0] === "Gym" ? "personal" : "entertainment",
      account: "checking",
    });
  }
  eachMonth(months, 1, 1, (month) => {
    addSpend(persona, {
      account: "checking",
      category: "utilities",
      description: "Electric, water & internet",
      min: 125,
      max: 158,
      dates: month.dates,
    });
    addSpend(persona, {
      account: "savings",
      type: "INCOME",
      category: "investments",
      description: "Savings interest",
      min: 18,
      max: 30,
      dates: month.dates,
    });
  });
  eachMonth(months, 9, 6, (month) =>
    addSpend(persona, {
      account: "checking",
      category: "groceries",
      description: () => pick(persona.rand, ["Grocery run", "Supermarket", "Market"]),
      min: 35,
      max: 130,
      dates: month.dates,
    })
  );
  eachMonth(months, 10, 6, (month) =>
    addSpend(persona, {
      account: "checking",
      category: "food",
      description: () => pick(persona.rand, ["Dinner out", "Lunch", "Takeout"]),
      min: 12,
      max: 70,
      dates: month.dates,
    })
  );
  eachMonth(months, 8, 5, (month) =>
    addSpend(persona, {
      account: "checking",
      category: "transportation",
      description: "Rideshare",
      min: 8,
      max: 30,
      dates: month.dates,
    })
  );
  eachMonth(months, 4, 2, (month) =>
    addSpend(persona, {
      account: "checking",
      category: "shopping",
      description: () => pick(persona.rand, ["Online order", "Clothing", "Home goods"]),
      min: 30,
      max: 250,
      dates: month.dates,
    })
  );
  const july = months.find((month) => month.year === 2026 && month.month === 6);
  const tripDay = july?.dates.find((date) => date.getUTCDate() === 18);
  if (!tripDay) throw new Error("Maya's July trip has no date");
  addSpend(persona, {
    account: "checking",
    category: "travel",
    description: "Summer trip",
    amountCents: betweenCents(persona.rand, 1360, 1480),
    dates: [tripDay],
  });
  padTo(persona, TARGETS.maya, {
    account: "checking",
    categories: ["food", "shopping", "personal", "transportation"],
    descriptions: ["Coffee", "Pharmacy", "Household supplies", "Parking"],
    min: 4,
    max: 48,
    dates: days,
  });
  return persona;
}

function buildDaniel(today, months, now) {
  const persona = makePersona(
    {
      key: "daniel",
      seed: "daniel-okafor-demo-v1",
      firstName: "Daniel",
      lastName: "Okafor",
      email: `daniel@${DEMO_EMAIL_DOMAIN}`,
      budgetCents: dollarsToCents(2800),
      topUp: { category: "bills", description: "Contractor" },
      accounts: [
        accountSpec("business", "Business Checking", "CURRENT", true, 4500, 2500),
        accountSpec("personal", "Personal Checking", "CURRENT", false, 1800, 800),
        accountSpec("tax", "Tax Savings", "SAVINGS", false, 3200, 3000),
      ],
    },
    today
  );
  addMonthly(persona, {
    name: "Coworking",
    day: 3,
    amountCents: dollarsToCents(220),
    type: "EXPENSE",
    category: "bills",
    account: "business",
  });
  addMonthly(persona, {
    name: "Design software",
    day: 3,
    amountCents: dollarsToCents(75),
    type: "EXPENSE",
    category: "bills",
    account: "business",
  });
  addMonthly(persona, {
    name: "Tax set-aside",
    day: 3,
    amountCents: dollarsToCents(640),
    type: "EXPENSE",
    category: "other-expense",
    account: "business",
  });
  addMonthly(persona, {
    name: "Tax set-aside",
    day: 3,
    amountCents: dollarsToCents(640),
    type: "INCOME",
    category: "other-income",
    account: "tax",
  });
  const invoiceNames = [
    "Invoice — Northwind",
    "Invoice — Brightline",
    "Invoice — Harbor Studio",
    "Invoice — Fieldwork",
    "Invoice — Lumen Co",
  ];
  for (const month of months) {
    const weak = month.month === 5;
    const count = weak ? 1 : month.partial ? 2 : randomInt(persona.rand, 2, 4);
    for (let i = 0; i < count; i += 1) {
      addSpend(persona, {
        account: "business",
        type: "INCOME",
        category: "freelance",
        description: pick(persona.rand, invoiceNames),
        min: weak ? 800 : 800,
        max: weak ? 1200 : 3200,
        dates: month.dates,
      });
    }
  }
  const may = months.find((month) => month.year === 2026 && month.month === 4);
  const equipmentDay = may?.dates.find((date) => date.getUTCDate() === 12);
  if (!equipmentDay) throw new Error("Daniel's May equipment purchase has no date");
  addSpend(persona, {
    account: "business",
    category: "shopping",
    description: "Camera and lens",
    amountCents: dollarsToCents(1200),
    dates: [equipmentDay],
  });
  eachMonth(months, 6, 4, (month) =>
    addSpend(persona, {
      account: "personal",
      category: "groceries",
      description: "Grocery run",
      min: 40,
      max: 120,
      dates: month.dates,
    })
  );
  eachMonth(months, 8, 5, (month) =>
    addSpend(persona, {
      account: "personal",
      category: "food",
      description: () => pick(persona.rand, ["Dinner out", "Lunch", "Coffee with a client"]),
      min: 14,
      max: 68,
      dates: month.dates,
    })
  );
  eachMonth(months, 3, 2, (month) =>
    addSpend(persona, {
      account: "personal",
      category: "transportation",
      description: "Rideshare",
      min: 9,
      max: 28,
      dates: month.dates,
    })
  );
  fitOctober(persona, "business", DANIEL_OCTOBER_CENTS, now);
  padTo(persona, TARGETS.daniel, {
    account: "personal",
    categories: ["shopping", "food", "personal", "entertainment"],
    descriptions: ["Household supplies", "Lunch", "Haircut", "Movie"],
    min: 8,
    max: 55,
    dates: datesBeforeUtcMonth(today),
  });
  return persona;
}

function buildPriya(today, months, now) {
  const persona = makePersona(
    {
      key: "priya",
      seed: "priya-nair-demo-v1",
      firstName: "Priya",
      lastName: "Nair",
      email: `priya@${DEMO_EMAIL_DOMAIN}`,
      budgetCents: dollarsToCents(1200),
      topUp: { category: "education", description: "Lab fee" },
      accounts: [accountSpec("checking", "Student Checking", "CURRENT", true, 650, 250)],
    },
    today
  );
  const early = datesBeforeUtcMonth(today);
  addMonthly(persona, {
    name: "Stipend",
    day: 1,
    amountCents: dollarsToCents(1850),
    type: "INCOME",
    category: "salary",
    account: "checking",
  });
  addMonthly(persona, {
    name: "Rent share",
    day: 3,
    amountCents: dollarsToCents(780),
    type: "EXPENSE",
    category: "housing",
    account: "checking",
  });
  addMonthly(persona, {
    name: "Phone",
    day: 3,
    amountCents: dollarsToCents(25),
    type: "EXPENSE",
    category: "utilities",
    account: "checking",
  });
  eachMonth(months, 3, 2, (month) =>
    addSpend(persona, {
      account: "checking",
      type: "INCOME",
      category: "freelance",
      description: "Tutoring session",
      min: 60,
      max: 120,
      dates: month.dates,
    })
  );
  eachMonth(months, 8, 4, (month) =>
    addSpend(persona, {
      account: "checking",
      category: "groceries",
      description: "Grocery run",
      min: 15,
      max: 60,
      flexible: month.partial,
      dates: monthDates(month, { safeOnly: month.partial }),
    })
  );
  eachMonth(months, 12, 6, (month) =>
    addSpend(persona, {
      account: "checking",
      category: "food",
      description: "Coffee",
      min: 3,
      max: 6,
      flexible: month.partial,
      dates: monthDates(month, { safeOnly: month.partial }),
    })
  );
  eachMonth(months, 10, 6, (month) =>
    addSpend(persona, {
      account: "checking",
      category: "transportation",
      description: "Transit fare",
      amountCents: dollarsToCents(2.75),
      flexible: month.partial,
      min: 2.75,
      dates: monthDates(month, { safeOnly: month.partial }),
    })
  );
  for (const monthIndex of [7, 8]) {
    const month = months.find((item) => item.year === 2026 && item.month === monthIndex);
    if (!month) continue;
    for (let i = 0; i < 3; i += 1) {
      addSpend(persona, {
        account: "checking",
        category: "education",
        description: "Textbooks",
        min: 40,
        max: 160,
        dates: month.dates,
      });
    }
  }
  fitOctober(persona, "checking", PRIYA_OCTOBER_CENTS, now);
  padTo(persona, TARGETS.priya, {
    account: "checking",
    categories: ["food", "shopping", "personal"],
    descriptions: ["Coffee", "Snacks", "Toiletries"],
    min: 3,
    max: 18,
    dates: early,
  });
  return persona;
}

function buildLucas(today, months) {
  const persona = makePersona(
    {
      key: "lucas",
      seed: "lucas-alvarez-demo-v1",
      firstName: "Lucas",
      lastName: "Alvarez",
      email: `lucas@${DEMO_EMAIL_DOMAIN}`,
      budgetCents: dollarsToCents(5400),
      accounts: [
        accountSpec("joint", "Joint Checking", "CURRENT", true, 4800, 2000),
        accountSpec("emergency", "Emergency Fund", "SAVINGS", false, 15000, 15000),
        accountSpec("kids", "Kids & School", "CURRENT", false, 1200, 400),
      ],
    },
    today
  );
  addMonthly(persona, {
    name: "Primary salary",
    day: 1,
    amountCents: dollarsToCents(4200),
    type: "INCOME",
    category: "salary",
    account: "joint",
  });
  addMonthly(persona, {
    name: "Partner salary",
    day: 15,
    amountCents: dollarsToCents(3100),
    type: "INCOME",
    category: "salary",
    account: "joint",
  });
  addMonthly(persona, {
    name: "Mortgage",
    day: 1,
    amountCents: dollarsToCents(2380),
    type: "EXPENSE",
    category: "housing",
    account: "joint",
  });
  addMonthly(persona, {
    name: "Childcare",
    day: 3,
    amountCents: dollarsToCents(650),
    type: "EXPENSE",
    category: "bills",
    account: "joint",
  });
  addMonthly(persona, {
    name: "Kids account funding",
    day: 5,
    amountCents: dollarsToCents(300),
    type: "EXPENSE",
    category: "other-expense",
    account: "joint",
  });
  addMonthly(persona, {
    name: "Kids account funding",
    day: 5,
    amountCents: dollarsToCents(300),
    type: "INCOME",
    category: "other-income",
    account: "kids",
  });
  eachMonth(months, 1, 1, (month) => {
    addSpend(persona, {
      account: "joint",
      category: "utilities",
      description: "Electric, water & internet",
      min: 180,
      max: 260,
      dates: month.dates,
    });
    addSpend(persona, {
      account: "emergency",
      type: "INCOME",
      category: "investments",
      description: "Savings interest",
      min: 12,
      max: 36,
      dates: month.dates,
    });
    addSpend(persona, {
      account: "kids",
      category: "education",
      description: "School fees",
      min: 80,
      max: 220,
      dates: month.dates.filter((date) => date.getUTCDate() >= 2),
    });
  });
  for (const date of weekdayDates(today, 6)) {
    addSpend(persona, {
      account: "joint",
      category: "groceries",
      description: "Family groceries",
      min: 90,
      max: 220,
      dates: [date],
    });
  }
  for (const date of weekdayDates(today, 2)) {
    addSpend(persona, {
      account: "joint",
      category: "transportation",
      description: "Fuel",
      min: 42,
      max: 78,
      dates: [date],
    });
  }
  eachMonth(months, 6, 4, (month) =>
    addSpend(persona, {
      account: "kids",
      category: "entertainment",
      description: () => pick(persona.rand, ["Soccer", "Piano lesson", "Swim class"]),
      min: 18,
      max: 65,
      dates: month.dates,
    })
  );
  eachMonth(months, 1, 1, (month) =>
    addSpend(persona, {
      account: "joint",
      category: "healthcare",
      description: "Clinic visit",
      min: 40,
      max: 180,
      dates: month.dates,
    })
  );
  eachMonth(months, 4, 3, (month) =>
    addSpend(persona, {
      account: "joint",
      category: "food",
      description: "Family dinner",
      min: 28,
      max: 90,
      dates: month.dates,
    })
  );
  eachMonth(months, 3, 2, (month) =>
    addSpend(persona, {
      account: "joint",
      category: "shopping",
      description: "Household goods",
      min: 25,
      max: 140,
      dates: month.dates,
    })
  );
  padTo(persona, TARGETS.lucas, {
    account: "joint",
    categories: ["food", "shopping", "healthcare", "transportation"],
    descriptions: ["School lunch", "Pharmacy", "Household supplies", "Parking"],
    min: 6,
    max: 42,
    dates: eachDay(today),
  });
  return persona;
}

function buildOmar(today, months) {
  const persona = makePersona(
    {
      key: "omar",
      seed: "omar-haddad-demo-v1",
      firstName: "Omar",
      lastName: "Haddad",
      email: `omar@${DEMO_EMAIL_DOMAIN}`,
      budgetCents: dollarsToCents(18000),
      accounts: [
        accountSpec("operating", "Business Operating", "CURRENT", true, 12000, 6000),
        accountSpec("payroll", "Payroll", "CURRENT", false, 3500, 2000),
      ],
    },
    today
  );
  const saleNames = [
    "Latte",
    "Drip coffee",
    "Espresso",
    "Cappuccino",
    "Tea",
    "Muffin",
    "Sandwich",
    "Bagel",
    "Croissant",
    "Cookie",
    "Iced latte",
    "Pastry",
  ];
  for (const date of eachDay(today)) {
    const sales = randomInt(persona.rand, 8, 11);
    for (let i = 0; i < sales; i += 1) {
      addSpend(persona, {
        account: "operating",
        type: "INCOME",
        category: "business",
        description: `Sale: ${pick(persona.rand, saleNames)}`,
        min: 8,
        max: 45,
        bias: "high",
        dates: [date],
      });
    }
  }
  const supplierNames = [
    "Coffee supplier",
    "Dairy supplier",
    "Bakery supplier",
    "Produce supplier",
  ];
  for (const weekday of [1, 3, 6]) {
    for (const date of weekdayDates(today, weekday)) {
      addSpend(persona, {
        account: "operating",
        category: "shopping",
        description: pick(persona.rand, supplierNames),
        min: 120,
        max: 900,
        bias: "low",
        dates: [date],
      });
    }
  }
  for (const date of weekdayDates(today, 5)) {
    addSpend(persona, {
      account: "operating",
      category: "other-expense",
      description: "Transfer to Payroll",
      amountCents: dollarsToCents(1450),
      dates: [date],
    });
    addSpend(persona, {
      account: "payroll",
      type: "INCOME",
      category: "other-income",
      description: "Transfer from Operating",
      amountCents: dollarsToCents(1450),
      dates: [date],
    });
    addSpend(persona, {
      account: "payroll",
      category: "bills",
      description: "Weekly payroll",
      amountCents: dollarsToCents(1450),
      dates: [date],
    });
  }
  addMonthly(persona, {
    name: "Cafe rent",
    day: 1,
    amountCents: dollarsToCents(1900),
    type: "EXPENSE",
    category: "housing",
    account: "operating",
  });
  eachMonth(months, 1, 1, (month) =>
    addSpend(persona, {
      account: "operating",
      category: "utilities",
      description: "Gas & electric",
      min: 260,
      max: 420,
      dates: month.dates,
    })
  );
  for (const date of weekdayDates(today, 4)) {
    addSpend(persona, {
      account: "operating",
      category: "transportation",
      description: "Fuel",
      min: 38,
      max: 72,
      dates: [date],
    });
  }
  padTo(persona, TARGETS.omar, {
    account: "operating",
    categories: ["shopping", "bills", "other-expense"],
    descriptions: ["Cups and lids", "Ice", "Cleaning supplies", "Napkins", "Takeout boxes"],
    min: 4,
    max: 18,
    dates: eachDay(today),
  });
  return persona;
}

function buildHana(today) {
  const persona = makePersona(
    {
      key: "hana",
      seed: "hana-sato-demo-v1",
      firstName: "Hana",
      lastName: "Sato",
      email: `hana@${DEMO_EMAIL_DOMAIN}`,
      budgetCents: null,
      accounts: [accountSpec("main", "Main Account", "CURRENT", true, 1600, 800)],
    },
    today
  );
  const dates = lastNDays(today, 14);
  const plan = [
    { type: "INCOME", category: "salary", description: "Paycheck", min: 860, max: 980 },
    { type: "EXPENSE", category: "groceries", description: "Groceries", min: 28, max: 64 },
    { type: "EXPENSE", category: "food", description: "Coffee", min: 3, max: 6 },
    { type: "EXPENSE", category: "transportation", description: "Transit fare", amountCents: dollarsToCents(2.75), min: 2.75 },
    { type: "EXPENSE", category: "food", description: "Dinner out", min: 16, max: 42 },
    { type: "EXPENSE", category: "groceries", description: "Groceries", min: 22, max: 55 },
    { type: "EXPENSE", category: "food", description: "Coffee", min: 3, max: 6 },
    { type: "EXPENSE", category: "transportation", description: "Rideshare", min: 8, max: 24 },
    { type: "EXPENSE", category: "healthcare", description: "Pharmacy", min: 11, max: 28 },
    { type: "EXPENSE", category: "shopping", description: "Household supplies", min: 24, max: 70 },
    { type: "EXPENSE", category: "food", description: "Coffee", min: 3, max: 6 },
    { type: "EXPENSE", category: "groceries", description: "Groceries", min: 26, max: 58 },
  ];
  for (const item of plan) {
    addSpend(persona, { ...item, account: "main", dates });
  }
  if (persona.txs.length !== TARGETS.hana) {
    throw new Error(`Hana has ${persona.txs.length} transactions`);
  }
  return persona;
}

function buildPersonas(today, now) {
  const months = buildMonths(today);
  const personas = [
    buildMaya(today, months),
    buildDaniel(today, months, now),
    buildPriya(today, months, now),
    buildLucas(today, months),
    buildOmar(today, months),
    buildHana(today),
  ];
  for (const persona of personas) assignBalances(persona);
  return personas;
}

function verifyPlan(personas, now, categories) {
  const problems = [];
  const fail = (message) => problems.push(message);
  const { start, harsh, end } = budgetWindow(now);

  for (const persona of personas) {
    if (persona.txs.length !== TARGETS[persona.key]) {
      fail(`${persona.key} has ${persona.txs.length} transactions, expected ${TARGETS[persona.key]}`);
    }
    const defaults = persona.accounts.filter((account) => account.isDefault);
    if (defaults.length !== 1) fail(`${persona.key} should have one default account`);
    if (persona.budgetCents == null && persona.key !== "hana") {
      fail(`${persona.key} is missing a budget`);
    }
    if (persona.key === "hana" && persona.budgetCents != null) {
      fail("Hana should not have a budget");
    }
    const keys = new Set(persona.accounts.map((account) => account.key));
    for (const entry of persona.txs) {
      if (!keys.has(entry.account)) {
        fail(`${persona.key} transaction uses an unknown account ${entry.account}`);
      }
      if (entry.date.getTime() > now.getTime() || entry.date > persona.today) {
        fail(`${persona.key} has a future date ${entry.date.toISOString()}`);
      }
      if (entry.date < START) fail(`${persona.key} has a date before 2026-04-01`);
      if (
        entry.date.getUTCHours() !== 12 ||
        entry.date.getUTCMinutes() !== 0 ||
        entry.date.getUTCSeconds() !== 0
      ) {
        fail(`${persona.key} date is not 12:00 UTC`);
      }
      if (!Number.isInteger(entry.amountCents) || entry.amountCents <= 0) {
        fail(`${persona.key} amount is not a positive cent value`);
      }
      if (entry.status !== "COMPLETED" || entry.receiptUrl !== null) {
        fail(`${persona.key} transaction is not completed or has a receipt`);
      }
      const categoryType = categories.get(entry.category);
      if (!categoryType) fail(`${persona.key} category ${entry.category} is not in data/categories.js`);
      else if (categoryType !== entry.type) {
        fail(`${persona.key} ${entry.category} is ${categoryType} but the row is ${entry.type}`);
      }
      if (entry.isRecurring) {
        if (entry.recurringInterval !== "MONTHLY" || !entry.nextRecurringDate || !entry.lastProcessed) {
          fail(`${persona.key} template ${entry.description} is missing monthly schedule fields`);
        } else if (entry.description.endsWith("(Recurring)")) {
          fail(`${persona.key} template description should not include (Recurring)`);
        } else if (entry.nextRecurringDate.getTime() <= now.getTime()) {
          fail(`${persona.key} next recurring date is not after today`);
        } else if (entry.lastProcessed.getTime() !== entry.date.getTime()) {
          fail(`${persona.key} lastProcessed does not match the template date`);
        } else if (addUtcMonths(entry.date, 1).getTime() !== entry.nextRecurringDate.getTime()) {
          fail(`${persona.key} next recurring date is not one month after the template`);
        }
      } else if (entry.recurringInterval || entry.nextRecurringDate || entry.lastProcessed) {
        fail(`${persona.key} non-recurring row has schedule fields`);
      }
    }
    for (const account of persona.accounts) {
      if (account.balanceCents !== account.openingCents + accountNet(persona, account.key)) {
        fail(`${persona.key} ${account.name} balance does not reconcile`);
      }
    }
    if (persona.key === "hana") {
      const earliest = persona.today.getTime() - 13 * 86400000;
      if (persona.txs.some((entry) => entry.isRecurring || entry.date.getTime() < earliest)) {
        fail("Hana should have only the last 14 days and no recurring rows");
      }
    }
    if (persona.key === "daniel" || persona.key === "priya") {
      const accountKey = persona.key === "daniel" ? "business" : "checking";
      const target = persona.key === "daniel" ? DANIEL_OCTOBER_CENTS : PRIYA_OCTOBER_CENTS;
      const spent = spentOn(persona, accountKey, start, end);
      const stable = spentOn(persona, accountKey, start, end, { afterHarsh: harsh });
      if (spent !== target || stable !== target) {
        fail(
          `${persona.key} current-month spending is ${money(spent)} (stable ${money(stable)}), expected ${money(target)}`
        );
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`Seed plan failed verification:\n${problems.join("\n")}`);
  }
}

function accountNet(persona, accountKey) {
  return persona.txs.reduce((sum, entry) => {
    if (entry.account !== accountKey) return sum;
    return sum + (entry.type === "INCOME" ? entry.amountCents : -entry.amountCents);
  }, 0);
}

function printPlan(personas, now, meta) {
  console.log(
    meta.confirm
      ? "seed:demo result"
      : "seed:demo DRY RUN — nothing will be written"
  );
  console.log("");
  console.log(`Database host: ${meta.host}`);
  console.log(`Clerk key: ${meta.keyKind}`);
  console.log(
    meta.backup
      ? `Backup: ${meta.backup.name} (${meta.backup.ageDays.toFixed(1)} days old)`
      : "Backup: none in backups/"
  );
  console.log(`DEMO_USER_PASSWORD: ${meta.passwordSet ? "set" : "missing"}`);
  console.log(`Date window: ${dayStamp(START)} .. ${dayStamp(meta.today)} (12:00 UTC)`);
  console.log("");
  console.log("Current rows");
  for (const [table, count] of Object.entries(meta.counts)) {
    console.log(`  ${table.padEnd(14)} ${count}`);
  }
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
  const total = personas.reduce((sum, persona) => sum + persona.txs.length, 0);
  console.log(`Planned personas (${total} transactions)`);
  for (const persona of personas) printPersona(persona, now);
  console.log("");
  console.log("Notes");
  console.log("  Recurring templates are the latest occurrence. Earlier months are \"<Name> (Recurring)\" rows.");
  console.log("  Weekly payroll is a completed row every Friday, funded by a transfer. Cafe rent is the MONTHLY template.");
  console.log("  Daniel's Business Checking October expenses are 90% of his $2,800 budget.");
  console.log("  Priya's October expenses are 115% of her $1,200 budget.");
  console.log("  Those two totals stay put for the whole local day: nothing that counts is dated on the 1st.");
  console.log("  --confirm replaces every application row. It does not delete Clerk users.");
}

function printPersona(persona, now) {
  console.log("");
  console.log(`${persona.firstName} ${persona.lastName}  ${persona.email}`);
  console.log(
    persona.budgetCents == null ? "  budget: none" : `  budget: ${money(persona.budgetCents)}`
  );
  for (const account of persona.accounts) {
    const count = persona.txs.filter((entry) => entry.account === account.key).length;
    const flag = account.isDefault ? "default" : "       ";
    console.log(
      `  ${account.name.padEnd(22)} ${account.type.padEnd(8)} ${flag}  opening ${money(account.openingCents).padStart(12)}  balance ${money(account.balanceCents).padStart(12)}  txs ${String(count).padStart(4)}`
    );
  }
  const times = persona.txs.map((entry) => entry.date.getTime());
  const income = persona.txs
    .filter((entry) => entry.type === "INCOME")
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const expense = persona.txs
    .filter((entry) => entry.type === "EXPENSE")
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  console.log(
    `  transactions ${persona.txs.length}  ${dayStamp(new Date(Math.min(...times)))} .. ${dayStamp(new Date(Math.max(...times)))}  income ${money(income)}  expense ${money(expense)}`
  );
  const templates = persona.txs.filter((entry) => entry.isRecurring);
  if (templates.length === 0) {
    console.log("  recurring templates: none");
  } else {
    console.log("  recurring templates:");
    for (const template of templates) {
      console.log(
        `    ${template.description} (${template.type}, ${persona.accounts.find((account) => account.key === template.account).name})  ${money(template.amountCents)}  next ${template.nextRecurringDate.toISOString()}`
      );
    }
  }
  if (persona.budgetCents != null) {
    const account = persona.accounts.find((item) => item.isDefault);
    const { start, end } = budgetWindow(now);
    const spent = spentOn(persona, account.key, start, end);
    const pct = ((spent / persona.budgetCents) * 100).toFixed(1);
    console.log(`  current-month default-account expenses: ${money(spent)} (${pct}% of budget)`);
  }
}

function clerkErrorText(error) {
  const parts = [error?.message];
  if (Array.isArray(error?.errors)) {
    for (const item of error.errors) parts.push(item.code, item.message, item.longMessage);
  }
  return parts.filter(Boolean).join(" ");
}

function isDomainRejection(error) {
  const text = clerkErrorText(error).toLowerCase();
  return (
    text.includes("form_email_address_blocked") ||
    text.includes("form_param_format_invalid") ||
    (text.includes("domain") && (text.includes("not allowed") || text.includes("invalid") || text.includes("blocked")))
  );
}

async function upsertClerkUser(clerk, persona, password) {
  const list = await clerk.users.getUserList({
    emailAddress: [persona.email],
    limit: 10,
  });
  const existing = list.data.find((user) =>
    user.emailAddresses.some(
      (email) => email.emailAddress.toLowerCase() === persona.email.toLowerCase()
    )
  );
  const username = `${persona.firstName}-${persona.lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
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

  const email = user.emailAddresses.find(
    (item) => item.emailAddress.toLowerCase() === persona.email.toLowerCase()
  );
  if (email && email.verification?.status !== "verified") {
    await clerk.emailAddresses.updateEmailAddress(email.id, {
      verified: true,
      primary: true,
    });
  }
  user = await clerk.users.getUser(user.id);
  return user;
}

async function ensureClerkUsers(clerk, personas, password) {
  try {
    const users = [];
    for (const persona of personas) {
      users.push(await upsertClerkUser(clerk, persona, password));
    }
    return users;
  } catch (error) {
    if (
      personas[0].email.endsWith(`@${DEMO_EMAIL_DOMAIN}`) &&
      isDomainRejection(error)
    ) {
      console.log(
        `Clerk rejected @${DEMO_EMAIL_DOMAIN} (${clerkErrorText(error).replace(/\s+/g, " ")}). Retrying with @example.com.`
      );
      const swapped = personas.map((persona) => ({
        ...persona,
        email: persona.email.replace(`@${DEMO_EMAIL_DOMAIN}`, "@example.com"),
      }));
      return ensureClerkUsers(clerk, swapped, password);
    }
    throw new Error(clerkErrorText(error));
  }
}

function decimalToCents(value) {
  const text = value.toString();
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace("-", "").split(".");
  const cents = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return negative ? -cents : cents;
}

async function verifyDatabase(prisma, personas, now, categories) {
  const users = await prisma.user.findMany({
    include: { accounts: true, budgets: true },
  });
  const transactions = await prisma.transaction.findMany();
  const problems = [];
  const fail = (message) => problems.push(message);
  if (users.length !== personas.length) {
    fail(`expected ${personas.length} users, found ${users.length}`);
  }
  const accountsById = new Map();
  for (const user of users) {
    for (const account of user.accounts) accountsById.set(account.id, account);
  }
  for (const entry of transactions) {
    const account = accountsById.get(entry.accountId);
    if (!account || account.userId !== entry.userId) {
      fail("a transaction account belongs to a different user");
    }
    if (entry.date.getTime() > now.getTime()) fail("a stored transaction is in the future");
    if (entry.receiptUrl != null || entry.status !== "COMPLETED") {
      fail("a stored transaction is not completed or has a receipt");
    }
    if (!categories.has(entry.category)) fail(`stored category ${entry.category} is invalid`);
  }
  for (const persona of personas) {
    const user = users.find((item) => item.email === persona.email);
    if (!user) {
      fail(`missing database user ${persona.email}`);
      continue;
    }
    if (user.clerkUserId == null || user.name !== `${persona.firstName} ${persona.lastName}`) {
      fail(`${persona.email} was not stored with the checkUser fields`);
    }
    if ((user.budgets.length === 0) !== (persona.budgetCents == null)) {
      fail(`${persona.email} budget presence does not match the plan`);
    }
    if (user.budgets[0] && decimalToCents(user.budgets[0].amount) !== persona.budgetCents) {
      fail(`${persona.email} budget amount does not match`);
    }
    if (user.budgets[0] && user.budgets[0].lastAlertSent != null) {
      fail(`${persona.email} lastAlertSent should be null`);
    }
    for (const account of persona.accounts) {
      const stored = user.accounts.find((item) => item.name === account.name);
      if (!stored) {
        fail(`missing account ${account.name}`);
        continue;
      }
      const rows = transactions.filter((entry) => entry.accountId === stored.id);
      const net = rows.reduce(
        (sum, entry) =>
          sum + (entry.type === "INCOME" ? decimalToCents(entry.amount) : -decimalToCents(entry.amount)),
        0
      );
      if (decimalToCents(stored.balance) !== account.openingCents + net) {
        fail(`${account.name} balance does not reconcile`);
      }
    }
  }
  if (problems.length > 0) {
    throw new Error(`Database verification failed:\n${problems.join("\n")}`);
  }
}

async function writePersonas(prisma, personas, clerkUsers) {
  await prisma.$transaction(
    async (tx) => {
      await tx.transaction.deleteMany();
      await tx.budget.deleteMany();
      await tx.account.deleteMany();
      await tx.user.deleteMany();
    },
    { timeout: 120000, maxWait: 20000 }
  );

  const rows = [];
  for (let index = 0; index < personas.length; index += 1) {
    const persona = personas[index];
    const clerkUser = clerkUsers[index];
    const email = clerkUser.emailAddresses[0].emailAddress;
    const created = await prisma.user.create({
      data: {
        clerkUserId: clerkUser.id,
        name: `${clerkUser.firstName} ${clerkUser.lastName}`,
        imageUrl: clerkUser.imageUrl,
        email,
      },
    });
    persona.email = email;
    persona.firstName = clerkUser.firstName;
    persona.lastName = clerkUser.lastName;
    const accountIds = new Map();
    for (const account of persona.accounts) {
      const stored = await prisma.account.create({
        data: {
          name: account.name,
          type: account.type,
          balance: (account.balanceCents / 100).toFixed(2),
          isDefault: account.isDefault,
          userId: created.id,
        },
      });
      accountIds.set(account.key, stored.id);
    }
    if (persona.budgetCents != null) {
      await prisma.budget.create({
        data: {
          amount: (persona.budgetCents / 100).toFixed(2),
          lastAlertSent: null,
          userId: created.id,
        },
      });
    }
    for (const entry of persona.txs) {
      rows.push({
        type: entry.type,
        amount: (entry.amountCents / 100).toFixed(2),
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
        accountId: accountIds.get(entry.account),
      });
    }
  }

  for (let index = 0; index < rows.length; index += CHUNK) {
    await prisma.transaction.createMany({ data: rows.slice(index, index + CHUNK) });
  }
}

function confirmBlockers(meta) {
  const blockers = [];
  if (!process.env.DIRECT_URL) blockers.push("DIRECT_URL is missing");
  if (!process.env.CLERK_SECRET_KEY) blockers.push("CLERK_SECRET_KEY is missing");
  if (!process.env.DEMO_USER_PASSWORD) blockers.push("DEMO_USER_PASSWORD is missing");
  if (meta.keyKind === "sk_live" && !meta.allowLive) {
    blockers.push("CLERK_SECRET_KEY is sk_live; pass --allow-live to override");
  }
  if (meta.keyKind === "unrecognized") blockers.push("CLERK_SECRET_KEY is not sk_test or sk_live");
  if (!meta.backup) blockers.push("backups/ has no file");
  else if (meta.backup.ageDays >= 7) {
    blockers.push(`newest backup is ${meta.backup.ageDays.toFixed(1)} days old (need less than 7)`);
  }
  return blockers;
}

async function main() {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (!KNOWN_ARGS.has(arg)) throw new Error(`Unknown argument: ${arg}`);
  }
  const confirm = args.includes("--confirm");
  const allowLive = args.includes("--allow-live");
  loadEnv(path.join(ROOT, ".env"));

  const now = new Date();
  const today = latestAllowedNoon(now);
  if (today < START) throw new Error("The date window ends before 2026-04-01");

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
    const personas = buildPersonas(today, now);
    verifyPlan(personas, now, categories);

    const meta = {
      host: databaseHost(directUrl),
      keyKind: clerkKeyKind(process.env.CLERK_SECRET_KEY),
      backup: newestBackup(),
      passwordSet: Boolean(process.env.DEMO_USER_PASSWORD),
      today,
      allowLive,
      confirm,
      counts: { users, accounts, transactions, budgets },
    };
    meta.blockers = confirmBlockers(meta);

    if (!confirm) {
      printPlan(personas, now, meta);
      return;
    }

    if (meta.blockers.length > 0) {
      throw new Error(`Refusing to seed:\n${meta.blockers.map((item) => `- ${item}`).join("\n")}`);
    }

    console.log(`Seeding ${meta.host} (${meta.keyKind}). Clerk users will not be deleted.`);
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const clerkUsers = await ensureClerkUsers(
      clerk,
      personas,
      process.env.DEMO_USER_PASSWORD
    );
    await writePersonas(prisma, personas, clerkUsers);
    await verifyDatabase(prisma, personas, now, categories);
    printPlan(personas, now, { ...meta, blockers: [] });
    console.log("");
    console.log("Credentials");
    console.log("email                         password");
    for (const persona of personas) {
      console.log(`${persona.email.padEnd(29)} ${process.env.DEMO_USER_PASSWORD}`);
    }
    console.log("");
    console.log("seed:demo wrote the six demo personas");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(redact(error instanceof Error ? error.stack || error.message : error));
  process.exitCode = 1;
});
