import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class JpStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "JpVpc", {
      maxAzs: 2,
      natGateways: 1,
    });

    const dbSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc,
      description: "Aurora Postgres access for JP Lambda functions",
      allowAllOutbound: true,
    });

    const cluster = new rds.DatabaseCluster(this, "JpDatabase", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      writer: rds.ClusterInstance.serverlessV2("writer"),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 2,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSecurityGroup],
      defaultDatabaseName: "jp",
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
    });

    const anthropicSecret = new secretsmanager.Secret(this, "AnthropicApiKey", {
      secretName: "jp/anthropic-api-key",
      description: "Anthropic Claude API key for JP agents",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ ANTHROPIC_API_KEY: "" }),
        generateStringKey: "ANTHROPIC_API_KEY",
        excludePunctuation: true,
      },
    });

    const apiHandler = new lambdaNodejs.NodejsFunction(this, "ApiHandler", {
      entry: join(__dirname, "../../../src/handlers/api.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      vpc,
      environment: {
        DATABASE_HOST: cluster.clusterEndpoint.hostname,
        DATABASE_PORT: cluster.clusterEndpoint.port.toString(),
        DATABASE_NAME: "jp",
        ANTHROPIC_SECRET_ARN: anthropicSecret.secretArn,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node22",
        externalModules: ["aws-sdk"],
      },
    });

    const sweepHandler = new lambdaNodejs.NodejsFunction(this, "SweepHandler", {
      entry: join(__dirname, "../../../src/handlers/sweep-all.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      vpc,
      timeout: cdk.Duration.minutes(5),
      environment: {
        DATABASE_HOST: cluster.clusterEndpoint.hostname,
        DATABASE_PORT: cluster.clusterEndpoint.port.toString(),
        DATABASE_NAME: "jp",
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node22",
        externalModules: ["aws-sdk"],
      },
    });

    anthropicSecret.grantRead(apiHandler);
    cluster.connections.allowDefaultPortFrom(apiHandler);
    cluster.connections.allowDefaultPortFrom(sweepHandler);

    const api = new apigateway.RestApi(this, "JpApi", {
      restApiName: "JP Job Player API",
      description: "JP Job Player — API Gateway + Lambda",
      deployOptions: { stageName: "v1" },
    });

    const integration = new apigateway.LambdaIntegration(apiHandler);
    api.root.addResource("health").addMethod("GET", integration);

    const jobs = api.root.addResource("jobs");
    jobs.addMethod("GET", integration);
    jobs.addMethod("POST", integration);
    const jobById = jobs.addResource("{id}");
    jobById.addMethod("GET", integration);
    jobById.addMethod("PATCH", integration);
    jobById.addMethod("DELETE", integration);

    new events.Rule(this, "DailySweepRule", {
      schedule: events.Schedule.cron({ minute: "0", hour: "6" }),
      description: "Daily staleness + archive lifecycle sweep (06:00 UTC)",
      targets: [new targets.LambdaFunction(sweepHandler)],
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway base URL",
    });

    new cdk.CfnOutput(this, "AnthropicSecretArn", {
      value: anthropicSecret.secretArn,
      description: "Secrets Manager ARN for Anthropic API key",
    });

    new cdk.CfnOutput(this, "DatabaseEndpoint", {
      value: cluster.clusterEndpoint.socketAddress,
      description: "Aurora cluster endpoint",
    });
  }
}
