#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { JpStack } from "../lib/jp-stack.js";

const app = new cdk.App();

new JpStack(app, "JpStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
});
