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

// Add or update the extraResources section to include required dependencies
buildConfig.extraResources = buildConfig.extraResources || [];

// Add the node_modules to extraResources
buildConfig.extraResources.push({
  from: "node_modules/electron-is-dev",
  to: "node_modules/electron-is-dev",
});

// Add configuration to properly include the preload script
buildConfig.extraResources = buildConfig.extraResources || [];

// Check if preload.cjs exists, otherwise fall back to preload.js
const preloadCjsPath = path.join(__dirname, "src/preload.cjs");
const preloadJsPath = path.join(__dirname, "src/preload.js");
const preloadExists = fs.existsSync(preloadCjsPath);
const preloadJsExists = fs.existsSync(preloadJsPath);

// Add the appropriate preload script to extraResources
if (preloadExists) {
  buildConfig.extraResources.push({
    from: "src/preload.cjs",
    to: "build/preload.cjs",
  });
} else if (preloadJsExists) {
  buildConfig.extraResources.push({
    from: "src/preload.js",
    to: "build/preload.cjs", // Save as .cjs in the build
  });
} else {
  console.warn(
    "Warning: No preload script found! Application may not work correctly."
  );
}

// Ensure we're using correct paths in the final build
buildConfig.files = buildConfig.files || [
  "build/**/*",
  "node_modules/**/*",
  "src/electron.cjs",
];

// Add the appropriate preload script to files
if (preloadExists) {
  buildConfig.files.push("src/preload.cjs");
} else if (preloadJsExists) {
  buildConfig.files.push("src/preload.js");
}

// Make sure the HTML file is in the correct location
console.log("Checking build directory for index.html...");
const indexHtmlPath = path.join(__dirname, "build/index.html");
if (fs.existsSync(indexHtmlPath)) {
  console.log(`Found index.html at: ${indexHtmlPath}`);
} else {
  console.warn(`Warning: index.html not found at ${indexHtmlPath}`);
}

// Set the path for where electron-builder should look for the built app
buildConfig.directories = buildConfig.directories || {};
buildConfig.directories.app = ".";

// Ensure the electron.cjs file is included in the build
if (!buildConfig.files.includes("build/electron.cjs")) {
  buildConfig.extraResources.push({
    from: "src/electron.cjs",
    to: "build/electron.cjs",
  });
}

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
