import { eq } from "drizzle-orm";
import { db } from "./index.ts";
import { appState } from "./schema.ts";

const LATEST_INDEX_PK = "LatestIndex";

export async function getLatestIndex() {
	const result = await db.query.appState.findFirst({
		where: eq(appState.key, LATEST_INDEX_PK),
	});

	console.log("GET LATEST INDEX", result);
	return result ? Number(result.value) : 1;
}

export async function setLatestIndex(latestIndex: number): Promise<void> {
	await db
		.insert(appState)
		.values({
			key: LATEST_INDEX_PK,
			value: latestIndex.toString(),
		})
		.onConflictDoUpdate({
			target: appState.key,
			set: {
				value: latestIndex.toString(),
			},
		});
}
