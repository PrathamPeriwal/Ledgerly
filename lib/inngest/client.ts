import { EventSchemas, Inngest } from "inngest";

export type FanoutEvents = {
  "transaction.recurring.process": {
    data: { transactionId: string; userId: string };
  };
  "budget.alert.send": {
    data: {
      userId: string;
      percentageUsed: number;
      budgetAmount: number;
      totalExpenses: number;
    };
  };
  "report.monthly.send": {
    data: { userId: string };
  };
};

export const inngest = new Inngest({
  id: "finance-platform",
  name: "Finance Platform",
  schemas: new EventSchemas().fromRecord<FanoutEvents>(),
});
