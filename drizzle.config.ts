import type { Config } from "drizzle-kit";

export default {
	schema: "./src/db/schema.ts",
	out: "./migrations",
	driver: "libsql",
	dbCredentials: {
		url: "file:./db/mpt.db",
	},
} satisfies Config;
