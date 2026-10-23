import { inngest } from "@/lib/inngest/client";
import { deliverBudgetAlert, findBudgetAlerts } from "@/lib/services/budget-alerts";
import { deliverMonthlyReport, findMonthlyReportUsers } from "@/lib/services/monthly-report";
import { findDueTemplates, processRecurringTemplate } from "@/lib/services/recurring";

const FANOUT_CHUNK = 100;
const RETRIES = 3 as const;

function failureMessage(error: unknown): string {
  return error instanceof Error ? error.name : "failed";
}

export const processRecurringTransaction = inngest.createFunction(
  {
    id: "process-recurring-transaction",
    name: "Process Recurring Transaction",
    retries: RETRIES,
    concurrency: 5,
  },
  { event: "transaction.recurring.process" },
  async ({ event, step }) => {
    await step.run("process-transaction", async () => {
      try {
        return await processRecurringTemplate(event.data.transactionId, event.data.userId);
      } catch (error) {
        console.error("[inngest:process-recurring-transaction]", failureMessage(error));
        throw error;
      }
    });
  },
);

export const triggerRecurringTransactions = inngest.createFunction(
  {
    id: "trigger-recurring-transactions",
    name: "Trigger Recurring Transactions",
    retries: RETRIES,
  },
  { cron: "0 0 * * *" },
  async ({ step }) => {
    const due = await step.run("fetch-recurring-transactions", async () => {
      try {
        return await findDueTemplates();
      } catch (error) {
        console.error("[inngest:trigger-recurring-transactions]", failureMessage(error));
        throw error;
      }
    });

    const events = due.map((row) => ({
      name: "transaction.recurring.process" as const,
      data: { transactionId: row.id, userId: row.userId },
    }));
    for (let index = 0; index < events.length; index += FANOUT_CHUNK) {
      await step.sendEvent(`fan-out-${index / FANOUT_CHUNK}`, events.slice(index, index + FANOUT_CHUNK));
    }
    return { triggered: due.length };
  },
);

export const checkBudgetAlerts = inngest.createFunction(
  {
    id: "check-budget-alerts",
    name: "Check Budget Alerts",
    retries: RETRIES,
  },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    const alerts = await step.run("fetch-budgets", async () => {
      try {
        return await findBudgetAlerts();
      } catch (error) {
        console.error("[inngest:check-budget-alerts]", failureMessage(error));
        throw error;
      }
    });

    const events = alerts.map((alert) => ({
      name: "budget.alert.send" as const,
      data: alert,
    }));
    for (let index = 0; index < events.length; index += FANOUT_CHUNK) {
      await step.sendEvent(`fan-out-${index / FANOUT_CHUNK}`, events.slice(index, index + FANOUT_CHUNK));
    }
    return { triggered: alerts.length };
  },
);

export const processBudgetAlert = inngest.createFunction(
  {
    id: "process-budget-alert",
    name: "Process Budget Alert",
    retries: RETRIES,
  },
  { event: "budget.alert.send" },
  async ({ event, step }) => {
    await step.run("send-budget-alert", async () => {
      try {
        return await deliverBudgetAlert(event.data);
      } catch (error) {
        console.error("[inngest:process-budget-alert]", failureMessage(error));
        throw error;
      }
    });
  },
);

export const generateMonthlyReports = inngest.createFunction(
  {
    id: "generate-monthly-reports",
    name: "Generate Monthly Reports",
    retries: RETRIES,
  },
  { cron: "0 0 1 * *" },
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      try {
        return await findMonthlyReportUsers();
      } catch (error) {
        console.error("[inngest:generate-monthly-reports]", failureMessage(error));
        throw error;
      }
    });

    const events = users.map((user) => ({
      name: "report.monthly.send" as const,
      data: { userId: user.id },
    }));
    for (let index = 0; index < events.length; index += FANOUT_CHUNK) {
      await step.sendEvent(`fan-out-${index / FANOUT_CHUNK}`, events.slice(index, index + FANOUT_CHUNK));
    }
    return { triggered: users.length };
  },
);

export const processMonthlyReport = inngest.createFunction(
  {
    id: "process-monthly-report",
    name: "Process Monthly Report",
    retries: RETRIES,
  },
  { event: "report.monthly.send" },
  async ({ event, step }) => {
    await step.run("send-monthly-report", async () => {
      try {
        return await deliverMonthlyReport(event.data.userId);
      } catch (error) {
        console.error("[inngest:process-monthly-report]", failureMessage(error));
        throw error;
      }
    });
  },
);

export const functions = [
  processRecurringTransaction,
  triggerRecurringTransactions,
  generateMonthlyReports,
  checkBudgetAlerts,
  processBudgetAlert,
  processMonthlyReport,
];
