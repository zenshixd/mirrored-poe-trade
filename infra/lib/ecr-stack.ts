import { Construct } from "constructs";
import { Stack, StackProps } from "aws-cdk-lib";
import { Repository } from "aws-cdk-lib/aws-ecr";

export class EcrStack extends Stack {
  public repository: Repository;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.repository = new Repository(this, "Repository", {
      repositoryName: "mirrored-poe-trade-app",
    });
  }
}
