import {
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { IRepository } from "aws-cdk-lib/aws-ecr";
import {
  Cluster,
  ContainerImage,
  CpuArchitecture,
  FargateService,
  FargateTaskDefinition,
  LogDriver,
  OperatingSystemFamily,
  Secret as EcsSecret,
} from "aws-cdk-lib/aws-ecs";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";

export interface AppContainerProps {
  vpc: Vpc;
  repository: IRepository;
  cluster: Cluster;
  mptDbCredentials: ISecret;
  scrapperDbCredentials: ISecret;
  containers: {
    name: string;
    command: string[];
    port: number;
  }[];
}

export class AppContainers extends Construct {
  service: FargateService;

  constructor(scope: Construct, id: string, props: AppContainerProps) {
    super(scope, id);

    const {
      containers,
      vpc,
      repository,
      mptDbCredentials,
      scrapperDbCredentials,
      cluster,
    } = props;

    const taskDefinition = new FargateTaskDefinition(this, "TaskDefinition", {
      cpu: 1024,
      memoryLimitMiB: 4096,
      runtimePlatform: {
        cpuArchitecture: CpuArchitecture.X86_64,
        operatingSystemFamily: OperatingSystemFamily.LINUX,
      },
    });

    taskDefinition.addToTaskRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:*"],
        resources: ["*"],
      }),
    );

    const taskVersion = StringParameter.fromStringParameterName(
      this,
      "Version",
      "/mirrored-poe-trade/version",
    ).stringValue;
    const poeClientId = StringParameter.fromStringParameterName(
      this,
      "PoeClientId",
      "/mirrored-poe-trade/poe-client-id",
    ).stringValue;
    const poeClientSecret = StringParameter.fromStringParameterName(
      this,
      "PoeClientSecret",
      "/mirrored-poe-trade/poe-client-secret",
    ).stringValue;

    const serviceSg = new SecurityGroup(this, "SecurityGroup", {
      vpc,
      allowAllOutbound: true,
    });

    for (const container of containers) {
      taskDefinition.addContainer(container.name, {
        image: ContainerImage.fromEcrRepository(repository, taskVersion),
        command: container.command,
        essential: true,
        logging: LogDriver.awsLogs({
          streamPrefix: "/mirroredpoetrade",
        }),
        memoryLimitMiB: 2048,
        environment: {
          poe_client_id: poeClientId,
          poe_client_secret: poeClientSecret,
        },
        secrets: {
          SCRAPPER_DB_HOST: EcsSecret.fromSecretsManager(
            scrapperDbCredentials,
            "host",
          ),
          SCRAPPER_DB_USER: EcsSecret.fromSecretsManager(
            scrapperDbCredentials,
            "username",
          ),
          SCRAPPER_DB_PASS: EcsSecret.fromSecretsManager(
            scrapperDbCredentials,
            "password",
          ),
          SCRAPPER_DB_NAME: EcsSecret.fromSecretsManager(
            scrapperDbCredentials,
            "dbname",
          ),
          MPT_DB_HOST: EcsSecret.fromSecretsManager(mptDbCredentials, "host"),
          MPT_DB_USER: EcsSecret.fromSecretsManager(
            mptDbCredentials,
            "username",
          ),
          MPT_DB_PASS: EcsSecret.fromSecretsManager(
            mptDbCredentials,
            "password",
          ),
          MPT_DB_NAME: EcsSecret.fromSecretsManager(mptDbCredentials, "dbname"),
        },
        portMappings: [
          {
            containerPort: container.port,
          },
        ],
      });

      serviceSg.addIngressRule(Peer.anyIpv4(), Port.tcp(container.port));
    }

    this.service = new FargateService(this, "Service", {
      cluster,
      taskDefinition: taskDefinition,
      desiredCount: 1,
      minHealthyPercent: 0,
      maxHealthyPercent: 100,
      assignPublicIp: true,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
        availabilityZones: ["eu-central-1a"],
      },
      securityGroups: [serviceSg],
      circuitBreaker: {
        rollback: true,
      },
    });
  }
}
