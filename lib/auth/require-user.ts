import type { User } from "@prisma/client";
import { ensureUser } from "@/lib/ensure-user";
import { UnauthorizedError } from "@/lib/errors";

export { UnauthorizedError };

export async function requireUser(): Promise<User> {
  const user = await ensureUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
