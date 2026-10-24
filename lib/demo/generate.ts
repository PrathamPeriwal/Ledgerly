import { AMOUNT_SCALE, personaByKey, type AccountSpec, type PersonaKey, type PersonaSpec } from "./personas.ts";

export const DEMO_START = utcNoon(2026, 3, 1);

const DANIEL_MONTH_CENTS = scaleCents(252000);
const PRIYA_MONTH_CENTS = scaleCents(138000);

export type DemoAccount = {
  key: string;
  name: string;
  type: "CURRENT" | "SAVINGS";
  isDefault: boolean;
  balance: number;
};

export type DemoTransaction = {
  accountKey: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  date: Date;
  category: string;
  receiptUrl: null;
  isRecurring: boolean;
  recurringInterval: "MONTHLY" | null;
  nextRecurringDate: Date | null;
  lastProcessed: Date | null;
  status: "COMPLETED";
};

export type DemoData = {
  accounts: DemoAccount[];
  transactions: DemoTransaction[];
  budget: { amount: number } | null;
};

type Month = { year: number; month: number; dates: Date[]; partial: boolean };

type InternalAccount = {
  key: string;
  name: string;
  type: "CURRENT" | "SAVINGS";
  isDefault: boolean;
  preferredOpeningCents: number;
  minFinalCents: number;
  incomeCents: number;
  expenseCents: number;
  openingCents: number;
  balanceCents: number;
};

type InternalTx = {
  account: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  description: string;
  amountCents: number;
  date: Date;
  isRecurring: boolean;
  recurringInterval: "MONTHLY" | null;
  nextRecurringDate: Date | null;
  lastProcessed: Date | null;
  locked: boolean;
  pad: boolean;
  flexible: boolean;
  minCents: number | null;
  status: "COMPLETED";
  receiptUrl: null;
};

type InternalPersona = {
  key: PersonaKey;
  seed: string;
  firstName: string;
  lastName: string;
  email: string;
  budgetCents: number | null;
  topUp?: { category: string; description: string };
  accounts: InternalAccount[];
  today: Date;
  rand: () => number;
  txs: InternalTx[];
};

type MonthlySpec = {
  name: string;
  day: number;
  amountCents: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  account: string;
};

type SpendSpec = {
  account: string;
  type?: "INCOME" | "EXPENSE";
  category: string;
  description: string | (() => string);
  amountCents?: number;
  min?: number;
  max?: number;
  bias?: "low" | "high";
  dates: Date[];
  locked?: boolean;
  pad?: boolean;
  flexible?: boolean;
};

function scaleCents(cents: number) {
  const rupees = (cents / 100) * AMOUNT_SCALE;
  return Math.round((Math.round(rupees * 2) / 2) * 100);
}

function utcNoon(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0, 0));
}

export function anchorToday(now = new Date()) {
  let noon = utcNoon(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (noon.getTime() > now.getTime()) noon = new Date(noon.getTime() - 86400000);
  return noon;
}

export function budgetWindow(today: Date) {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  return {
    start: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
    harsh: new Date(Date.UTC(year, month, 1, 23, 59, 59, 999)),
    end: new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0)),
  };
}

function centsToAmount(cents: number) {
  return Math.round(cents) / 100;
}

export function shapedSpendTarget(key: PersonaKey) {
  if (key === "daniel") return centsToAmount(DANIEL_MONTH_CENTS);
  if (key === "priya") return centsToAmount(PRIYA_MONTH_CENTS);
  return null;
}

export function monthExpense(data: DemoData, accountKey: string, today: Date, stableOnly = false) {
  const { start, harsh, end } = budgetWindow(today);
  const cents = data.transactions
    .filter(
      (entry) =>
        entry.accountKey === accountKey &&
        entry.type === "EXPENSE" &&
        entry.date >= start &&
        entry.date < end &&
        (!stableOnly || entry.date > harsh),
    )
    .reduce((sum, entry) => sum + Math.round(entry.amount * 100), 0);
  return cents / 100;
}

