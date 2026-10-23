-- CreateIndex
CREATE INDEX IF NOT EXISTS "transactions_userId_date_idx" ON "transactions"("userId", "date" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "transactions_accountId_date_idx" ON "transactions"("accountId", "date" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "transactions_userId_type_date_idx" ON "transactions"("userId", "type", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "transactions_recurring_next_idx" ON "transactions"("isRecurring", "nextRecurringDate");
