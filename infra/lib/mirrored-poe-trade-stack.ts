import * as cdk from "aws-cdk-lib";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { IRepository, Repository } from "aws-cdk-lib/aws-ecr";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import {
  IVpc,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import {
  Cluster,
  ContainerDefinition,
  ContainerImage,
  CpuArchitecture,
  FargateService,
  FargateTaskDefinition,
  LogDriver,
  OperatingSystemFamily,
  Secret,
} from "aws-cdk-lib/aws-ecs";
import {
  AuroraMysqlEngineVersion,
  CaCertificate,
  ClusterInstance,
  Credentials,
  DatabaseCluster,
  DatabaseClusterEngine,
  DatabaseSecret,
} from "aws-cdk-lib/aws-rds";
import {
  ARecord,
  HostedZone,
  IHostedZone,
  RecordTarget,
} from "aws-cdk-lib/aws-route53";
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
  ListenerAction,
  Protocol,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { LoadBalancerTarget } from "aws-cdk-lib/aws-route53-targets";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
} from "aws-cdk-lib/aws-s3";

const HOSTED_ZONE_PROPS = {
  hostedZoneId: "Z00479621N6MBUR4DJCZM",
  zoneName: "mirroredpoe.trade",
};
const VPC_ID = "vpc-0a33f19ac08c32737";