function addUtcMonths(date: Date, count: number) {
  return utcNoon(date.getUTCFullYear(), date.getUTCMonth() + count, date.getUTCDate());
}

function hashSeed(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return function rand() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rand: () => number, min: number, max: number) {
  if (max < min) throw new Error(`bad range ${min}..${max}`);
  return min + Math.floor(rand() * (max - min + 1));
}

function dollarsToCents(value: number) {
  return scaleCents(Math.round(value * 100));
}

function snapHalfRupee(cents: number) {
  return Math.max(50, Math.round(cents / 50) * 50);
}

function betweenCents(rand: () => number, minDollars: number, maxDollars: number) {
  return snapHalfRupee(randomInt(rand, dollarsToCents(minDollars), dollarsToCents(maxDollars)));
}

function biasedLowCents(rand: () => number, minDollars: number, maxDollars: number) {
  const min = dollarsToCents(minDollars);
  const max = dollarsToCents(maxDollars);
  const skewed = rand() ** 3;
  return snapHalfRupee(min + Math.floor(skewed * (max - min + 1)));
}

function biasedHighCents(rand: () => number, minDollars: number, maxDollars: number) {
  const min = dollarsToCents(minDollars);
  const max = dollarsToCents(maxDollars);
  const skewed = 1 - (1 - rand()) ** 2;
  return snapHalfRupee(min + Math.floor(skewed * (max - min + 1)));
}

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[randomInt(rand, 0, list.length - 1)] as T;
}

function buildMonths(today: Date) {
  const months: Month[] = [];
  let year = DEMO_START.getUTCFullYear();
  let month = DEMO_START.getUTCMonth();
  while (true) {
    const first = utcNoon(year, month, 1);
    if (first > today) break;
    const dim = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const dates: Date[] = [];
    for (let day = 1; day <= dim; day += 1) {
      const date = utcNoon(year, month, day);
      if (date < DEMO_START || date > today) continue;
      dates.push(date);
    }
    if (dates.length === 0) break;
    months.push({ year, month, dates, partial: dates.length < dim });
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return months;
}

function eachDay(today: Date) {
  const dates: Date[] = [];
  for (let time = DEMO_START.getTime(); time <= today.getTime(); time += 86400000) {
    dates.push(new Date(time));
  }
  return dates;
}

function weekdayDates(today: Date, weekday: number) {
  return eachDay(today).filter((date) => date.getUTCDay() === weekday);
}

function datesBeforeUtcMonth(today: Date) {
  const first = utcNoon(today.getUTCFullYear(), today.getUTCMonth(), 1);
  return eachDay(today).filter((date) => date < first);
}

function lastNDays(today: Date, count: number) {
  const dates: Date[] = [];
  for (let i = count - 1; i >= 0; i -= 1) dates.push(new Date(today.getTime() - i * 86400000));
  return dates;
}

function row(fields: Omit<InternalTx, "isRecurring" | "recurringInterval" | "nextRecurringDate" | "lastProcessed" | "locked" | "pad" | "flexible" | "minCents" | "status" | "receiptUrl"> & Partial<InternalTx>): InternalTx {
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

function occurrenceDates(day: number, today: Date) {
  const dates: Date[] = [];
  let year = DEMO_START.getUTCFullYear();
  let month = DEMO_START.getUTCMonth();
  while (true) {
    const date = utcNoon(year, month, day);
    if (date > today) break;
    if (date >= DEMO_START) dates.push(date);
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return dates;
}

function addMonthly(persona: InternalPersona, spec: MonthlySpec) {
  const dates = occurrenceDates(spec.day, persona.today);
  if (dates.length === 0) throw new Error(`${persona.key} has no dates for ${spec.name}`);
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
      }),
    );
  });
}

