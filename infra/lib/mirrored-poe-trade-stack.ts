import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { AttributeType, Billing, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Service, Source } from "@aws-cdk/aws-apprunner-alpha";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

export class MirroredPoeTradeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const tableName = "MirroredPoeTradeV2";
    this.setupDdb(tableName);
    this.setupAppRunner(tableName);
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

  setupAppRunner(tableName: string) {
    const repository = Repository.fromRepositoryArn(
      this,
      "AppRepo",
      "arn:aws:ecr:eu-central-1:032544014746:repository/mirrored-poe-trade",
    );
    const service = new Service(this, "App", {
      autoDeploymentsEnabled: true,
      source: Source.fromEcr({
        repository,
        tagOrDigest: "latest",
        imageConfiguration: {
          port: 8080,
          environmentVariables: {
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
        },
      }),
    });
    service.addToRolePolicy(
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
  }
}
