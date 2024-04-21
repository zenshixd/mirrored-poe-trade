import { join } from "node:path";
import { $ } from "bun";
import packageJson from "../package.json";
import { bump } from "./bump";

const version = await bump("patch");

packageJson.version = version;
await Bun.write(
	join(`${import.meta.dir}\\..`, "package.json"),
	JSON.stringify(packageJson, undefined, 4),
);
console.log('Pushing version "$VERSION"');

await $`bun run build`;
await $`bun run sql:generate`;
await $`DOCKER_HOST="ssh://ubuntu@mirroredpoe.trade" docker compose up --build -d`;