function addSpend(persona: InternalPersona, spec: SpendSpec) {
  if (!spec.dates?.length) throw new Error(`${persona.key} has no dates for ${spec.description}`);
  const description = typeof spec.description === "function" ? spec.description() : spec.description;
  persona.txs.push(
    row({
      account: spec.account,
      type: spec.type || "EXPENSE",
      category: spec.category,
      description,
      amountCents:
        spec.amountCents ??
        (spec.bias === "low"
          ? biasedLowCents(persona.rand, spec.min ?? 0, spec.max ?? 0)
          : spec.bias === "high"
            ? biasedHighCents(persona.rand, spec.min ?? 0, spec.max ?? 0)
            : betweenCents(persona.rand, spec.min ?? 0, spec.max ?? 0)),
      date: pick(persona.rand, spec.dates),
      locked: spec.locked !== false,
      pad: Boolean(spec.pad),
      flexible: Boolean(spec.flexible),
      minCents: spec.min == null ? null : dollarsToCents(spec.min),
    }),
  );
}

function eachMonth(months: Month[], fullCount: number, partialCount: number, fn: (month: Month, index: number) => void) {
  for (const month of months) {
    const count = month.partial ? partialCount : fullCount;
    for (let i = 0; i < count; i += 1) fn(month, i);
  }
}

function monthDates(month: { dates: Date[] }, { safeOnly = false } = {}) {
  if (!safeOnly) return month.dates;
  return month.dates.filter((date) => date.getUTCDate() >= 2);
}

function spentOn(persona: InternalPersona, accountKey: string, from: Date, to: Date, { afterHarsh = null as Date | null } = {}) {
  return persona.txs
    .filter(
      (entry) =>
        entry.account === accountKey &&
        entry.type === "EXPENSE" &&
        entry.date >= from &&
        entry.date < to &&
        (afterHarsh == null || entry.date > afterHarsh),
    )
    .reduce((sum, entry) => sum + entry.amountCents, 0);
}

function fitOctober(persona: InternalPersona, accountKey: string, targetCents: number, today: Date) {
  const { start, harsh, end } = budgetWindow(today);
  const unstable = persona.txs.filter(
    (entry) =>
      entry.account === accountKey &&
      entry.type === "EXPENSE" &&
      entry.date >= start &&
      entry.date < end &&
      entry.date <= harsh,
  );
  if (unstable.length > 0) {
    throw new Error(
      `${persona.key} has ${unstable.length} ${accountKey} expenses on the 1st, so the budget percentage would change later in the day`,
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
        (entry.flexible || entry.pad),
    );
    for (const entry of adjustable) {
      if (delta === 0) break;
      const floor = entry.minCents ?? scaleCents(100);
      const cut = Math.min(entry.amountCents - floor, -delta);
      if (cut > 0) {
        entry.amountCents -= cut;
        delta += cut;
      }
    }
    if (delta !== 0) throw new Error(`${persona.key} current-month spending cannot be reduced to the target`);
    return;
  }
  const dates = monthDates({ dates: eachDay(persona.today).filter((date) => date > harsh && date < end) }, {});
  if (dates.length === 0) throw new Error(`${persona.key} has no safe dates for budget shaping`);
  if (!persona.topUp) throw new Error(`${persona.key} has no budget top up`);
  persona.txs.push(
    row({
      account: accountKey,
      type: "EXPENSE",
      category: persona.topUp.category,
      description: persona.topUp.description,
      amountCents: delta,
      date: pick(persona.rand, dates),
    }),
  );
}

