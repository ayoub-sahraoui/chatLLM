const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  // Load the app - either from dev server or production build
  mainWindow.loadURL(
    isDev
      ? "http://localhost:5173"
      : `file://${path.join(__dirname, "../../build/index.html")}`
  );

  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window being closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Create window when Electron app is ready
app.on("ready", createWindow);

// Quit when all windows are closed
app.on("window-all-closed", () => {
  // On macOS applications keep their menu bar active until the user quits explicitly
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS re-create a window when dock icon is clicked and no other windows open
  if (mainWindow === null) {
    createWindow();
  }
});

// Listen for any IPC messages from renderer process
ipcMain.on("message-from-renderer", (event, arg) => {
  console.log("Message from renderer:", arg);
  // You can communicate back to renderer if needed
  event.reply("message-from-main", "Hello from main process");
});
