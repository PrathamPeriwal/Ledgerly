import { PrismaClient } from "@prisma/client";

function createPrismaClient() {
  if (process.env.PRISMA_LOG_QUERIES === "1") {
    return new PrismaClient({ log: [{ emit: "stdout", level: "query" }] });
  }
  return new PrismaClient();
}

export const db = globalThis.prisma || createPrismaClient();

globalThis.prisma = db;
