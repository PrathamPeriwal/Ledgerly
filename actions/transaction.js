"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";
import aj from "@/lib/arcjet";
import { request } from "@arcjet/next";

function getGemini() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

const serializeAmount = (obj) => ({
  ...obj,
  amount: obj.amount.toNumber(),
});

// Create Transaction
export async function createTransaction(data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Get request data for ArcJet
    const req = await request();

    // Check rate limit
    const decision = await aj.protect(req, {
      userId,
      requested: 1, // Specify how many tokens to consume
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason;
        console.error({
          code: "RATE_LIMIT_EXCEEDED",
          details: {
            remaining,
            resetInSeconds: reset,
          },
        });

        throw new Error("Too many requests. Please try again later.");
      }

      throw new Error("Request blocked");
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const account = await db.account.findUnique({
      where: {
        id: data.accountId,
        userId: user.id,
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    // Calculate new balance
    const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
    const newBalance = account.balance.toNumber() + balanceChange;

    // Create transaction and update account balance
    const transaction = await db.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          ...data,
          userId: user.id,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: newBalance },
      });

      return newTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getTransaction(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const transaction = await db.transaction.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!transaction) throw new Error("Transaction not found");

  return serializeAmount(transaction);
}

export async function updateTransaction(id, data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Get original transaction to calculate balance change
    const originalTransaction = await db.transaction.findUnique({
      where: {
        id,
        userId: user.id,
      },
      include: {
        account: true,
      },
    });

    if (!originalTransaction) throw new Error("Transaction not found");

    // Calculate balance changes
    const oldBalanceChange =
      originalTransaction.type === "EXPENSE"
        ? -originalTransaction.amount.toNumber()
        : originalTransaction.amount.toNumber();

    const newBalanceChange =
      data.type === "EXPENSE" ? -data.amount : data.amount;

    const netBalanceChange = newBalanceChange - oldBalanceChange;

    // Update transaction and account balance in a transaction
    const transaction = await db.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: {
          id,
          userId: user.id,
        },
        data: {
          ...data,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      // Update account balance
      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: netBalanceChange,
          },
        },
      });

      return updated;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}

// Get User Transactions
export async function getUserTransactions(query = {}) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const filters = { ...(query ?? {}) };
    delete filters.userId;

    const transactions = await db.transaction.findMany({
      where: {
        ...filters,
        userId: user.id,
      },
      include: {
        account: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    return { success: true, data: transactions };
  } catch (error) {
    throw new Error(error.message);
  }
}

const ALLOWED_RECEIPT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

function base64DecodedBytes(value) {
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/\s/g, "");
  if (!cleaned) return 0;
  const padding = cleaned.endsWith("==") ? 2 : cleaned.endsWith("=") ? 1 : 0;
  return Math.floor((cleaned.length * 3) / 4) - padding;
}

// Scan Receipt
export async function scanReceipt(fileOrPayload) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Support both File objects and a base64 payload from the client
    let base64String = "";
    let mimeType = "image/jpeg";

    if (fileOrPayload && typeof fileOrPayload === "object" && "base64" in fileOrPayload) {
      base64String = fileOrPayload.base64;
      mimeType = fileOrPayload.mimeType || mimeType;
    } else if (fileOrPayload && typeof fileOrPayload.arrayBuffer === "function") {
      if (typeof fileOrPayload.size === "number" && fileOrPayload.size > MAX_RECEIPT_BYTES) {
        throw new Error("File must be 5 MB or smaller");
      }
      // Backward compatibility if a File was passed directly
      const arrayBuffer = await fileOrPayload.arrayBuffer();
      base64String = Buffer.from(arrayBuffer).toString("base64");
      mimeType = fileOrPayload.type || mimeType;
    } else if (typeof fileOrPayload === "string") {
      base64String = fileOrPayload;
    } else {
      throw new Error("Invalid input for scanReceipt");
    }

    if (!ALLOWED_RECEIPT_TYPES.has(mimeType)) {
      throw new Error("Only JPEG, PNG, and WebP images are allowed");
    }

    if (base64DecodedBytes(base64String) > MAX_RECEIPT_BYTES) {
      throw new Error("File must be 5 MB or smaller");
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "Missing GEMINI_API_KEY. Add it to your environment and restart the server."
      );
    }

    // Using Gemini 2.5 Flash - stable v1 API (not v1beta)
    const genAI = getGemini();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Analyze this receipt image and extract the following information in JSON format:
      - Total amount (just the number)
      - Date (in ISO format)
      - Description or items purchased (brief summary)
      - Merchant/store name
      - Suggested category (one of: housing, transportation, groceries, utilities, entertainment, food, shopping, healthcare, education, personal, travel, insurance, gifts, bills, other-expense)

      IMPORTANT: Respond ONLY with valid JSON, no markdown, no extra text.
      Format:
      {
        "amount": number,
        "date": "ISO date string",
        "description": "string",
        "merchantName": "string",
        "category": "string"
      }

      If it's not a receipt, return an empty object {}.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64String,
          mimeType,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    // Better JSON cleaning - remove markdown code blocks and extra whitespace
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const data = JSON.parse(cleanedText || "{}");
      if (!data || Object.keys(data).length === 0) {
        throw new Error("No receipt details detected. Try a clearer image.");
      }
      return {
        amount: Number(data.amount) || 0,
        date: data.date ? new Date(data.date) : new Date(),
        description: data.description || "",
        category: data.category || "other-expense",
        merchantName: data.merchantName || "",
      };
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError, "Raw text:", cleanedText);
      throw new Error("Invalid response format from Gemini");
    }
  } catch (error) {
    console.error("Error scanning receipt:", error);
    throw new Error(error.message || "Failed to scan receipt");
  }
}



// Helper function to calculate next recurring date
function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);

  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date;
}
