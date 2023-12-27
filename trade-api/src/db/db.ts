import { PrismaClient } from "../generated/client";

export const prisma = new PrismaClient({
  datasourceUrl: getDatabaseUrl(),
});

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (
    process.env.DATABASE_HOST &&
    process.env.DATABASE_USERNAME &&
    process.env.DATABASE_PASSWORD &&
    process.env.DATABASE_SCHEMA
  ) {
    const {
      DATABASE_HOST,
      DATABASE_USERNAME,
      DATABASE_PASSWORD,
      DATABASE_SCHEMA,
    } = process.env;
    return `mysql://${DATABASE_USERNAME}:${DATABASE_PASSWORD}@${DATABASE_HOST}:3306/${DATABASE_SCHEMA}`;
  }

  throw new Error(
    "Couldnt retrieve DATABASE_URL! Please provide DATABASE_URL in env variables!",
  );
}
