import { ECS, TaskDefinitionField } from "@aws-sdk/client-ecs";

const argv = process.argv.slice(2);
const newImage = argv[0];

const ecs = new ECS({
  region: "eu-central-1",
});

const CLUSTER_NAME = "mpt-updater-AppCluster99B78AC1-5x0HReD4uZ3G";
const TASK_DEF_NAME = "MirroredPoeTradeUpdaterContainersTaskDefinitionFE1F35E6";

async function updateServices() {
  console.log(`Retrieving latest ${TASK_DEF_NAME} task definition ...`);
  const taskDef = await ecs.describeTaskDefinition({
    taskDefinition: TASK_DEF_NAME,
    include: [TaskDefinitionField.TAGS],
  });

  if (!taskDef.taskDefinition) {
    throw new Error(`Couldnt find ${TASK_DEF_NAME} task definition!`);
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
    family: TASK_DEF_NAME,
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
      `Something went wrong with registering new revision for ${TASK_DEF_NAME}!`,
    );
  }

  const servicesList = await ecs.listServices({
    cluster: CLUSTER_NAME,
  });
  const { services } = await ecs.describeServices({
    cluster: CLUSTER_NAME,
    services: servicesList.serviceArns,
  });

  await services?.reduce(async (promise, service) => {
    await promise;
    console.log(`Updating service ${service.serviceName} ...`);
    await ecs.updateService({
      cluster: CLUSTER_NAME,
      service: service.serviceName,
      taskDefinition: result.taskDefinition!.taskDefinitionArn,
      forceNewDeployment: true,
    });
    console.log(`Service ${service.serviceName} update complete!`);
  }, Promise.resolve());
}

await updateServices();
