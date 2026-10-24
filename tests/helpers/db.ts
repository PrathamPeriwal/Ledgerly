import { PrismaClient } from "@prisma/client";

export function testPrisma() {
  const direct = process.env.DIRECT_URL;
  if (direct) return new PrismaClient({ datasourceUrl: direct });
  const database = process.env.DATABASE_URL ?? "";
  const joiner = database.includes("?") ? "&" : "?";
  return new PrismaClient({ datasourceUrl: `${database}${joiner}pgbouncer=true&connection_limit=1` });
}
