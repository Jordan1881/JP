import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as rds from "aws-cdk-lib/aws-rds";
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

    const apiHandler = new lambdaNodejs.NodejsFunction(this, "ApiHandler", {
      entry: join(__dirname, "../../../src/handlers/api.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      vpc,
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

    cluster.connections.allowDefaultPortFrom(apiHandler);

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

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway base URL",
    });

    new cdk.CfnOutput(this, "DatabaseEndpoint", {
      value: cluster.clusterEndpoint.socketAddress,
      description: "Aurora cluster endpoint",
    });
  }
}
