export type AccountRange = "7d" | "1m" | "3m" | "6m" | "all";
export type AccountTxType = "all" | "income" | "expense";
export type AccountRecurring = "all" | "recurring" | "one-time";
export type AccountSort = "date" | "amount";
export type AccountDir = "asc" | "desc";

export type AccountParams = {
  range: AccountRange;
  q: string;
  type: AccountTxType;
  recurring: AccountRecurring;
  sort: AccountSort;
  dir: AccountDir;
  page: number;
};

export type AccountOption = {
  id: string;
  name: string;
};

export type AccountHeader = {
  id: string;
  name: string;
  type: "CURRENT" | "SAVINGS";
  balance: number;
  isDefault: boolean;
};

export type AccountFlowPoint = {
  label: string;
  income: number;
  expense: number;
};

export type AccountSummary = {
  income: number;
  expense: number;
  net: number;
  count: number;
  series: AccountFlowPoint[];
};

export type AccountTxRow = {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  isRecurring: boolean;
  recurringInterval: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | null;
  nextRecurringDate: string | null;
};

export type AccountTxPage = {
  rows: AccountTxRow[];
  total: number;
  page: number;
  pageCount: number;
};