function padTo(
  persona: InternalPersona,
  target: number,
  spec: { account: string; categories: string[]; descriptions: string[]; min: number; max: number; dates: Date[] },
) {
  if (!spec.dates.length) throw new Error(`${persona.key} has no filler dates`);
  let guard = 0;
  while (persona.txs.length > target) {
    const index = persona.txs.findIndex((entry) => entry.pad);
    if (index < 0) throw new Error(`${persona.key} has ${persona.txs.length} transactions and no filler to remove (target ${target})`);
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

function assignBalances(persona: InternalPersona) {
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
    if (account.balanceCents <= 0) throw new Error(`${persona.key} ${account.name} balance is not positive`);
  }
}

function accountFromSpec(spec: AccountSpec): InternalAccount {
  return {
    key: spec.key,
    name: spec.name,
    type: spec.type,
    isDefault: spec.isDefault,
    preferredOpeningCents: dollarsToCents(spec.preferredDollars),
    minFinalCents: dollarsToCents(spec.minFinalDollars),
    incomeCents: 0,
    expenseCents: 0,
    openingCents: 0,
    balanceCents: 0,
  };
}

function makePersona(spec: PersonaSpec, today: Date): InternalPersona {
  return {
    key: spec.key,
    seed: spec.seed,
    firstName: spec.firstName,
    lastName: spec.lastName,
    email: spec.email,
    budgetCents: spec.budgetDollars == null ? null : dollarsToCents(spec.budgetDollars),
    topUp: spec.topUp,
    accounts: spec.accounts.map(accountFromSpec),
    today,
    rand: mulberry32(hashSeed(spec.seed)),
    txs: [],
  };
}

function buildMaya(today: Date, months: Month[]) {
  const persona = makePersona(personaByKey("maya"), today);
  const days = eachDay(today);
  addMonthly(persona, { name: "Salary", day: 1, amountCents: dollarsToCents(6800), type: "INCOME", category: "salary", account: "checking" });
  addMonthly(persona, { name: "Rent", day: 1, amountCents: dollarsToCents(2150), type: "EXPENSE", category: "housing", account: "checking" });
  for (const [name, dollars] of [
    ["Netflix", 15.49],
    ["Spotify", 11.99],
    ["Gym", 45],
  ] as const) {
    addMonthly(persona, {
      name,
      day: 4,
      amountCents: dollarsToCents(dollars),
      type: "EXPENSE",
      category: name === "Gym" ? "personal" : "entertainment",
      account: "checking",
    });
  }
  eachMonth(months, 1, 1, (month) => {
    addSpend(persona, { account: "checking", category: "utilities", description: "Electric, water & internet", min: 125, max: 158, dates: month.dates });
    addSpend(persona, { account: "savings", type: "INCOME", category: "investments", description: "Savings interest", min: 18, max: 30, dates: month.dates });
  });
  eachMonth(months, 9, 6, (month) =>
    addSpend(persona, {
      account: "checking",
      category: "groceries",
      description: () => pick(persona.rand, ["Grocery run", "Supermarket", "Market"]),
      min: 35,
      max: 130,
      dates: month.dates,
    }),
  );
  eachMonth(months, 10, 6, (month) =>
    addSpend(persona, {
      account: "checking",
      category: "food",
      description: () => pick(persona.rand, ["Dinner out", "Lunch", "Takeout"]),
      min: 12,
      max: 70,
      dates: month.dates,
    }),
  );
  eachMonth(months, 8, 5, (month) =>
    addSpend(persona, { account: "checking", category: "transportation", description: "Rideshare", min: 8, max: 30, dates: month.dates }),
  );
  eachMonth(months, 4, 2, (month) =>
    addSpend(persona, {
      account: "checking",
      category: "shopping",
      description: () => pick(persona.rand, ["Online order", "Clothing", "Home goods"]),
      min: 30,
      max: 250,
      dates: month.dates,
    }),
  );
  const july = months.find((month) => month.year === 2026 && month.month === 6);
  const tripDay = july?.dates.find((date) => date.getUTCDate() === 18);
  if (!tripDay) throw new Error("Maya's July trip has no date");
  addSpend(persona, { account: "checking", category: "travel", description: "Summer trip", amountCents: betweenCents(persona.rand, 1360, 1480), dates: [tripDay] });
  padTo(persona, personaByKey("maya").target, {
    account: "checking",
    categories: ["food", "shopping", "personal", "transportation"],
    descriptions: ["Coffee", "Pharmacy", "Household supplies", "Parking"],
    min: 4,
    max: 48,
    dates: days,
  });
  return persona;
}

function buildDaniel(today: Date, months: Month[]) {
  const persona = makePersona(personaByKey("daniel"), today);
  addMonthly(persona, { name: "Coworking", day: 3, amountCents: dollarsToCents(220), type: "EXPENSE", category: "bills", account: "business" });
  addMonthly(persona, { name: "Design software", day: 3, amountCents: dollarsToCents(75), type: "EXPENSE", category: "bills", account: "business" });
  addMonthly(persona, { name: "Tax set-aside", day: 3, amountCents: dollarsToCents(640), type: "EXPENSE", category: "other-expense", account: "business" });
  addMonthly(persona, { name: "Tax set-aside", day: 3, amountCents: dollarsToCents(640), type: "INCOME", category: "other-income", account: "tax" });
  const invoiceNames = ["Invoice — Northwind", "Invoice — Brightline", "Invoice — Harbor Studio", "Invoice — Fieldwork", "Invoice — Lumen Co"];
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
  addSpend(persona, { account: "business", category: "shopping", description: "Camera and lens", amountCents: dollarsToCents(1200), dates: [equipmentDay] });
  eachMonth(months, 6, 4, (month) =>
    addSpend(persona, { account: "personal", category: "groceries", description: "Grocery run", min: 40, max: 120, dates: month.dates }),
  );
  eachMonth(months, 8, 5, (month) =>
    addSpend(persona, {
      account: "personal",
      category: "food",
      description: () => pick(persona.rand, ["Dinner out", "Lunch", "Coffee with a client"]),
      min: 14,
      max: 68,
      dates: month.dates,
    }),
  );
  eachMonth(months, 3, 2, (month) =>
    addSpend(persona, { account: "personal", category: "transportation", description: "Rideshare", min: 9, max: 28, dates: month.dates }),
  );
  fitOctober(persona, "business", DANIEL_MONTH_CENTS, today);
  padTo(persona, personaByKey("daniel").target, {
    account: "personal",
    categories: ["shopping", "food", "personal", "entertainment"],
    descriptions: ["Household supplies", "Lunch", "Haircut", "Movie"],
    min: 8,
    max: 55,
    dates: datesBeforeUtcMonth(today),
  });
  return persona;
}

function buildPriya(today: Date, months: Month[]) {
  const persona = makePersona(personaByKey("priya"), today);
  const early = datesBeforeUtcMonth(today);
  addMonthly(persona, { name: "Stipend", day: 1, amountCents: dollarsToCents(1850), type: "INCOME", category: "salary", account: "checking" });
  addMonthly(persona, { name: "Rent share", day: 3, amountCents: dollarsToCents(780), type: "EXPENSE", category: "housing", account: "checking" });
  addMonthly(persona, { name: "Phone", day: 3, amountCents: dollarsToCents(25), type: "EXPENSE", category: "utilities", account: "checking" });
  eachMonth(months, 3, 2, (month) =>
    addSpend(persona, { account: "checking", type: "INCOME", category: "freelance", description: "Tutoring session", min: 60, max: 120, dates: month.dates }),
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
    }),
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
    }),
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
    }),
  );
  for (const monthIndex of [7, 8]) {
    const month = months.find((item) => item.year === 2026 && item.month === monthIndex);
    if (!month) continue;
    for (let i = 0; i < 3; i += 1) {
      addSpend(persona, { account: "checking", category: "education", description: "Textbooks", min: 40, max: 160, dates: month.dates });
    }
  }
  fitOctober(persona, "checking", PRIYA_MONTH_CENTS, today);
  padTo(persona, personaByKey("priya").target, {
    account: "checking",
    categories: ["food", "shopping", "personal"],
    descriptions: ["Coffee", "Snacks", "Toiletries"],
    min: 3,
    max: 18,
    dates: early,
  });
  return persona;
}

