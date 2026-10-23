import { PrismaClient } from "@prisma/client";

function datasourceUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  const split = raw.split("?");
  const base = split[0];
  if (!/:6543(\/|$)/.test(base)) return raw;
  const params = new URLSearchParams(split[1] || "");
  if (params.get("pgbouncer") !== "true") params.set("pgbouncer", "true");
  if (params.get("connection_limit") !== "1") params.set("connection_limit", "1");
  return `${base}?${params.toString()}`;
}

function createPrismaClient() {
  const url = datasourceUrl();
  const log: { emit: "stdout"; level: "query" }[] =
    process.env.PRISMA_LOG_QUERIES === "1" ? [{ emit: "stdout", level: "query" }] : [];
  return new PrismaClient({ ...(url ? { datasourceUrl: url } : {}), log });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db: PrismaClient = globalForPrisma.prisma || createPrismaClient();

globalForPrisma.prisma = db;
