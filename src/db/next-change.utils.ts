import fs from "node:fs/promises";

const LATEST_INDEX_PATH = "db/latest-index.json";

export async function getLatestIndex() {
	if (!(await fs.exists(LATEST_INDEX_PATH))) {
		return 1;
	}
	return JSON.parse(await fs.readFile(LATEST_INDEX_PATH, "utf8"));
}

export async function setLatestIndex(latestIndex: number): Promise<void> {
	await Bun.write(LATEST_INDEX_PATH, JSON.stringify(latestIndex));
}