function buildLucas(today: Date, months: Month[]) {
  const persona = makePersona(personaByKey("lucas"), today);
  addMonthly(persona, { name: "Primary salary", day: 1, amountCents: dollarsToCents(4200), type: "INCOME", category: "salary", account: "joint" });
  addMonthly(persona, { name: "Partner salary", day: 15, amountCents: dollarsToCents(3100), type: "INCOME", category: "salary", account: "joint" });
  addMonthly(persona, { name: "Mortgage", day: 1, amountCents: dollarsToCents(2380), type: "EXPENSE", category: "housing", account: "joint" });
  addMonthly(persona, { name: "Childcare", day: 3, amountCents: dollarsToCents(650), type: "EXPENSE", category: "bills", account: "joint" });
  addMonthly(persona, { name: "Kids account funding", day: 5, amountCents: dollarsToCents(300), type: "EXPENSE", category: "other-expense", account: "joint" });
  addMonthly(persona, { name: "Kids account funding", day: 5, amountCents: dollarsToCents(300), type: "INCOME", category: "other-income", account: "kids" });
  eachMonth(months, 1, 1, (month) => {
    addSpend(persona, { account: "joint", category: "utilities", description: "Electric, water & internet", min: 180, max: 260, dates: month.dates });
    addSpend(persona, { account: "emergency", type: "INCOME", category: "investments", description: "Savings interest", min: 12, max: 36, dates: month.dates });
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
    addSpend(persona, { account: "joint", category: "groceries", description: "Family groceries", min: 90, max: 220, dates: [date] });
  }
  for (const date of weekdayDates(today, 2)) {
    addSpend(persona, { account: "joint", category: "transportation", description: "Fuel", min: 42, max: 78, dates: [date] });
  }
  eachMonth(months, 6, 4, (month) =>
    addSpend(persona, {
      account: "kids",
      category: "entertainment",
      description: () => pick(persona.rand, ["Soccer", "Piano lesson", "Swim class"]),
      min: 18,
      max: 65,
      dates: month.dates,
    }),
  );
  eachMonth(months, 1, 1, (month) =>
    addSpend(persona, { account: "joint", category: "healthcare", description: "Clinic visit", min: 40, max: 180, dates: month.dates }),
  );
  eachMonth(months, 4, 3, (month) =>
    addSpend(persona, { account: "joint", category: "food", description: "Family dinner", min: 28, max: 90, dates: month.dates }),
  );
  eachMonth(months, 3, 2, (month) =>
    addSpend(persona, { account: "joint", category: "shopping", description: "Household goods", min: 25, max: 140, dates: month.dates }),
  );
  padTo(persona, personaByKey("lucas").target, {
    account: "joint",
    categories: ["food", "shopping", "healthcare", "transportation"],
    descriptions: ["School lunch", "Pharmacy", "Household supplies", "Parking"],
    min: 6,
    max: 42,
    dates: eachDay(today),
  });
  return persona;
}

function buildOmar(today: Date, months: Month[]) {
  const persona = makePersona(personaByKey("omar"), today);
  const saleNames = ["Latte", "Drip coffee", "Espresso", "Cappuccino", "Tea", "Muffin", "Sandwich", "Bagel", "Croissant", "Cookie", "Iced latte", "Pastry"];
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
  const supplierNames = ["Coffee supplier", "Dairy supplier", "Bakery supplier", "Produce supplier"];
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
    addSpend(persona, { account: "operating", category: "other-expense", description: "Transfer to Payroll", amountCents: dollarsToCents(1450), dates: [date] });
    addSpend(persona, { account: "payroll", type: "INCOME", category: "other-income", description: "Transfer from Operating", amountCents: dollarsToCents(1450), dates: [date] });
    addSpend(persona, { account: "payroll", category: "bills", description: "Weekly payroll", amountCents: dollarsToCents(1450), dates: [date] });
  }
  addMonthly(persona, { name: "Cafe rent", day: 1, amountCents: dollarsToCents(1900), type: "EXPENSE", category: "housing", account: "operating" });
  eachMonth(months, 1, 1, (month) =>
    addSpend(persona, { account: "operating", category: "utilities", description: "Gas & electric", min: 260, max: 420, dates: month.dates }),
  );
  for (const date of weekdayDates(today, 4)) {
    addSpend(persona, { account: "operating", category: "transportation", description: "Fuel", min: 38, max: 72, dates: [date] });
  }
  padTo(persona, personaByKey("omar").target, {
    account: "operating",
    categories: ["shopping", "bills", "other-expense"],
    descriptions: ["Cups and lids", "Ice", "Cleaning supplies", "Napkins", "Takeout boxes"],
    min: 4,
    max: 18,
    dates: eachDay(today),
  });
  return persona;
}

