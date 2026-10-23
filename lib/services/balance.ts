import { Prisma } from "@prisma/client";

export type Money = Prisma.Decimal | string | number;

export type EffectRow = {
  type: "INCOME" | "EXPENSE";
  amount: Money;
  accountId: string;
  status?: string;
};

const ZERO = new Prisma.Decimal(0);

export function toDecimal(value: Money): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(String(value));
}

// +amount for INCOME, -amount for EXPENSE, nothing unless the row is COMPLETED.
export function balanceEffect(row: Pick<EffectRow, "type" | "amount" | "status">): Prisma.Decimal {
  if (row.status !== undefined && row.status !== "COMPLETED") return ZERO;
  const amount = toDecimal(row.amount);
  return row.type === "INCOME" ? amount : amount.negated();
}

export type Deltas = Map<string, Prisma.Decimal>;

function add(deltas: Deltas, accountId: string, value: Prisma.Decimal) {
  deltas.set(accountId, (deltas.get(accountId) ?? ZERO).plus(value));
}

// Net balance change per account when these rows are added (sign 1) or removed (sign -1).
export function accountDeltas(rows: EffectRow[], sign: 1 | -1 = 1): Deltas {
  const deltas: Deltas = new Map();
  for (const row of rows) {
    const effect = balanceEffect(row);
    add(deltas, row.accountId, sign === 1 ? effect : effect.negated());
  }
  return deltas;
}

// Reverse the old row on its old account, apply the new row on its new account.
export function updateDeltas(oldRow: EffectRow, newRow: EffectRow): Deltas {
  const deltas = accountDeltas([oldRow], -1);
  for (const [accountId, value] of accountDeltas([newRow])) add(deltas, accountId, value);
  return deltas;
}

export function nonZeroDeltas(deltas: Deltas): [string, Prisma.Decimal][] {
  return [...deltas].filter(([, value]) => !value.isZero());
}
