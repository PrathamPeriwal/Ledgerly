import { z } from "zod";
import { isValidCategory } from "@/data/categories";

export const MAX_AMOUNT = 1_000_000_000;

// Positive, at most 2 decimals, below MAX_AMOUNT. Shared by transactions and budgets.
export function moneyAmount(label = "Amount") {
  return z
    .number({ required_error: `${label} is required`, invalid_type_error: `${label} must be a number` })
    .finite(`${label} must be a number`)
    .positive(`${label} must be greater than zero`)
    .lt(MAX_AMOUNT, `${label} must be less than 1,000,000,000`)
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(String(value)), `${label} can have at most 2 decimals`);
}

// Client form schema: the form keeps the amount as a string.
export const transactionSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z.string().min(1, "Amount is required"),
    description: z.string().optional(),
    date: z.date({ required_error: "Date is required" }),
    accountId: z.string().min(1, "Account is required"),
    category: z.string().min(1, "Category is required"),
    isRecurring: z.boolean().default(false),
    recurringInterval: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isRecurring && !data.recurringInterval) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recurring interval is required for recurring transactions",
        path: ["recurringInterval"],
      });
    }
  });

// Server schema: what the actions accept (amount is already a number).
export const transactionInputSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"], { errorMap: () => ({ message: "Type must be INCOME or EXPENSE" }) }),
    amount: moneyAmount(),
    description: z.string().trim().max(100, "Description must be 100 characters or fewer").optional(),
    date: z.preprocess(
      (value) => (value instanceof Date || typeof value === "string" ? new Date(value) : value),
      z.date({ required_error: "Date is required", invalid_type_error: "Date is required" })
    ),
    accountId: z.string({ required_error: "Account is required" }).min(1, "Account is required"),
    category: z.string({ required_error: "Category is required" }).min(1, "Category is required"),
    isRecurring: z.boolean().default(false),
    recurringInterval: z
      .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"], {
        errorMap: () => ({ message: "Recurring interval is invalid" }),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (!isValidCategory(data.type, data.category)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Category is not valid for this type", path: ["category"] });
    }
    if (data.isRecurring && !data.recurringInterval) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recurring interval is required for recurring transactions",
        path: ["recurringInterval"],
      });
    }
  });

export type TransactionInput = z.infer<typeof transactionInputSchema>;

export const idSchema = z.string({ required_error: "Id is required" }).min(1, "Id is required");
export const idListSchema = z.array(idSchema, { required_error: "Ids are required", invalid_type_error: "Ids are required" });
