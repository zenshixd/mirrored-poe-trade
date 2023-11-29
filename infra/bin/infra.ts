#!/usr/bin/env bun-custom
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { MirroredPoeTradeStack } from "../lib/mirrored-poe-trade-stack";

const env = (region: string) => ({ env: { region } });

const app = new cdk.App();
new MirroredPoeTradeStack(app, "MirroredPoeTradeStack", {
  ...env("eu-central-1"),
});
