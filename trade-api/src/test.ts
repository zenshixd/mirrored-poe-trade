console.log(
  "Heap used",
  (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
  "MB",
);

const randomNumber = () =>
  Math.floor(1_000_000 + Math.random() * 1_000_000_000);
const rand = () =>
  `${randomNumber()}-${randomNumber()}-${randomNumber()}-${randomNumber()}-${randomNumber()}`;
const arr = Array(1_000_000)
  .fill(1)
  .map((_) => rand());

setTimeout(() => console.log(arr.length, arr[0]), 1000);

console.log(
  "Heap used",
  (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
  "MB",
);
