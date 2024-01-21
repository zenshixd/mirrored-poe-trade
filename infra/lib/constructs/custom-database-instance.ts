import { Construct } from "constructs";
import {
  AmazonLinuxCpuType,
  BlockDeviceVolume,
  CfnKeyPair,
  EbsDeviceVolumeType,
  Instance,
  InstanceClass,
  InstanceSize,
  InstanceType,
  MachineImage,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { ARecord, IHostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";

export interface CustomDatabaseInstanceProps {
  vpc: Vpc;

  hostedZone: IHostedZone;
  recordName: string;

  publicKey: string;
  volumeSize: number;
}

export class CustomDatabaseInstance extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: CustomDatabaseInstanceProps,
  ) {
    super(scope, id);

    const { vpc, hostedZone, recordName, publicKey, volumeSize } = props;
    const instanceSg = new SecurityGroup(this, "InstanceSecurityGroup", {
      vpc,
      allowAllOutbound: true,
    });
    instanceSg.addIngressRule(Peer.anyIpv4(), Port.tcp(22));
    instanceSg.addIngressRule(Peer.anyIpv4(), Port.tcp(3306));

    const keyPair = new CfnKeyPair(this, "Key", {
      keyName: "mirrored-poe-trade-db-instance",
      publicKeyMaterial: publicKey,
    });
    const instance = new Instance(this, "RdsInstance", {
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
      },
      keyName: keyPair.ref,
      securityGroup: instanceSg,
      associatePublicIpAddress: true,
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.SMALL),
      requireImdsv2: true,
      machineImage: MachineImage.latestAmazonLinux2({
        cpuType: AmazonLinuxCpuType.ARM_64,
      }),
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: BlockDeviceVolume.ebs(8, {
            volumeType: EbsDeviceVolumeType.GP3,
          }),
        },
        {
          deviceName: "/dev/sdb",
          volume: BlockDeviceVolume.ebs(volumeSize, {
            volumeType: EbsDeviceVolumeType.SC1,
            deleteOnTermination: false,
          }),
        },
      ],
    });

    new ARecord(this, "DatabaseRecord", {
      recordName,
      zone: hostedZone,
      target: RecordTarget.fromIpAddresses(instance.instancePublicIp),
    });
  }
}
