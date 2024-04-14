import { S3 } from "@aws-sdk/client-s3";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "./db";
import { publicStashChange } from "./db/schema.ts";
import {
	BUCKET_NAME,
	authorize,
	getPublicStashes,
	publicStashFilename,
} from "./poe-api.ts";
import { elapsed } from "./utils/elapsed.ts";
import { repeatUntil } from "./utils/repeatUntil.ts";

const r2 = new S3({
	endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	region: "auto",
});
let queuePromise = Promise.resolve();

async function validateIntegrity(): Promise<{
	missingStashIndexes: number[];
}> {
	console.log("Verifying data integrity...");
	const missingStashIndexes = [];

	let previousStashChange = await db.query.publicStashChange.findFirst({
		where: eq(publicStashChange.index, 1),
	});

	if (!previousStashChange) {
		console.log(
			"There is nothing in the PublicStashChange table. Skipping validation.",
		);
		return { missingStashIndexes: [] };
	}

	let startIndex = 0;
	while (true) {
		const list = await db.query.publicStashChange.findMany({
			where: and(
				gte(publicStashChange.index, startIndex),
				lt(publicStashChange.index, startIndex + 100),
			),
			orderBy: asc(publicStashChange.index),
		});

		for (let i = 0; i < list.length; i++) {
			const item = list[i];
			if (item.index !== previousStashChange.index + 1) {
				console.log(
					`Missing stash change between ${item.index} and ${previousStashChange.index}`,
				);
				missingStashIndexes.push(item.index - 1);
			}

			previousStashChange = item;
			startIndex = item.index;
		}

		// that was last batch
		if (list.length < 100) {
			break;
		}
	}

	console.log(
		`Data integrity verification complete! Found ${missingStashIndexes.length} missing stash changes. Loading them before searching for newest ones.`,
	);
	return { missingStashIndexes };
}

async function loadPublicStashes(
	token: string,
	nextStashIndex: number,
	nextChangeId: string,
) {
	let startTime = process.hrtime.bigint();
	try {
		console.log(`[${nextChangeId}] Requesting public stashes...`);
		const result = await getPublicStashes(token, nextChangeId);
		console.log(
			`[${nextChangeId}] Retrieved stashes in ${elapsed(startTime)}ms`,
		);
		if (result.stashes.length === 0) {
			console.log("No stashes found! Skipping.");
			return nextChangeId;
		}

		startTime = process.hrtime.bigint();

		const promise = r2
			.putObject({
				Bucket: BUCKET_NAME,
				Key: publicStashFilename(nextChangeId),
				Body: Bun.gzipSync(JSON.stringify(result)),
			})
			.then(() => {
				console.log(`[${nextChangeId}] Added stash to R2`);
				return db.insert(publicStashChange).values({
					index: nextStashIndex,
					stashChangeId: nextChangeId ?? "undefined",
					nextStashChangeId: result.next_change_id,
				});
			});

		queuePromise = queuePromise
			.then(() => promise)
			.then(async () => {
				console.log(
					`[${nextChangeId}] Putting data to DB took ${elapsed(startTime)}ms`,
				);
			});

		return result.next_change_id;
	} catch (err) {
		console.error(`Couldnt retrieve public stashes for id=${nextChangeId} !`);
		console.error(err);
		return nextChangeId;
	}
}

async function scrap() {
	const latestItem = await db.query.publicStashChange.findFirst({
		orderBy: desc(publicStashChange.index),
	});
	let nextStashChangeIndex = latestItem ? latestItem.index + 1 : 0;
	let nextStashChangeId = latestItem?.nextStashChangeId ?? "undefined";

	const token = await authorize();

	await repeatUntil(
		() => true,
		async () => {
			const newNextChangeId = await loadPublicStashes(
				token,
				nextStashChangeIndex,
				nextStashChangeId,
			);

			if (nextStashChangeId !== newNextChangeId) {
				nextStashChangeId = newNextChangeId;
				nextStashChangeIndex++;
			}
		},
		1000,
	);
}

await scrap();
