import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema";

export const db = drizzle(new Database("db/mpt.db"), {
	schema,
});
migrate(db, {
	migrationsFolder: "./migrations",
});
