export async function versionBump(bumpType: string) {
  const pckgJson = await Bun.file("./package.json").json();
  const [major, minor, patch] = pckgJson.version.split(".").map(Number);

  switch (bumpType) {
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
