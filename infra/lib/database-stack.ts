import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { CustomDatabaseInstance } from "./constructs/custom-database-instance";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import {
  AuroraMysqlEngineVersion,
  CaCertificate,
  ClusterInstance,
  Credentials,
  DatabaseCluster,
  DatabaseClusterEngine,
  DatabaseSecret,
} from "aws-cdk-lib/aws-rds";

export interface DatabaseStackProps extends StackProps {
  vpc: Vpc;
  hostedZoneId: string;
  zoneName: string;
}

export class DatabaseStack extends Stack {
  credentials: DatabaseSecret;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);
    const { vpc, zoneName, hostedZoneId } = props;

    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
      hostedZoneId,
      zoneName,
    });
    new CustomDatabaseInstance(this, "ScrapperDb", {
      vpc,
      hostedZone,
      recordName: "scrapperdb.mirroredpoe.trade",
      publicKey:
        "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCWTAs9YCChtHxRmBEozJJUQLGmCoN7tqHjf+t6gE19JbIrgXmUqm9LciBOPjS9hFsmy5YPPHeFr+2s457fQU47x+7WrWWdBL0mlRi9fqzmBAcdJlx8vImuOmaDnowB/qBd2TZ5MoMWBTQa+Zz5m2qFGxSAfgrpARTDnvtilOxfO88sKLzJ56HpQfGnORh2COPml1bSNeCTwacPtP63t+r6CrN8iWX/pKw62pjUXrlzSWbisf2B7BWDEyVBO2Ish9tHadTHDvMWzDKkZ0RwLYQXB6tDUhknpQk5ZqjK6ITZwmF9Q0UEZdhVTD5scXt7ZYj2jl2SMNXPlzgS9O6GPPA3 mirrored-poe-trade-db-instance",
      volumeSize: 2000,
    });

    const databaseName = "MirroredPoeTrade";
    this.credentials = new DatabaseSecret(this, "DBPassword", {
      username: "admin",
      dbname: databaseName,
    });

    const rdsSecurityGroup = new SecurityGroup(this, "RdsSecurityGroup", {
      vpc,
    });
    rdsSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(3306));

    new DatabaseCluster(this, "Rds", {
      securityGroups: [rdsSecurityGroup],
      credentials: Credentials.fromSecret(this.credentials),
      defaultDatabaseName: databaseName,
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
      },
      writer: ClusterInstance.provisioned("Writer", {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        publiclyAccessible: true,
        caCertificate: CaCertificate.RDS_CA_RDS2048_G1,
        enablePerformanceInsights: true,
      }),
      engine: DatabaseClusterEngine.auroraMysql({
        version: AuroraMysqlEngineVersion.VER_3_04_0,
      }),
      deletionProtection: true,
    });
  }
}
