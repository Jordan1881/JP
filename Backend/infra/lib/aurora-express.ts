import { Names, Stack } from "aws-cdk-lib";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

export type AuroraExpressProps = {
  masterUsername?: string;
  minCapacity?: number;
  maxCapacity?: number;
};

const toIdentifier = (value: string, maxLength: number): string => {
  const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const compacted = normalized.replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (compacted.length <= maxLength) {
    return compacted;
  }
  return compacted.slice(0, maxLength).replace(/-+$/g, "");
};

/**
 * Aurora PostgreSQL Serverless v2 with express configuration (VPC-less).
 * CloudFormation does not support WithExpressConfiguration yet, so we use
 * AwsCustomResource to call the RDS API directly.
 */
export class AuroraExpress extends Construct {
  public readonly clusterIdentifier: string;
  public readonly instanceIdentifier: string;
  public readonly endpointHostname: string;
  public readonly endpointPort: string;
  public readonly clusterArn: string;
  public readonly dbClusterResourceId: string;

  constructor(scope: Construct, id: string, props: AuroraExpressProps = {}) {
    super(scope, id);

    const minCapacity = props.minCapacity ?? 0.5;
    const maxCapacity = props.maxCapacity ?? 2;
    const masterUsername = props.masterUsername ?? "postgres";

    const baseIdentifier = toIdentifier(Names.uniqueId(this), 63);
    this.clusterIdentifier = toIdentifier(`${baseIdentifier}-aurora`, 52);
    this.instanceIdentifier = `${this.clusterIdentifier}-instance-1`;

    const clusterResource = new AwsCustomResource(this, "ExpressCluster", {
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "ec2:DescribeAvailabilityZones",
            "iam:CreateServiceLinkedRole",
            "rds:CreateDBCluster",
            "rds:CreateDBInstance",
            "rds:DeleteDBCluster",
            "rds:DescribeDBClusters",
            "rds:EnableInternetAccessGateway",
          ],
          resources: ["*"],
        }),
      ]),
      installLatestAwsSdk: true,
      onCreate: {
        service: "RDS",
        action: "createDBCluster",
        physicalResourceId: PhysicalResourceId.of(this.clusterIdentifier),
        parameters: {
          DBClusterIdentifier: this.clusterIdentifier,
          Engine: "aurora-postgresql",
          MasterUsername: masterUsername,
          WithExpressConfiguration: true,
          ServerlessV2ScalingConfiguration: {
            MinCapacity: minCapacity,
            MaxCapacity: maxCapacity,
          },
        },
      },
      onUpdate: {
        service: "RDS",
        action: "describeDBClusters",
        physicalResourceId: PhysicalResourceId.of(this.clusterIdentifier),
        parameters: {
          DBClusterIdentifier: this.clusterIdentifier,
        },
      },
      onDelete: {
        service: "RDS",
        action: "deleteDBCluster",
        physicalResourceId: PhysicalResourceId.of(this.clusterIdentifier),
        parameters: {
          DBClusterIdentifier: this.clusterIdentifier,
          DeleteAutomatedBackups: true,
          SkipFinalSnapshot: true,
        },
      },
    });

    const clusterLookup = new AwsCustomResource(this, "ExpressClusterLookup", {
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["rds:DescribeDBClusters"],
          resources: ["*"],
        }),
      ]),
      installLatestAwsSdk: true,
      onCreate: {
        service: "RDS",
        action: "describeDBClusters",
        physicalResourceId: PhysicalResourceId.of(
          `${this.clusterIdentifier}-lookup`,
        ),
        parameters: {
          DBClusterIdentifier: this.clusterIdentifier,
        },
      },
      onUpdate: {
        service: "RDS",
        action: "describeDBClusters",
        physicalResourceId: PhysicalResourceId.of(
          `${this.clusterIdentifier}-lookup`,
        ),
        parameters: {
          DBClusterIdentifier: this.clusterIdentifier,
        },
      },
    });
    clusterLookup.node.addDependency(clusterResource);

    const instanceCleanup = new AwsCustomResource(this, "ExpressInstanceCleanup", {
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "rds:DeleteDBInstance",
            "rds:DescribeDBInstances",
            "rds:DescribeDBClusters",
          ],
          resources: ["*"],
        }),
      ]),
      installLatestAwsSdk: true,
      onCreate: {
        service: "RDS",
        action: "describeDBClusters",
        physicalResourceId: PhysicalResourceId.of(
          `${this.clusterIdentifier}-instance-cleanup`,
        ),
        parameters: {
          DBClusterIdentifier: this.clusterIdentifier,
        },
      },
      onUpdate: {
        service: "RDS",
        action: "describeDBClusters",
        physicalResourceId: PhysicalResourceId.of(
          `${this.clusterIdentifier}-instance-cleanup`,
        ),
        parameters: {
          DBClusterIdentifier: this.clusterIdentifier,
        },
      },
      onDelete: {
        service: "RDS",
        action: "deleteDBInstance",
        physicalResourceId: PhysicalResourceId.of(
          `${this.clusterIdentifier}-instance-cleanup`,
        ),
        parameters: {
          DBInstanceIdentifier: this.instanceIdentifier,
          DeleteAutomatedBackups: true,
          SkipFinalSnapshot: true,
        },
      },
    });
    instanceCleanup.node.addDependency(clusterResource);

    this.endpointHostname = clusterLookup.getResponseField(
      "DBClusters.0.Endpoint",
    );
    this.endpointPort = clusterLookup.getResponseField(
      "DBClusters.0.Port",
    );
    this.clusterArn = clusterLookup.getResponseField("DBClusters.0.DBClusterArn");
    this.dbClusterResourceId = clusterLookup.getResponseField(
      "DBClusters.0.DbClusterResourceId",
    );

    Stack.of(this).exportValue(this.endpointHostname);
  }
}
