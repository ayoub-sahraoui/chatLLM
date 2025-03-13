const { app, BrowserWindow, protocol } = require("electron");
const path = require("path");
const fs = require("fs");
const url = require("url");

// Replace the electron-is-dev import with this fallback logic
let isDev;
try {
  isDev = require("electron-is-dev");
} catch (e) {
  // Fallback if the module is missing in production
  isDev = !process.env.NODE_ENV || process.env.NODE_ENV === "development";
}

let mainWindow;

// Register protocol handler for serving local files
app.whenReady().then(() => {
  // Register file protocol handler
  protocol.registerFileProtocol("file", (request, callback) => {
    const pathname = decodeURI(request.url.replace("file:///", ""));
    try {
      callback(pathname);
    } catch (error) {
      console.error("Failed to register protocol", error);
    }
  });

  createWindow();
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // Update to use the .cjs extension
      preload: isDev
        ? path.join(__dirname, "preload.cjs")
        : path.join(process.resourcesPath, "app.asar/build/preload.cjs"),
      // Set nodeIntegration false for security (default in Electron v12+)
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Note: Only use for development
    },
    // Update icon paths to ensure they're correct for all environments
    icon: path.join(
      __dirname,
      isDev
        ? "../assets/icons/chatllm-icon.png"
        : path.join(
            process.resourcesPath,
            "app.asar/assets/icons/chatllm-icon.png"
          )
    ),
    center: true,
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    // Fix for production build
    // We need to use the correct path to the HTML file
    const indexPath = path.join(__dirname, "../build/index.html");
    const asarIndexPath = path.join(
      process.resourcesPath,
      "app.asar/build/index.html"
    );

    // Try to find the correct path to the HTML file
    let htmlPath;
    if (fs.existsSync(indexPath)) {
      htmlPath = indexPath;
      console.log(`Loading HTML from: ${htmlPath}`);
    } else if (fs.existsSync(asarIndexPath)) {
      htmlPath = asarIndexPath;
      console.log(`Loading HTML from: ${htmlPath}`);
    } else {
      // Fallback to a generic path
      htmlPath = path.join(app.getAppPath(), "build/index.html");
      console.log(`Falling back to: ${htmlPath}`);
    }

    // Use loadFile with proper URL format
    mainWindow.loadURL(
      url.format({
        pathname: htmlPath,
        protocol: "file:",
        slashes: true,
      })
    );
  }

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function () {
  if (mainWindow === null) {
    createWindow();
  }
});
