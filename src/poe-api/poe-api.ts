import { r2 } from "../r2/r2.ts";
import { publicStashFilename } from "../r2/utils.ts";
import type { PoeApiPublicStashResponse } from "./types.ts";

export async function authorize() {
	const { poe_client_id, poe_client_secret } = process.env;

	if (!poe_client_id || !poe_client_secret) {
		throw new Error("client_id or client_secret is not specified!");
	}

	const params = new URLSearchParams();
	params.set("scope", "service:psapi");
	params.set("grant_type", "client_credentials");
	params.set("client_id", poe_client_id);
	params.set("client_secret", poe_client_secret);
	const response = await fetch("https://www.pathofexile.com/oauth/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"User-Agent":
				"OAuth mirroredpoetrade/1.0.0 (contact: ownelek@protonmail.com) StrictMode",
		},
		body: params.toString(),
	});

	if (!response.ok) {
		throw new Error(`Authorization request failed! ${await response.text()}`);
	}

	const { access_token } = (await response.json()) as { access_token: string };

	return access_token;
}

let lastPoeApiRequestTimestamp = 0;
const poeApiCooldown = 1_000;
export async function getPublicStashes(
	token: string,
	nextChangeId?: string,
): Promise<PoeApiPublicStashResponse> {
	const lastRequestDelta = Date.now() - lastPoeApiRequestTimestamp;
	if (lastRequestDelta < poeApiCooldown) {
		await Bun.sleep(poeApiCooldown - lastRequestDelta);
	}
	const response = await fetch(
		`https://api.pathofexile.com/public-stash-tabs${
			nextChangeId ? `?id=${nextChangeId}` : ""
		}`,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
				"User-Agent":
					"OAuth mirroredpoetrade/1.0.0 (contact: ownelek@protonmail.com) StrictMode",
			},
		},
	);
	lastPoeApiRequestTimestamp = Date.now();

	if (!response.ok) {
		throw new Error(`Authorization request failed! ${await response.text()}`);
	}

	return (await response.json()) as PoeApiPublicStashResponse;
}

export const BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "mpt-stashes-dev";
console.log("Using bucket", BUCKET_NAME);

export async function getPublicStashesFromR2(
	index: number,
): Promise<PoeApiPublicStashResponse> {
	const obj = await r2.getObject(BUCKET_NAME, publicStashFilename(index));

	const body = new TextDecoder("utf8").decode(
		Bun.gunzipSync(await obj.arrayBuffer()),
	);

	return JSON.parse(body) as PoeApiPublicStashResponse;
}

export function parseNote(note?: string): {
	priceValue: number | undefined;
	priceUnit: string | undefined;
} {
	const empty = {
		priceUnit: undefined,
		priceValue: undefined,
	};
	if (!note) {
		return empty;
	}

	const parts = note.split(" ");

	if (parts.length !== 3) {
		return empty;
	}

	return {
		priceValue:
			Math.min(Number.parseFloat(parts[1]), Number.MAX_SAFE_INTEGER) || 0,
		priceUnit: parts[2],
	};
}
