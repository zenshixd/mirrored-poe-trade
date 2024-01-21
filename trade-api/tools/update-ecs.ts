import { ECS, TaskDefinitionField } from "@aws-sdk/client-ecs";

const argv = process.argv.slice(2);
const newImage = argv[0];

const ecs = new ECS({
  region: "eu-central-1",
});

const CLUSTER_NAME = "MirroredPoeTradeStack-AppCluster99B78AC1-yCT0BbUigAFO";

const SCRAPPER_SERVICE_NAME =
  "MirroredPoeTradeStack-ScrapperService902F264B-ICnafs7nZ17o";
const SCRAPPER_TASK_DEF_NAME =
  "MirroredPoeTradeStackScrapperTaskDefinition74B6103D";

const UPDATER_SERVICE_NAME =
  "MirroredPoeTradeStack-UpdaterServiceF1B6C658-WAGiUNZqJlps";
const UPDATER_TASK_DEF_NAME =
  "MirroredPoeTradeStackUpdaterTaskDefinition10B9EFD8";

async function updateService(serviceName: string, taskDefName: string) {
  console.log(`Retrieving latest ${taskDefName} task definition ...`);
  const taskDef = await ecs.describeTaskDefinition({
    taskDefinition: taskDefName,
    include: [TaskDefinitionField.TAGS],
  });

  if (!taskDef.taskDefinition) {
    throw new Error(`Couldnt find ${taskDefName} task definition!`);
  }

  console.log(
    `Found task definition: ${taskDef.taskDefinition.family}:${taskDef.taskDefinition.revision}`,
  );

  const {
    networkMode,
    memory,
    cpu,
    containerDefinitions,
    requiresCompatibilities,
    runtimePlatform,
    pidMode,
    proxyConfiguration,
    placementConstraints,
    ipcMode,
    volumes,
    inferenceAccelerators,
    executionRoleArn,
    taskRoleArn,
    ephemeralStorage,
  } = taskDef.taskDefinition;

  console.log(
    `Creating new task definition with image ${newImage}...`,
    taskDef.tags,
  );
  const result = await ecs.registerTaskDefinition({
    family: taskDefName,
    networkMode,
    memory,
    cpu,
    ipcMode,
    volumes,
    inferenceAccelerators,
    requiresCompatibilities,
    executionRoleArn,
    pidMode,
    taskRoleArn,
    proxyConfiguration,
    placementConstraints,
    containerDefinitions: containerDefinitions!.map((containerDef) => ({
      ...containerDef,
      image: newImage,
    })),
    ephemeralStorage,
    runtimePlatform,
  });

  if (!result.taskDefinition) {
    throw new Error(
      `Something went wrong with registering new revision for ${taskDefName}!`,
    );
  }

  console.log(`Updating service ${serviceName} ...`);
  await ecs.updateService({
    cluster: CLUSTER_NAME,
    service: serviceName,
    taskDefinition: result.taskDefinition!.taskDefinitionArn,
    forceNewDeployment: true,
  });
  console.log(`Service ${serviceName} update complete!`);
}
