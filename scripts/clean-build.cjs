const path = require("path");
const fs = require("fs");
// Update rimraf import to handle different versions
let rimrafDelete;
try {
  // For rimraf v4+
  const rimraf = require("rimraf");
  rimrafDelete = rimraf.rimraf || rimraf.default || rimraf;
} catch (e) {
  // Fallback if rimraf can't be imported properly
  rimrafDelete = (path, options, callback) => {
    try {
      fs.rmSync(path, { recursive: true, force: true });
      callback(null);
    } catch (err) {
      callback(err);
    }
  };
}
const { execSync } = require("child_process");

// Path to the dist directory
const distPath = path.join(__dirname, "../dist");

console.log("Starting cleanup process...");

// Function to clean a directory with proper error handling
function cleanDirectory(directory) {
  return new Promise((resolve) => {
    console.log(`Removing directory: ${directory}`);

    // Try to kill any processes that might be locking files
    console.log("Checking for running processes...");
    try {
      console.log("Attempting to kill any processes that might lock files...");
      execSync("taskkill /f /im ChatLLM.exe /t", { stdio: "ignore" });
    } catch (e) {
      // Ignore error if no process is found
      console.log("No running instances found or could not terminate.");
    }

    // Wait a moment for processes to fully terminate
    setTimeout(() => {
      rimrafDelete(directory, { maxRetries: 5, retryDelay: 1000 }, (err) => {
        if (err) {
          console.log(
            `Failed with rimraf, trying alternative method: ${err.message}`
          );

          // Try alternative deletion method
          try {
            if (process.platform === "win32") {
              // For Windows, use rd command which can handle some locked files better
              execSync(`rd /s /q "${directory}"`, { stdio: "ignore" });
              console.log("Directory removed using Windows rd command");
              resolve();
            } else {
              fs.rmSync(directory, { recursive: true, force: true });
              console.log("Directory removed using rmSync");
              resolve();
            }
          } catch (error) {
            console.error(`Could not remove directory: ${error.message}`);
            // Don't fail the build process, just warn
            resolve();
          }
        } else {
          console.log("Directory removed successfully");
          resolve();
        }
      });
    }, 1000);
  });
}

async function cleanup() {
  try {
    if (fs.existsSync(distPath)) {
      console.log("Removing old dist directory...");
      await cleanDirectory(distPath);
      console.log("Cleanup completed successfully!");
    } else {
      console.log("No previous dist directory found.");
    }
    console.log("Ready to build!");
  } catch (err) {
    console.error("Failed to clean build directory:", err);
    console.log("Continuing with build process anyway...");
  }

  // Always exit with success to allow the build to continue
  process.exit(0);
}

// Run cleanup process
cleanup();
