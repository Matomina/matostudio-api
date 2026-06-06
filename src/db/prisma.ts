import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing environment variable: DATABASE_URL");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });

export const prisma = new PrismaClient({ adapter });
