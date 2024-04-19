import { test } from "bun:test";
import { authorize, getPublicStashes } from "../poe-api/poe-api.ts";
import { r2 } from "../r2/r2.ts";

test.skip("scrap one", async () => {
	const nextChangeId = "602398502-612613083-599158289-609753227-606547204";
	const token = await authorize();

	const result = await getPublicStashes(token, nextChangeId);

	console.log("next_change_id", result.next_change_id);
});

test("list everything", async () => {
	console.log("memory used", process.memoryUsage());
	let total = 0;
	let continuationToken: string | undefined;
	const stashChangeIds = [];
	while (true) {
		const result = await r2.listObjects("mpt-stashes-prod", {
			continuationToken,
		});

		total += result.Contents.length;
		stashChangeIds.push(...result.Contents.map((c) => c.Key));
		console.log(
			`KeyCount: ${result.KeyCount}, MaxKeys: ${result.MaxKeys}, Contents: ${result.Contents.length}, total: ${total}`,
		);
		continuationToken = result.NextContinuationToken;

		if (result.KeyCount < result.MaxKeys) {
			break;
		}
	}

	console.log(stashChangeIds.length);
	console.log("memory used", process.memoryUsage());
});
