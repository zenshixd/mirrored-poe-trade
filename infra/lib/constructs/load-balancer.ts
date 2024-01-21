import { Construct } from "constructs";
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
  IApplicationLoadBalancerTarget,
  ListenerAction,
  Protocol,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { Duration } from "aws-cdk-lib";
import { ARecord, IHostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { LoadBalancerTarget } from "aws-cdk-lib/aws-route53-targets";

export interface LoadBalancerProps {
  vpc: Vpc;
  target: IApplicationLoadBalancerTarget;
  hostedZone: IHostedZone;
  recordName: string;
}

export class LoadBalancer extends Construct {
  constructor(scope: Construct, id: string, props: LoadBalancerProps) {
    super(scope, id);

    const { vpc, target, recordName, hostedZone } = props;

    const alb = new ApplicationLoadBalancer(this, "ALB", {
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
      targets: [target],
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

    new ARecord(this, "DNSRecord", {
      zone: hostedZone,
      target: RecordTarget.fromAlias(new LoadBalancerTarget(alb)),
      recordName,
    });
  }
}
