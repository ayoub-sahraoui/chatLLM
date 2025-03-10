const fs = require("fs");
const path = require("path");

// Copy the preload script to the build directory
const srcPath = path.join(__dirname, "../src/preload.cjs");
const destPath = path.join(__dirname, "../build/preload.cjs");

// Ensure the build directory exists
const buildDir = path.join(__dirname, "../build");
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Copy the preload script
fs.copyFileSync(srcPath, destPath);
console.log(`Copied preload script to ${destPath}`);