export class MirroredPoeTradeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const vpc = Vpc.fromLookup(this, "Vpc", {
      vpcId: VPC_ID,
    });
    const hostedZone = HostedZone.fromHostedZoneAttributes(
      this,
      "HostedZone",
      HOSTED_ZONE_PROPS,
    );

    const tableName = "MirroredPoeTradeV2";
    const { databaseCredentials } = this.setupRds(vpc, tableName);
    const bucket = new Bucket(this, "PublicStashesBucket", {
      bucketName: "mirrored-poe-trade-public-stashes",
      publicReadAccess: false,
      versioned: false,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    this.setupEcsCluster(vpc, hostedZone, databaseCredentials, bucket);
  }

  setupRds(vpc: IVpc, databaseName: string) {
    const password = new DatabaseSecret(this, "DBPassword", {
      username: "admin",
      dbname: databaseName,
    });
    new DatabaseCluster(this, "Rds", {
      credentials: Credentials.fromSecret(password),
      defaultDatabaseName: databaseName,
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
      },
      writer: ClusterInstance.serverlessV2("Writer", {
        publiclyAccessible: true,
        caCertificate: CaCertificate.RDS_CA_RDS2048_G1,
        enablePerformanceInsights: true,
      }),
      engine: DatabaseClusterEngine.auroraMysql({
        version: AuroraMysqlEngineVersion.VER_3_04_0,
      }),
      serverlessV2MinCapacity: 1,
      serverlessV2MaxCapacity: 10,
    });

    return { databaseCredentials: password };
  }

  setupEcsCluster(
    vpc: IVpc,
    hostedZone: IHostedZone,
    databaseCredentials: DatabaseSecret,
    publicStashesBucket: Bucket,
  ) {
    const repository = Repository.fromRepositoryArn(
      this,
      "AppRepo",
      "arn:aws:ecr:eu-central-1:032544014746:repository/mirrored-poe-trade",
    );
    const cluster = new Cluster(this, "AppCluster", {
      vpc,
      enableFargateCapacityProviders: true,
      containerInsights: true,
    });

    const { updaterService, updaterContainer, updaterTaskDef } =
      this.setupUpdaterService(vpc, cluster, repository, databaseCredentials);
    const { scrapperTaskDef, scrapperService, scrapperContainer } =
      this.setupScrapperService(vpc, cluster, repository, databaseCredentials);
    this.setupUpdaterLoadBalancer(
      vpc,
      updaterService,
      updaterContainer,
      hostedZone,
    );

    publicStashesBucket.grantReadWrite(updaterTaskDef.taskRole);
    publicStashesBucket.grantReadWrite(scrapperTaskDef.taskRole);
  }

  setupUpdaterService(
    vpc: IVpc,
    cluster: Cluster,
    repository: IRepository,
    databaseCredentials: DatabaseSecret,
  ) {
    const updaterTaskDef = new FargateTaskDefinition(
      this,
      "UpdaterTaskDefinition",
      {
        memoryLimitMiB: 1024,
        runtimePlatform: {
          cpuArchitecture: CpuArchitecture.X86_64,
          operatingSystemFamily: OperatingSystemFamily.LINUX,
        },
      },
    );

    const taskVersion = StringParameter.fromStringParameterName(
      this,
      "UpdaterVersion",
      "/mirrored-poe-trade/version",
    ).stringValue;
    const poeClientId = StringParameter.fromStringParameterName(
      this,
      "UpdaterPoeClientId",
      "/mirrored-poe-trade/poe-client-id",
    ).stringValue;
    const poeClientSecret = StringParameter.fromStringParameterName(
      this,
      "UpdaterPoeClientSecret",
      "/mirrored-poe-trade/poe-client-secret",
    ).stringValue;
    const updaterContainer = updaterTaskDef.addContainer("Updater", {
      image: ContainerImage.fromEcrRepository(repository, taskVersion),
      command: ["bun", "run", "updater.js"],
      essential: true,
      logging: LogDriver.awsLogs({
        streamPrefix: "/mirroredpoetrade",
      }),
      environment: {
        poe_client_id: poeClientId,
        poe_client_secret: poeClientSecret,
      },
      secrets: {
        DATABASE_HOST: Secret.fromSecretsManager(databaseCredentials, "host"),
        DATABASE_USERNAME: Secret.fromSecretsManager(
          databaseCredentials,
          "username",
        ),
        DATABASE_PASSWORD: Secret.fromSecretsManager(
          databaseCredentials,
          "password",
        ),
        DATABASE_SCHEMA: Secret.fromSecretsManager(
          databaseCredentials,
          "dbname",
        ),
      },
      portMappings: [
        {
          containerPort: 8080,
        },
      ],
    });

    const serviceSg = new SecurityGroup(this, "UpdaterSg", {
      vpc,
      allowAllOutbound: true,
    });
    serviceSg.addIngressRule(Peer.anyIpv4(), Port.tcp(8080));
    const updaterService = new FargateService(this, "UpdaterService", {
      cluster,
      taskDefinition: updaterTaskDef,
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

    return {
      updaterService,
      updaterTaskDef,
      updaterContainer,
    };
  }
  setupScrapperService(
    vpc: IVpc,
    cluster: Cluster,
    repository: IRepository,
    databaseCredentials: DatabaseSecret,
  ) {
    const scrapperTaskDef = new FargateTaskDefinition(
      this,
      "ScrapperTaskDefinition",
      {
        memoryLimitMiB: 1024,
        runtimePlatform: {
          cpuArchitecture: CpuArchitecture.X86_64,
          operatingSystemFamily: OperatingSystemFamily.LINUX,
        },
      },
    );

    const taskVersion = StringParameter.fromStringParameterName(
      this,
      "ScrapperVersion",
      "/mirrored-poe-trade/version",
    ).stringValue;
    const poeClientId = StringParameter.fromStringParameterName(
      this,
      "ScrapperPoeClientId",
      "/mirrored-poe-trade/poe-client-id",
    ).stringValue;
    const poeClientSecret = StringParameter.fromStringParameterName(
      this,
      "ScrapperPoeClientSecret",
      "/mirrored-poe-trade/poe-client-secret",
    ).stringValue;
    const scrapperContainer = scrapperTaskDef.addContainer("Scrapper", {
      image: ContainerImage.fromEcrRepository(repository, taskVersion),
      command: ["bun", "run", "scrapper.js"],
      essential: true,
      logging: LogDriver.awsLogs({
        streamPrefix: "/mirroredpoetrade",
      }),
      environment: {
        poe_client_id: poeClientId,
        poe_client_secret: poeClientSecret,
      },
      secrets: {
        DATABASE_HOST: Secret.fromSecretsManager(databaseCredentials, "host"),
        DATABASE_USERNAME: Secret.fromSecretsManager(
          databaseCredentials,
          "username",
        ),
        DATABASE_PASSWORD: Secret.fromSecretsManager(
          databaseCredentials,
          "password",
        ),
        DATABASE_SCHEMA: Secret.fromSecretsManager(
          databaseCredentials,
          "dbname",
        ),
      },
      portMappings: [
        {
          containerPort: 8081,
        },
      ],
    });

    const serviceSg = new SecurityGroup(this, "ScrapperSg", {
      vpc,
      allowAllOutbound: true,
    });
    serviceSg.addIngressRule(Peer.anyIpv4(), Port.tcp(8081));
    const scrapperService = new FargateService(this, "ScrapperService", {
      cluster,
      taskDefinition: scrapperTaskDef,
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

    return { scrapperService, scrapperTaskDef, scrapperContainer };
  }
  setupUpdaterLoadBalancer(
    vpc: IVpc,
    service: FargateService,
    updaterContainer: ContainerDefinition,
    hostedZone: IHostedZone,
  ) {
    const alb = new ApplicationLoadBalancer(this, "UpdaterALB", {
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
      },
      internetFacing: true,
    });

    const httpListener = alb.addListener("HttpListener", {
      protocol: ApplicationProtocol.HTTP,
      port: 80,
      defaultAction: ListenerAction.redirect({
        protocol: "HTTPS",
        port: "443",
        permanent: true,
      }),
    });

    const httpsListener = alb.addListener("HttpsListener", {
      protocol: ApplicationProtocol.HTTPS,
      port: 443,
      certificates: [
        Certificate.fromCertificateArn(
          this,
          "ALBCertificate",
          "arn:aws:acm:eu-central-1:032544014746:certificate/4c03e0c3-a0b5-412c-b9f4-181e21ba27ef",
        ),
      ],
    });

    httpsListener.addTargets("Default", {
      protocol: ApplicationProtocol.HTTP,
      port: 8080,
      targets: [
        service.loadBalancerTarget({
          containerName: updaterContainer.containerName,
          containerPort: 8080,
        }),
      ],
      healthCheck: {
        enabled: true,
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
        interval: Duration.seconds(60),
        protocol: Protocol.HTTP,
        port: "8080",
        path: "/",
        timeout: Duration.seconds(30),
      },
    });

    new ARecord(this, "UpdaterRecord", {
      zone: hostedZone,
      target: RecordTarget.fromAlias(new LoadBalancerTarget(alb)),
      recordName: "updater.mirroredpoe.trade",
    });
  }
}
