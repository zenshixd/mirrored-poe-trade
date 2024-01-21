#!/usr/bin/env bun
import * as cdk from "aws-cdk-lib";
import { VpcStack } from "../lib/vpc-stack";
import { DatabaseStack } from "../lib/database-stack";
import { EcrStack } from "../lib/ecr-stack";
import { UpdaterStack } from "../lib/updater-stack";

const ZONE_NAME = "mirroredpoe.trade";
const HOSTED_ZONE_ID = "Z00479621N6MBUR4DJCZM";
const stackName = (name: string) => `mirrored-poe-trade-${name}`;
const env = (region: string) => ({ env: { account: "032544014746", region } });

const app = new cdk.App();
const vpcStack = new VpcStack(app, "MirroredPoeTradeVpc", {
  ...env("eu-central-1"),
  stackName: stackName("vpc"),
});
const ecrStack = new EcrStack(app, "MirroredPoeTradeEcr", {
  ...env("eu-central-1"),
  stackName: stackName("ecr"),
});
const dbStack = new DatabaseStack(app, "MirroredPoeTradeDb", {
  ...env("eu-central-1"),
  stackName: stackName("db"),
  vpc: vpcStack.vpc,
  zoneName: ZONE_NAME,
  hostedZoneId: HOSTED_ZONE_ID,
});
// new MigraterStack(app, "MirroredPoeTradeMigrater", {
//   ...env("eu-central-1"),
//   stackName: stackName("migrater"),
//   vpc: vpcStack.vpc,
//   repository: ecrStack.repository,
//   databaseCredentials: dbStack.credentials,
// });

new UpdaterStack(app, "MirroredPoeTradeUpdater", {
  ...env("eu-central-1"),
  stackName: "mpt-updater",
  vpc: vpcStack.vpc,
  databaseCredentials: dbStack.credentials,
  zoneName: ZONE_NAME,
  hostedZoneId: HOSTED_ZONE_ID,
  repository: ecrStack.repository,
});

// new MirroredPoeTradeStack(app, "MirroredPoeTradeStack", {
//   ...env("eu-central-1"),
//   vpc: vpcStack.vpc,
//   databaseCredentials: dbStack.credentials,
//   zoneName: ZONE_NAME,
//   hostedZoneId: HOSTED_ZONE_ID,
//   repository: ecrStack.repository,
// });
