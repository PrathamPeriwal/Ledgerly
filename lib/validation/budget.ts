import { z } from "zod";
import { moneyAmount } from "@/lib/validation/transaction";

export const budgetInputSchema = z.object({ amount: moneyAmount("Budget amount") });

export type BudgetInput = z.infer<typeof budgetInputSchema>;
