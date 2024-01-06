import { ItemListing, PrismaClient, PrismaPromise } from "../generated/client";

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

export function mysqlReplaceMany(data: any[]): PrismaPromise<any> {
  if (data.length === 0) {
    throw new Error("You cannot provide empty array to mysqlReplaceMany!");
  }

  const fields = new Set<string>();

  const itemValues = data
    .map((item) => {
      const keys = Object.keys(item) as (keyof ItemListing)[];
      keys.forEach(fields.add, fields);

      const values = Object.values(item)
        .map((value) => (typeof value === "number" ? value : `"${value}"`))
        .join(", ");
      return `(${values})`;
    })
    .join(",\n");

  return prisma.$executeRawUnsafe(
    `REPLACE INTO ItemListing (${Array.from(fields).join(
      ", ",
    )}) VALUES${itemValues}`,
  );
}
