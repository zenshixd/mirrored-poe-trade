import { serialize } from "bun:jsc";
import { expect, test } from "bun:test";
import type { PublicStashChange } from "../poe-api.ts";
import { chunkify } from "../utils/chunkify.ts";
import { elapsed } from "../utils/elapsed.ts";
import { parallelize } from "../utils/parallelize.ts";

const stashes = (await Bun.file(
	`${import.meta.dir}/stashes.json`,
).json()) as PublicStashChange[];

test.skip("parallel", async () => {
	console.log(`Found ${stashes.length} public stashes!`);
	for (const stashesChunk of chunkify(stashes, 25)) {
		console.log("Querying changed stash...");
		const startTime = process.hrtime.bigint();
		let itemCount = 0;
		await parallelize(stashesChunk, async (stash) => {
			const Items = await mptPrisma.itemListing.findMany({
				where: {
					stashId: stash.id,
				},
			});
			itemCount += Items.length;

			expect(Items).toBeDefined();
		});
		const queryTime = (process.hrtime.bigint() - startTime) / 1_000_000n;
		console.log(
			`Querying complete! Took ${queryTime}ms, found ${itemCount} items.`,
		);
	}
});

test("all at once", async () => {
	console.log(`Found ${stashes.length} public stashes!`);
	console.log("Querying changed stash...");
	const startTime = process.hrtime.bigint();
	const stashIds = stashes.map((stash) => stash.id);
	const Items = await mptPrisma.itemListing.findMany({
		where: {
			stashId: {
				in: stashIds,
			},
		},
		orderBy: {
			stashId: "asc",
		},
	});

	expect(Items).toBeDefined();
	const queryTime = (process.hrtime.bigint() - startTime) / 1_000_000n;
	console.log(
		`Querying complete! Took ${queryTime}ms, found ${Items.length} items!`,
	);
});

test("size check", async () => {
	let startTime = process.hrtime.bigint();
	console.log(
		`serialize: ${serialize(stashes).byteLength}, time: ${elapsed(
			startTime,
		)}ms`,
	);

	startTime = process.hrtime.bigint();
	console.log(
		`JSON.stringify: ${
			Buffer.from(JSON.stringify(stashes)).byteLength
		}, time: ${elapsed(startTime)}ms`,
	);

	startTime = process.hrtime.bigint();
	console.log(
		`gzip: ${Bun.gzipSync(JSON.stringify(stashes)).byteLength}, time: ${elapsed(
			startTime,
		)}ms`,
	);

	startTime = process.hrtime.bigint();
	console.log(
		`deflate: ${
			Bun.deflateSync(JSON.stringify(stashes)).byteLength
		}, time: ${elapsed(startTime)}ms`,
	);
});
