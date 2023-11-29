export function* chunkify<T>(arr: T[], chunkSize: number): Generator<T[]> {
  const chunksNum = Math.ceil(arr.length / chunkSize);

  for (let i = 0; i < chunksNum; i++) {
    yield arr.slice(i * chunkSize, i * chunkSize + 25);
  }
}
