import {
  ItemListing,
  PrismaClient,
  PrismaPromise,
} from "../generated/client-mpt";

export function mysqlReplaceMany(
  client: PrismaClient,
  data: any[],
): PrismaPromise<any> {
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

  return client.$executeRawUnsafe(
    `REPLACE
        INTO ItemListing (
        ${Array.from(fields).join(", ")}
        )
        VALUES
        ${itemValues}`,
  );
}
