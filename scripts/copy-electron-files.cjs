const fs = require("fs");
const path = require("path");

// Source and destination paths
const electronSrc = path.join(__dirname, "../src/electron.cjs");
const preloadSrc = path.join(__dirname, "../src/preload.cjs");
const electronDest = path.join(__dirname, "../build/electron.cjs");
const preloadDest = path.join(__dirname, "../build/preload.cjs");

// Ensure build directory exists
const buildDir = path.join(__dirname, "../build");
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Copy electron.cjs
fs.copyFileSync(electronSrc, electronDest);
console.log(`Successfully copied electron files to build directory`);

// Check if preload.cjs exists, otherwise look for preload.js
if (fs.existsSync(preloadSrc)) {
  fs.copyFileSync(preloadSrc, preloadDest);
  console.log(`Successfully copied preload.cjs to build directory`);
} else {
  // Try to copy preload.js if preload.cjs doesn't exist
  const preloadJsSrc = path.join(__dirname, "../src/preload.js");
  if (fs.existsSync(preloadJsSrc)) {
    fs.copyFileSync(preloadJsSrc, preloadDest);
    console.log(
      `Successfully copied preload.js to build directory as preload.cjs`
    );
  } else {
    console.warn(
      `Warning: No preload script found at ${preloadSrc} or ${preloadJsSrc}`
    );
  }
}
