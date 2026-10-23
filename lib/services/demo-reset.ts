import { anchorToday, generatePersonaData } from "@/lib/demo/generate";
import { personaKeyFromEmail } from "@/lib/demo/personas";
import { db } from "@/lib/prisma";
import { isDemoEmail } from "@/lib/send-email";

const CHUNK = 500;

function demoEmail() {
  return (process.env.DEMO_USER_EMAIL || "maya@example.com").trim().toLowerCase();
}

export async function resetDemoUser(now = new Date()) {
  const email = demoEmail();
  const key = personaKeyFromEmail(email);
  if (!isDemoEmail(email) || !key) {
    console.error("[demo-reset] refused: DEMO_USER_EMAIL is not a demo persona");
    return { reset: false as const };
  }

  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    console.error("[demo-reset] refused: demo user does not exist");
    return { reset: false as const };
  }

  const data = generatePersonaData(key, anchorToday(now));
  const userId = user.id;

  await db.$transaction(
    async (tx) => {
      await tx.transaction.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      if (data.budget) {
        const amount = data.budget.amount.toFixed(2);
        await tx.budget.upsert({
          where: { userId },
          create: { userId, amount, lastAlertSent: null },
          update: { amount, lastAlertSent: null },
        });
      } else {
        await tx.budget.deleteMany({ where: { userId } });
      }

      const accountIds = new Map<string, string>();
      for (const account of data.accounts) {
        const created = await tx.account.create({
          data: {
            name: account.name,
            type: account.type,
            balance: account.balance.toFixed(2),
            isDefault: account.isDefault,
            userId,
          },
        });
        accountIds.set(account.key, created.id);
      }

      const rows = data.transactions.map((entry) => {
        const accountId = accountIds.get(entry.accountKey);
        if (!accountId) throw new Error(`Missing account ${entry.accountKey}`);
        return {
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
          status: "COMPLETED" as const,
          userId,
          accountId,
        };
      });
      for (let index = 0; index < rows.length; index += CHUNK) {
        await tx.transaction.createMany({ data: rows.slice(index, index + CHUNK) });
      }
    },
    { timeout: 30_000 },
  );

  return { reset: true as const, accounts: data.accounts.length, transactions: data.transactions.length };
}
