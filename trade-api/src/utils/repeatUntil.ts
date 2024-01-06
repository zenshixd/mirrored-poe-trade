export function repeatUntil(
  condition: () => boolean,
  fn: () => Promise<any>,
  repeatDelay: number,
) {
  const runner = async () => {
    try {
      await fn();
    } catch (e) {
      console.error(e);
    }

    if (condition()) {
      setTimeout(runner, repeatDelay);
    }
  };

  runner();
}
