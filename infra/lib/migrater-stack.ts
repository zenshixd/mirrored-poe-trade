import * as cdk from "aws-cdk-lib";
import { StackProps } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { Cluster } from "aws-cdk-lib/aws-ecs";
import { DatabaseSecret } from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { AppContainers } from "./constructs/app-containers";

export interface MigraterStackProps extends StackProps {
  vpc: Vpc;
  repository: Repository;
  databaseCredentials: DatabaseSecret;
}

export class MigraterStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MigraterStackProps) {
    super(scope, id, props);

    const { vpc, repository, databaseCredentials } = props;
    const cluster = new Cluster(this, "MigraterCluster", {
      vpc,
      enableFargateCapacityProviders: true,
      containerInsights: true,
    });

    const mptDbCredentials = Secret.fromSecretNameV2(
      this,
      "MptDbCredentials",
      "DBPassword67313E91-Yf4OwPHiNmWa",
    );
    const scrapperDbCredentials = Secret.fromSecretNameV2(
      this,
      "ScrapperDbCredentials",
      "mirrored-poe-trade/scrapperdb-credentials",
    );
    new AppContainers(this, "MigraterContainers", {
      vpc,
      cluster,
      repository,
      mptDbCredentials,
      scrapperDbCredentials,
      containers: [
        {
          name: "Migrater",
          command: ["bun", "run", "migrater.js"],
          port: 8080,
        },
      ],
    });
  }
}
