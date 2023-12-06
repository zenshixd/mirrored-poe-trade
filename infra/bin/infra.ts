#!/usr/bin/env bun
import * as cdk from "aws-cdk-lib";
import { MirroredPoeTradeStack } from "../lib/mirrored-poe-trade-stack";

const env = (region: string) => ({ env: { account: "032544014746", region } });

const app = new cdk.App();
new MirroredPoeTradeStack(app, "MirroredPoeTradeStack", {
  ...env("eu-central-1"),
});
