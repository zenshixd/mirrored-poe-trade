import * as aws4 from "aws4";
import { XMLParser } from "fast-xml-parser";
import type { R2Config, R2ListObjectsResult } from "./types.ts";
import { formatError } from "./utils.ts";

export class R2 {
	private readonly bucketEndpoint: (bucketName: string) => string;
	private readonly parser = new XMLParser();

	constructor(private readonly config: R2Config) {
		const url = new URL(this.config.endpoint);
		this.bucketEndpoint = (bucketName: string) =>
			`${url.protocol}//${bucketName}.${url.host}`;
	}

	async listObjects(
		bucketName: string,
		options: {
			continuationToken?: string;
			maxKeys?: number;
		} = {},
	) {
		const params = new URLSearchParams({ "list-type": "2" });
		if (options.continuationToken) {
			params.append("continuation-token", options.continuationToken);
		}

		if (options.maxKeys) {
			params.append("max-keys", options.maxKeys.toString());
		}

		const response = await this.fetch(
			`${this.bucketEndpoint(bucketName)}/?${params.toString()}`,
			{ method: "GET" },
		);

		if (!response.ok) {
			throw new Error(
				`Failed to list ${bucketName}! ${formatError(
					await this.parse(response),
				)}`,
			);
		}

		const data = await this.parse<{ ListBucketResult: R2ListObjectsResult }>(
			response,
		);

		return data.ListBucketResult;
	}

	async headObject(bucketName: string, key: string) {
		const response = await this.fetch(
			`${this.bucketEndpoint(bucketName)}/${key}`,
			{ method: "HEAD" },
		);

		if (!response.ok) {
			if (response.status === 404) {
				return false;
			}

			throw new Error(
				`Failed to head object ${key}! ${response.status} ${
					response.statusText
				} ${formatError(await this.parse(response))}`,
			);
		}

		return true;
	}

	async getObject(bucketName: string, key: string) {
		const response = await this.fetch(
			`${this.bucketEndpoint(bucketName)}/${key}`,
			{ method: "GET" },
		);

		if (!response.ok) {
			throw new Error(
				`Failed to download ${key}! ${formatError(await this.parse(response))}`,
			);
		}

		return response.blob();
	}

	async putObject(bucketName: string, key: string, body: Buffer | string) {
		const response = await this.fetch(
			`${this.bucketEndpoint(bucketName)}/${key}`,
			{
				method: "PUT",
				body,
			},
		);
		if (!response.ok) {
			throw new Error(
				`Failed to upload ${key}! ${formatError(await this.parse(response))}`,
			);
		}
	}

	private async fetch(
		url: string,
		options: RequestInit & { body?: string | Buffer },
	) {
		const { host, pathname, search } = new URL(url);
		const req = aws4.sign(
			{
				host,
				path: pathname + search,
				region: this.config.region,
				service: "s3",
				method: options.method ?? "GET",
				headers: options.headers as Record<string, string>,
				body: options.body,
			},
			{
				accessKeyId: this.config.accessKeyId,
				secretAccessKey: this.config.secretAccessKey,
			},
		);

		return await fetch(url, {
			method: options.method,
			headers: req.headers as Record<string, string>,
			body: options.body,
		});
	}

	private async parse<T = unknown>(response: Response) {
		const data = this.parser.parse(await response.text());

		data["?xml"] = undefined;

		return data as T;
	}
}

if (
	!process.env.CLOUDFLARE_R2_KEY_ID ||
	!process.env.CLOUDFLARE_R2_KEY_SECRET
) {
	throw new Error(
		"CLOUDFLARE_R2_KEY_ID or CLOUDFLARE_R2_KEY_SECRET is not specified!",
	);
}

export const r2 = new R2({
	endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	region: "auto",
	accessKeyId: process.env.CLOUDFLARE_R2_KEY_ID,
	secretAccessKey: process.env.CLOUDFLARE_R2_KEY_SECRET,
});
