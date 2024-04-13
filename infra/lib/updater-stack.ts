import * as cdk from "aws-cdk-lib";
import { StackProps } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { Cluster } from "aws-cdk-lib/aws-ecs";
import { DatabaseSecret } from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { AppContainers } from "./constructs/app-containers";

export interface MirroredPoeTradeStackProps extends StackProps {
  vpc: Vpc;
  repository: Repository;
  hostedZoneId: string;
  zoneName: string;
  databaseCredentials: DatabaseSecret;
}

export class UpdaterStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MirroredPoeTradeStackProps) {
    super(scope, id, props);

    const { vpc, repository, hostedZoneId, zoneName, databaseCredentials } =
      props;
    // const hostedZone = HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
    //   hostedZoneId,
    //   zoneName,
    // });
    const cluster = new Cluster(this, "AppCluster", {
      vpc,
      enableFargateCapacityProviders: true,
      containerInsights: true,
    });

    const scrapperDbCredentials = Secret.fromSecretNameV2(
      this,
      "ScrapperDbCredentials",
      "mirrored-poe-trade/scrapperdb-credentials",
    );

    new AppContainers(this, "Containers", {
      vpc,
      cluster,
      repository,
      scrapperDbCredentials,
      mptDbCredentials: databaseCredentials,
      containers: [
        {
          name: "Updater",
          command: ["bun", "run", "updater.js"],
          port: 8080,
        },
        {
          name: "Scrapper",
          command: ["bun", "run", "scrapper.js"],
          port: 8081,
        },
      ],
    });
    // new LoadBalancer(this, "LoadBalancer", {
    //   vpc,
    //   hostedZone,
    //   recordName: "updater.mirroredpoe.trade",
    //   target: service.loadBalancerTarget({
    //     containerName: "Updater",
    //     containerPort: 8080,
    //   }),
    // });
  }
}
