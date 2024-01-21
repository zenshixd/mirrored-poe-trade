import { $, file, write } from "bun";
import { versionBump } from "./version-bump.ts";

const REPO_URL = "032544014746.dkr.ecr.eu-central-1.amazonaws.com";

const log = console.log;

const pckgJson = await file("./package.json").json();
pckgJson.version = await versionBump("patch");
await write("./package.json", JSON.stringify(pckgJson, undefined, 2));

log(`Pushing version ${pckgJson.version}`);

await $`bun run build`;
await $`aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin ${REPO_URL}`;
await $`docker build -t mirrored-poe-trade --progress=plain .`;

const newImageUrl = `${REPO_URL}/mirrored-poe-trade-app:${pckgJson.version}`;
await $`docker tag mirrored-poe-trade:latest ${newImageUrl}`;
await $`docker push ${newImageUrl}`;

await $`aws ssm put-parameter --overwrite --name /mirrored-poe-trade/version --value ${pckgJson.version} --type String --region eu-central-1`;

await $`bun ./tools/update-ecs.ts ${newImageUrl}`;
