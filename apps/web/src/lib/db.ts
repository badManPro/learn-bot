import { PrismaClient } from "@prisma/client";

import { env } from "@/lib/env";

const globalForDb = globalThis as typeof globalThis & {
  __db?: PrismaClient;
};

export const db =
  globalForDb.__db ??
  new PrismaClient({
    datasourceUrl: env.DATABASE_URL
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__db = db;
}
