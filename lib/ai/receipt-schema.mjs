import { defaultCategories } from "../../data/categories.js";

/** Production response schema for receipt scanning. Shared by the route and scripts/check-gemini.ts. */
export function receiptJsonSchema() {
  return {
    type: "object",
    properties: {
      amount: { type: "number" },
      date: { type: ["string", "null"], description: "YYYY-MM-DD, or null when the receipt shows no date" },
      description: { type: "string" },
      merchantName: { type: "string" },
      category: { type: "string", enum: defaultCategories.map((category) => category.id) },
    },
    required: ["amount", "date", "description", "merchantName", "category"],
  };
}
