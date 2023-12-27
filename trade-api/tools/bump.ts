async function bump() {
  const args = process.argv.slice(2);
  const pckgJson = await Bun.file(import.meta.dir + "/../package.json").json();
  const [major, minor, patch] = pckgJson.version.split(".").map(Number);

  switch (args[0]) {
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

console.log(await bump());
