export async function bump(type: "patch" | "minor" | "major") {
	const pckgJson = await Bun.file(`${import.meta.dir}/../package.json`).json();
	const [major, minor, patch] = pckgJson.version.split(".").map(Number);

	switch (type) {
		case "patch":
			return [major, minor, patch + 1].join(".");
		case "minor":
			return [major, minor + 1, patch].join(".");
		case "major":
			return [major + 1, minor, patch].join(".");
		default:
			throw new Error(
				'Unknown bump type! Requires "major", "minor" or "patch"!',
			);
	}
}
