import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { AttributeType, Billing, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import {
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import {
  Cluster,
  ContainerImage,
  CpuArchitecture,
  FargateService,
  FargateTaskDefinition,
  LogDriver,
  OperatingSystemFamily,
} from "aws-cdk-lib/aws-ecs";

export class MirroredPoeTradeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const tableName = "MirroredPoeTradeV2";
    this.setupDdb(tableName);
    this.setupUpdater(tableName);
  }

  setupDdb(tableName: string) {
    new TableV2(this, "ddb", {
      tableName,
      partitionKey: {
        name: "pk",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: AttributeType.STRING,
      },
      billing: Billing.onDemand(),
      globalSecondaryIndexes: [
        {
          partitionKey: {
            name: "id",
            type: AttributeType.STRING,
          },
          indexName: "itemIdIndex",
        },
        {
          partitionKey: {
            name: "name",
            type: AttributeType.STRING,
          },
          indexName: "itemNameIndex",
        },
        {
          partitionKey: {
            name: "itemNameAndLeague",
            type: AttributeType.STRING,
          },
          indexName: "itemNameAndLeagueIndex",
        },
        {
          partitionKey: {
            name: "stash_id",
            type: AttributeType.STRING,
          },
          indexName: "stashIdIndex",
        },
        {
          partitionKey: {
            name: "stash_accountName",
            type: AttributeType.STRING,
          },
          indexName: "stashAccountNameIndex",
        },
        {
          partitionKey: {
            name: "stash_league",
            type: AttributeType.STRING,
          },
          indexName: "stashLeagueIndex",
        },
      ],
    });
  }

  setupUpdater(tableName: string) {
    const vpc = Vpc.fromLookup(this, "Vpc", {
      vpcId: "vpc-07763a753c871f39b",
    });
    const repository = Repository.fromRepositoryArn(
      this,
      "AppRepo",
      "arn:aws:ecr:eu-central-1:032544014746:repository/mirrored-poe-trade",
    );

    const cluster = new Cluster(this, "AppCluster", {
      vpc,
      clusterName: "MirroredPoeTrade",
      enableFargateCapacityProviders: true,
    });
    const taskDefinition = new FargateTaskDefinition(
      this,
      "AppTaskDefinition",
      {
        runtimePlatform: {
          cpuArchitecture: CpuArchitecture.X86_64,
          operatingSystemFamily: OperatingSystemFamily.LINUX,
        },
      },
    );
    // const collectorContainer = taskDefinition.addContainer("UpdaterCollector", {
    //   image: ContainerImage.fromRegistry(
    //     "public.ecr.aws/aws-observability/aws-otel-collector:v0.30.0",
    //   ),
    //   essential: true,
    //   logging: LogDriver.awsLogs({
    //     streamPrefix: "/mirroedpoetrade",
    //   }),
    //   command: [
    //     "--config=/etc/ecs/container-insights/otel-task-metrics-config.yaml",
    //   ],
    // });
    const updaterContainer = taskDefinition.addContainer("Updater", {
      image: ContainerImage.fromEcrRepository(repository, "latest"),
      essential: true,
      logging: LogDriver.awsLogs({
        streamPrefix: "/mirroredpoetrade",
      }),
      environment: {
        poe_client_id: StringParameter.fromStringParameterName(
          this,
          "PoeClientId",
          "/mirrored-poe-trade/poe-client-id",
        ).stringValue,
        poe_client_secret: StringParameter.fromStringParameterName(
          this,
          "PoeClientSecret",
          "/mirrored-poe-trade/poe-client-secret",
        ).stringValue,
      },
      portMappings: [
        {
          containerPort: 8080,
        },
      ],
    });
    // updaterContainer.addContainerDependencies({
    //   container: collectorContainer,
    //   condition: ContainerDependencyCondition.START,
    // });
    taskDefinition.addToTaskRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:Query",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
        ],
        resources: [
          this.formatArn({
            service: "dynamodb",
            resource: "table",
            resourceName: tableName,
          }),
          this.formatArn({
            service: "dynamodb",
            resource: "table",
            resourceName: tableName + "/*",
          }),
        ],
      }),
    );
    taskDefinition.addToTaskRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets",
          "xray:GetSamplingStatisticSummaries",
        ],
        resources: ["*"],
      }),
    );

    const serviceSg = new SecurityGroup(this, "AppSg", {
      vpc,
      allowAllOutbound: true,
    });
    serviceSg.addIngressRule(Peer.anyIpv4(), Port.tcp(80));
    serviceSg.addIngressRule(Peer.anyIpv4(), Port.tcp(8080));
    const service = new FargateService(this, "AppService", {
      serviceName: "Updater",
      cluster,
      taskDefinition,
      assignPublicIp: true,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
      },
      securityGroups: [serviceSg],
    });
  }
}
