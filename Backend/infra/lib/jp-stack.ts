import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { AuroraExpress } from "./aurora-express.js";
import { JpCognito } from "./jp-cognito.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Amplify production + common local dev OAuth redirect URLs. */
const COGNITO_CALLBACK_URLS = [
  "http://localhost:3000",
  "http://localhost:3000/",
  "http://localhost:3000/api/auth/callback/cognito",
  "https://main.dbkqz2plarhlv.amplifyapp.com",
  "https://main.dbkqz2plarhlv.amplifyapp.com/",
  "https://main.dbkqz2plarhlv.amplifyapp.com/api/auth/callback/cognito",
];

const COGNITO_LOGOUT_URLS = [
  "http://localhost:3000",
  "http://localhost:3000/",
  "https://main.dbkqz2plarhlv.amplifyapp.com",
  "https://main.dbkqz2plarhlv.amplifyapp.com/",
];

/**
 * Production-aligned stack: Cognito + Aurora Express (VPC-less, IAM auth) +
 * monolithic ApiHandler behind API Gateway `{proxy+}`.
 *
 * Matches the live JpStack deployed from feat/9; do not replace with the
 * VPC/RDS cluster layout from the persistence PRs without migrating data.
 */
export class JpStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const auth = new JpCognito(this, "JpAuth", {
      callbackUrls: COGNITO_CALLBACK_URLS,
      logoutUrls: COGNITO_LOGOUT_URLS,
    });

    const database = new AuroraExpress(this, "JpDatabase", {
      minCapacity: 0.5,
      maxCapacity: 2,
    });

    const anthropicSecret = new secretsmanager.Secret(this, "AnthropicApiKey", {
      secretName: "jp/anthropic-api-key",
      description: "Anthropic Claude API key for JP agents (Lambda)",
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
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        DATABASE_HOST: database.endpointHostname,
        DATABASE_PORT: database.endpointPort,
        DATABASE_NAME: "postgres",
        DATABASE_USER: "postgres",
        DATABASE_USE_IAM_AUTH: "true",
        ANTHROPIC_SECRET_ARN: anthropicSecret.secretArn,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node22",
        externalModules: ["aws-sdk"],
      },
    });

    apiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["rds-db:connect"],
        resources: [
          `arn:aws:rds-db:${this.region}:${this.account}:dbuser:${database.dbClusterResourceId}/postgres`,
        ],
      }),
    );
    anthropicSecret.grantRead(apiHandler);

    const api = new apigateway.RestApi(this, "JpApi", {
      restApiName: "JP Job Player API",
      description: "JP Job Player — API Gateway + Lambda (Aurora Express)",
      deployOptions: { stageName: "v1" },
    });

    const integration = new apigateway.LambdaIntegration(apiHandler);
    // Monolithic ApiHandler routes all paths internally; proxy+ avoids per-route
    // CDK drift when handlers/api.ts gains new endpoints (ADR-0004).
    api.root.addProxy({
      defaultIntegration: integration,
      anyMethod: true,
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway base URL",
    });

    new cdk.CfnOutput(this, "DatabaseEndpoint", {
      value: `${database.endpointHostname}:${database.endpointPort}`,
      description: "Aurora Express cluster endpoint (IAM auth)",
    });

    new cdk.CfnOutput(this, "DatabaseClusterIdentifier", {
      value: database.clusterIdentifier,
      description: "Aurora Express cluster identifier",
    });

    new cdk.CfnOutput(this, "DatabaseAuthNote", {
      value:
        "Express cluster uses IAM auth (user: postgres). Generate tokens with @aws-sdk/rds-signer.",
      description: "Database connection note",
    });

    new cdk.CfnOutput(this, "AnthropicSecretArn", {
      value: anthropicSecret.secretArn,
      description: "Secrets Manager ARN — set ANTHROPIC_API_KEY value (see docs/infra/anthropic-secret.md)",
    });

    new cdk.CfnOutput(this, "CognitoUserPoolId", {
      value: auth.userPool.userPoolId,
      description: "Cognito user pool ID",
    });

    new cdk.CfnOutput(this, "CognitoClientId", {
      value: auth.userPoolClient.userPoolClientId,
      description: "Cognito app client ID (public, no secret)",
    });

    new cdk.CfnOutput(this, "CognitoRegion", {
      value: this.region,
      description: "Cognito region",
    });

    new cdk.CfnOutput(this, "CognitoHostedUiUrl", {
      value: auth.hostedUiUrl,
      description: "Cognito hosted UI base URL",
    });
  }
}
