export function repeatUntil(
	condition: () => boolean,
	fn: () => Promise<unknown>,
	repeatDelay: number,
) {
	const { promise, resolve, reject } = Promise.withResolvers<void>();
	const runner = async () => {
		try {
			await fn();
		} catch (e) {
			reject(e);
		}

		if (condition()) {
			setTimeout(runner, repeatDelay);
		} else {
			resolve();
		}
	};

	runner();

	return promise;
}
