import { z } from "zod";

// Client form schema: the form keeps the balance as a string.
export const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["CURRENT", "SAVINGS"]),
  balance: z.string().min(1, "Initial balance is required"),
  isDefault: z.boolean().default(false),
});

// Server schema.
export const accountInputSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(50, "Name must be 50 characters or fewer"),
  type: z.enum(["CURRENT", "SAVINGS"], { errorMap: () => ({ message: "Type must be CURRENT or SAVINGS" }) }),
  balance: z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
    z
      .number({ required_error: "Initial balance is required", invalid_type_error: "Invalid balance amount" })
      .finite("Invalid balance amount")
  ),
  isDefault: z.boolean().default(false),
});

export type AccountInput = z.infer<typeof accountInputSchema>;
