const builder = require("electron-builder");
const Platform = builder.Platform;
const fs = require("fs");
const path = require("path");

// Create dist directory if it doesn't exist
const distPath = path.join(__dirname, "dist");
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
  console.log(`Created dist directory at: ${distPath}`);
}

// Determine the target platform based on process arguments
const isMac = process.argv.includes("-m") || process.argv.includes("--mac");
const isWin = process.argv.includes("-w") || process.argv.includes("--win");
const buildAll = process.argv.includes("-mw") || (!isMac && !isWin);

// Print current working directory for debugging
console.log(`Current working directory: ${process.cwd()}`);
console.log(`Script directory: ${__dirname}`);
console.log(
  `Building for: ${isMac ? "Mac" : ""}${buildAll ? "Mac & Windows" : ""}${
    isWin ? "Windows" : ""
  }`
);

// Read package.json to get build configuration
const packageJson = require("./package.json");
const buildConfig = packageJson.build || {};

// Promise is returned
builder
  .build({
    targets: buildAll
      ? Platform.ALL.createTarget()
      : isMac
      ? Platform.MAC.createTarget()
      : Platform.WINDOWS.createTarget(),
    config: buildConfig, // Use configuration from package.json
  })
  .then((result) => {
    console.log(JSON.stringify(result));
    const outputPath = path.resolve(
      __dirname,
      buildConfig.directories?.output || "dist"
    );
    console.log(
      `Build completed. Your executable should be at: "${outputPath}"`
    );

    // Check if output directory exists
    if (fs.existsSync(outputPath)) {
      console.log(`✓ Found output directory: ${outputPath}`);
      console.log("Contents:");
      fs.readdirSync(outputPath).forEach((file) => {
        console.log(` - ${file}`);

        // If it's a directory, show its contents too
        const filePath = path.join(outputPath, file);
        if (fs.statSync(filePath).isDirectory()) {
          fs.readdirSync(filePath).forEach((subFile) => {
            console.log(`   • ${subFile}`);
          });
        }
      });
    } else {
      console.log(`✗ Output directory not found: ${outputPath}`);
    }
  })
  .catch((error) => {
    console.error("Build failed with error:", error);
  });
