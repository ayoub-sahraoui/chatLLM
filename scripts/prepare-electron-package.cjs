const fs = require("fs");
const path = require("path");

// Create a modified package.json for the electron build
const packageJson = require("../package.json");
const electronPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  main: "./electron.cjs",
  type: "commonjs", // Explicitly force CommonJS for Electron
  dependencies: packageJson.dependencies,
};

// Ensure build directory exists
const buildDir = path.join(__dirname, "../build");
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Write the package.json for electron build
fs.writeFileSync(
  path.join(buildDir, "package.json"),
  JSON.stringify(electronPackageJson, null, 2)
);

// Also create a package.json at the project root for the bundled app
fs.writeFileSync(
  path.join(__dirname, "../app-package.json"),
  JSON.stringify(
    {
      name: packageJson.name,
      version: packageJson.version,
      type: "commonjs",
    },
    null,
    2
  )
);

// Create an environment file for the React app
const envFilePath = path.join(__dirname, "../build/.env.production");
fs.writeFileSync(envFilePath, `PUBLIC_URL=./\nHOMEPAGE=./\n`);
console.log("Created environment file for production build");

console.log("Created Electron-compatible package.json files");
