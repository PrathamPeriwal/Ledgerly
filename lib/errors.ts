import { Prisma } from "@prisma/client";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

// Errors whose message is safe to show to the user.
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

export class NotFoundError extends UserFacingError {
  constructor() {
    super("Not found");
    this.name = "NotFoundError";
  }
}

export type Failure = { success: false; error: string };

export function toFailure(action: string, err: unknown): Failure {
  if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
  if (err instanceof UserFacingError) return { success: false, error: err.message };
  // Prisma messages can contain query arguments, so log only the code.
  if (err instanceof Prisma.PrismaClientKnownRequestError) console.error(`[${action}]`, err.name, err.code);
  else console.error(`[${action}]`, err instanceof Error ? err.message : "unknown error");
  return { success: false, error: "Something went wrong. Please try again." };
}
