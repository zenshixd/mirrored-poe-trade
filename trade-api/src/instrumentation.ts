import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from "@opentelemetry/sdk-metrics";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { AWSXRayPropagator } from "@opentelemetry/propagator-aws-xray";
import { AWSXRayIdGenerator } from "@opentelemetry/id-generator-aws-xray";
import { detectResourcesSync, Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { AwsInstrumentation } from "@opentelemetry/instrumentation-aws-sdk";
import { awsEcsDetector } from "@opentelemetry/resource-detector-aws";

const resource = detectResourcesSync({
  detectors: [awsEcsDetector],
});
const sdk = new NodeSDK({
  resource: Resource.default()
    .merge(resource)
    .merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: "mirrored-poe-trade-updater",
      }),
    ),
  idGenerator: new AWSXRayIdGenerator(),
  textMapPropagator: new AWSXRayPropagator(),
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(),
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new AwsInstrumentation({
      suppressInternalInstrumentation: true,
    }),
  ],
});

sdk.start();
