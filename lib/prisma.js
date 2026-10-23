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
  const options = {};
  if (url) options.datasourceUrl = url;
  if (process.env.PRISMA_LOG_QUERIES === "1") {
    options.log = [{ emit: "stdout", level: "query" }];
  }
  return new PrismaClient(options);
}

export const db = globalThis.prisma || createPrismaClient();

globalThis.prisma = db;
