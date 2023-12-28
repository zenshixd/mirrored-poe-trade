import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Repository } from "aws-cdk-lib/aws-ecr";
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
import { Duration } from "aws-cdk-lib";

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
    this.setupUpdater(vpc, hostedZone, databaseCredentials);
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
      }),
      engine: DatabaseClusterEngine.auroraMysql({
        version: AuroraMysqlEngineVersion.VER_3_04_0,
      }),
      serverlessV2MinCapacity: 10,
      serverlessV2MaxCapacity: 20,
    });

    return { databaseCredentials: password };
  }

  setupUpdater(
    vpc: IVpc,
    hostedZone: IHostedZone,
    databaseCredentials: DatabaseSecret,
  ) {
    const { service, updaterContainer } = this.setupUpdaterService(
      vpc,
      databaseCredentials,
    );
    const { alb, httpsListener } = this.setupUpdaterLoadBalancer(vpc);

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
        interval: Duration.seconds(5),
        protocol: Protocol.HTTP,
        port: "8080",
        path: "/",
        timeout: Duration.seconds(2),
      },
    });

    new ARecord(this, "UpdaterRecord", {
      zone: hostedZone,
      target: RecordTarget.fromAlias(new LoadBalancerTarget(alb)),
      recordName: "updater.mirroredpoe.trade",
    });
  }

  setupUpdaterService(vpc: IVpc, databaseCredentials: DatabaseSecret) {
    const repository = Repository.fromRepositoryArn(
      this,
      "AppRepo",
      "arn:aws:ecr:eu-central-1:032544014746:repository/mirrored-poe-trade",
    );

    const cluster = new Cluster(this, "AppCluster", {
      vpc,
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

    const updaterContainer = taskDefinition.addContainer("Updater", {
      image: ContainerImage.fromEcrRepository(
        repository,
        StringParameter.fromStringParameterName(
          this,
          "UpdaterVersion",
          "/mirrored-poe-trade/updater-version",
        ).stringValue,
      ),
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

    const serviceSg = new SecurityGroup(this, "AppSg", {
      vpc,
      allowAllOutbound: true,
    });
    serviceSg.addIngressRule(Peer.anyIpv4(), Port.tcp(8080));
    const service = new FargateService(this, "AppService", {
      cluster,
      taskDefinition,
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

    return { service, updaterContainer };
  }
  setupUpdaterLoadBalancer(vpc: IVpc) {
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

    return { alb, httpsListener };
  }
}
