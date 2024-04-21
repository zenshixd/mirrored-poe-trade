import { serialize } from "bun:jsc";
import { test } from "bun:test";
import type { PoeApiPublicStashChange } from "../poe-api/types";
import { elapsed } from "../utils/elapsed";

const stashes = (await Bun.file(
	`${import.meta.dir}/stashes.json`,
).json()) as PoeApiPublicStashChange[];

test.skip("size check", async () => {
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
