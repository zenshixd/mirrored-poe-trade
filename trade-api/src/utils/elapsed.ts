export function elapsed(startTime: bigint): bigint {
  return (process.hrtime.bigint() - startTime) / 1_000_000n;
}