function buildHana(today: Date) {
  const persona = makePersona(personaByKey("hana"), today);
  const dates = lastNDays(today, 14);
  const plan: SpendSpec[] = [
    { account: "main", type: "INCOME", category: "salary", description: "Paycheck", min: 860, max: 980, dates },
    { account: "main", type: "EXPENSE", category: "groceries", description: "Groceries", min: 28, max: 64, dates },
    { account: "main", type: "EXPENSE", category: "food", description: "Coffee", min: 3, max: 6, dates },
    { account: "main", type: "EXPENSE", category: "transportation", description: "Transit fare", amountCents: dollarsToCents(2.75), min: 2.75, dates },
    { account: "main", type: "EXPENSE", category: "food", description: "Dinner out", min: 16, max: 42, dates },
    { account: "main", type: "EXPENSE", category: "groceries", description: "Groceries", min: 22, max: 55, dates },
    { account: "main", type: "EXPENSE", category: "food", description: "Coffee", min: 3, max: 6, dates },
    { account: "main", type: "EXPENSE", category: "transportation", description: "Rideshare", min: 8, max: 24, dates },
    { account: "main", type: "EXPENSE", category: "healthcare", description: "Pharmacy", min: 11, max: 28, dates },
    { account: "main", type: "EXPENSE", category: "shopping", description: "Household supplies", min: 24, max: 70, dates },
    { account: "main", type: "EXPENSE", category: "food", description: "Coffee", min: 3, max: 6, dates },
    { account: "main", type: "EXPENSE", category: "groceries", description: "Groceries", min: 26, max: 58, dates },
  ];
  for (const item of plan) addSpend(persona, item);
  if (persona.txs.length !== personaByKey("hana").target) throw new Error(`Hana has ${persona.txs.length} transactions`);
  return persona;
}

