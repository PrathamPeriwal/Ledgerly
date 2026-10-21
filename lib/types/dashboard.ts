export type DashboardAccount = {
  id: string;
  name: string;
  type: "CURRENT" | "SAVINGS";
  balance: number;
  isDefault: boolean;
  txCount: number;
};

export type DashboardCategory = {
  category: string;
  amount: number;
};

export type DashboardFlowPoint = {
  month: string;
  income: number;
  expense: number;
};

export type DashboardTx = {
  id: string;
  description: string;
  category: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: string;
  accountName: string;
};

export type DashboardBudget = {
  amount: number;
  spent: number;
  pacePct: number;
  safePerDay: number;
  daysLeft: number;
};

export type DashboardViewModel = {
  accounts: DashboardAccount[];
  totalBalance: number;
  month: {
    income: number;
    spent: number;
    byCategory: DashboardCategory[];
  };
  flow: DashboardFlowPoint[];
  recent: { all: DashboardTx[] } & Record<string, DashboardTx[]>;
  budget: DashboardBudget | null;
};
