import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });
if (
  process.env.DATABASE_URL === undefined ||
  process.env.DATABASE_URL.trim() === ""
) {
  throw new Error("Database URL is not defined.");
}

const client = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

client.$connect();

export { client };