function buildOne(key: PersonaKey, today: Date) {
  const months = buildMonths(today);
  if (key === "maya") return buildMaya(today, months);
  if (key === "daniel") return buildDaniel(today, months);
  if (key === "priya") return buildPriya(today, months);
  if (key === "lucas") return buildLucas(today, months);
  if (key === "omar") return buildOmar(today, months);
  return buildHana(today);
}

export function generatePersonaData(persona: PersonaKey, today: Date): DemoData {
  const built = buildOne(persona, today);
  assignBalances(built);
  return {
    accounts: built.accounts.map((account) => ({
      key: account.key,
      name: account.name,
      type: account.type,
      isDefault: account.isDefault,
      balance: centsToAmount(account.balanceCents),
    })),
    transactions: built.txs.map((entry) => ({
      accountKey: entry.account,
      type: entry.type,
      amount: centsToAmount(entry.amountCents),
      description: entry.description,
      date: entry.date,
      category: entry.category,
      receiptUrl: null,
      isRecurring: entry.isRecurring,
      recurringInterval: entry.recurringInterval,
      nextRecurringDate: entry.nextRecurringDate,
      lastProcessed: entry.lastProcessed,
      status: "COMPLETED",
    })),
    budget: built.budgetCents == null ? null : { amount: centsToAmount(built.budgetCents) },
  };
}
