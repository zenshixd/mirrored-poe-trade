import { describe, expect, it } from "bun:test";
import { R2 } from "../r2.ts";

describe("r2", () => {
	if (
		!process.env.CLOUDFLARE_R2_KEY_ID ||
		!process.env.CLOUDFLARE_R2_KEY_SECRET
	) {
		throw new Error(
			"CLOUDFLARE_R2_KEY_ID or CLOUDFLARE_R2_KEY_SECRET is not specified!",
		);
	}

	const r2 = new R2({
		endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		region: "auto",
		accessKeyId: process.env.CLOUDFLARE_R2_KEY_ID,
		secretAccessKey: process.env.CLOUDFLARE_R2_KEY_SECRET,
	});

	it("should list objects", async () => {
		const list = await r2.listObjects("r2-test");
		expect(list).toBeDefined();
		expect(list.Name).toEqual("r2-test");
		expect(list.Contents).toEqual(
			expect.arrayContaining([expect.objectContaining({ Key: "test.txt" })]),
		);
	});

	it("should put object", async () => {
		await r2.putObject("r2-test", "test.txt", "asd123");

		expect().pass();
	});

	describe("headObject", () => {
		it("should return true when object exists", async () => {
			const blob = await r2.headObject("r2-test", "test.txt");
			expect(blob).toBeDefined();
		});

		it("should return false when object exists", async () => {
			const blob = await r2.headObject("r2-test", "test-does-not-exist.txt");
			expect(blob).toBeDefined();
		});
	});

	it("should get object", async () => {
		const blob = await r2.getObject("r2-test", "test.txt");
		expect(blob).toBeDefined();
		expect(await blob.text()).toEqual("asd123");
	});
});
