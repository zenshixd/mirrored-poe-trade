import { eq } from "drizzle-orm";
import { db } from "./index.ts";
import { appState } from "./schema.ts";

const NEXT_CHANGE_PK = "NextChangeId";

export async function getNextChangeId(): Promise<string | undefined> {
	const result = await db.query.appState.findFirst({
		where: eq(appState.key, NEXT_CHANGE_PK),
	});

	console.log("GET NEXT CHANGE ID", result);
	return result?.value ?? undefined;
}

export async function setNextChangeId(nextChangeId: string): Promise<void> {
	await db
		.insert(appState)
		.values({
			key: NEXT_CHANGE_PK,
			value: nextChangeId,
		})
		.onConflictDoUpdate({
			target: appState.key,
			set: {
				value: nextChangeId,
			},
		});
}
