import { test } from "bun:test";
import { db } from "../db";
import { appState } from "../db/schema.ts";

test("delete", async () => {
	const result = await db.delete(appState).returning();

	console.log(result);
});
