import { last } from "lodash";
import {
	BUCKET_NAME,
	authorize,
	getPublicStashes,
	getPublicStashesFromR2,
} from "./poe-api/poe-api";
import { r2 } from "./r2/r2";
import {
	formatStashIndex,
	parseStashIndex,
	publicStashFilename,
} from "./r2/utils";
import { elapsed } from "./utils/elapsed";
import { repeatUntil } from "./utils/repeatUntil";

async function validateIntegrity(): Promise<{
	highestIndex: number;
	missingStashChangeIds: { nextStashChangeId: string; index: number }[];
}> {
	console.log("Verifying data integrity...");
	const missingStashChangeIds = [];
	let highestIndex = 0;

	let continuationToken: string | undefined;
	while (true) {
		const result = await r2.listObjects(BUCKET_NAME, {
			continuationToken,
		});

		if (!result.Contents || result.Contents.length === 0) {
			break;
		}

		for (let i = 0; i < result.Contents.length - 1; i++) {
			const stashIndex = parseStashIndex(result.Contents[i].Key);
			const nextStashIndex = parseStashIndex(result.Contents[i + 1].Key);
			if (stashIndex !== nextStashIndex - 1) {
				const stash = await getPublicStashesFromR2(stashIndex);
				missingStashChangeIds.push({
					nextStashChangeId: stash.next_change_id,
					index: stashIndex + 1,
				});
				console.log(
					`Found missing stash change id=${stash.next_change_id} (index=${
						stashIndex + 1
					})`,
				);
			}
		}

		const lastItem = last(result.Contents);
		if (!lastItem) {
			throw new Error("No last item found");
		}

		highestIndex = parseStashIndex(lastItem.Key);

		if (result.KeyCount < result.MaxKeys) {
			break;
		}

		continuationToken = result.NextContinuationToken;
	}

	console.log(
		`Data integrity verification complete! Found ${missingStashChangeIds.length} missing stash changes. Loading them before searching for newest ones.`,
	);
	console.log(
		`Missing stash changes: ${JSON.stringify(missingStashChangeIds)}`,
	);
	return { missingStashChangeIds, highestIndex };
}

async function loadPublicStashes(
	token: string,
	nextStashIndex: number,
	nextChangeId: string,
) {
	let startTime = process.hrtime.bigint();
	try {
		console.log(
			`[${formatStashIndex(nextStashIndex)}] Requesting public stashes...`,
		);
		const result = await getPublicStashes(token, nextChangeId);
		console.log(
			`[${formatStashIndex(nextStashIndex)}] Retrieved stashes in ${elapsed(
				startTime,
			)}ms`,
		);
		if (result.stashes.length === 0) {
			console.log("No stashes found! Skipping.");
			return nextChangeId;
		}

		startTime = process.hrtime.bigint();

		await r2.putObject(
			BUCKET_NAME,
			publicStashFilename(nextStashIndex),
			Buffer.from(Bun.gzipSync(JSON.stringify(result))),
		);
		console.log(
			`[${formatStashIndex(nextStashIndex)}] Putting data to R2 took ${elapsed(
				startTime,
			)}ms`,
		);

		return result.next_change_id;
	} catch (err) {
		console.error(
			`Couldnt retrieve public stashes for id=${nextChangeId} (index=${formatStashIndex(
				nextStashIndex,
			)}) !`,
		);
		console.error(err);
		return nextChangeId;
	}
}

async function loadMissingStashes(
	token: string,
	missingStashChangeIds: { nextStashChangeId: string; index: number }[],
) {
	let missingStashInfo = missingStashChangeIds.shift();
	while (missingStashInfo) {
		console.log("Loading missing stash", missingStashInfo);
		const nextStashChangeId = await loadPublicStashes(
			token,
			missingStashInfo.index,
			missingStashInfo.nextStashChangeId,
		);

		const nextStashIndex = missingStashInfo.index + 1;
		const nextStashExists = await r2.headObject(
			BUCKET_NAME,
			publicStashFilename(nextStashIndex),
		);

		if (nextStashExists) {
			console.log(
				`Stash change with index ${nextStashIndex} exists. Loading next missing stash change...`,
			);
			missingStashInfo = missingStashChangeIds.shift();
		} else {
			console.log(
				`Stash change with index ${nextStashIndex} doesnt exist. Loading stash change ${nextStashChangeId}...`,
			);
			missingStashInfo = {
				nextStashChangeId,
				index: nextStashIndex,
			};
		}
	}
}

async function scrap() {
	const token = await authorize();
	let { missingStashChangeIds, highestIndex } = await validateIntegrity();
	await loadMissingStashes(token, missingStashChangeIds);
	const lastStash =
		highestIndex > 0 ? await getPublicStashesFromR2(highestIndex) : null;
	let nextStashChangeId = lastStash?.next_change_id ?? "undefined";

	await repeatUntil(
		() => true,
		async () => {
			const newNextChangeId = await loadPublicStashes(
				token,
				highestIndex + 1,
				nextStashChangeId,
			);

			if (nextStashChangeId !== newNextChangeId) {
				nextStashChangeId = newNextChangeId;
				highestIndex++;
			}
		},
		0,
	);
}

await scrap();
