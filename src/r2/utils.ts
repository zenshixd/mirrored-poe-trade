import type { R2Error } from "./types.ts";

export function formatError(err: R2Error | Error | string) {
	if (typeof err === "string") {
		return err;
	}

	if ("Error" in err) {
		return `Code=${err.Error.Code}, Message=${err.Error.Message}`;
	}

	return err.message;
}

export const formatStashIndex = (index: number) =>
	`${index.toString().padStart(8, "0")}`;

export const parseStashIndex = (stashFileKey: string) =>
	Number(stashFileKey.replace(/stash-(\d+)\.json\.gz/, "$1"));

export const publicStashFilename = (index: number) =>
	`stash-${formatStashIndex(index)}.json.gz`;
