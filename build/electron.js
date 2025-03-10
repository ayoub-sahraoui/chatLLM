// This file is used by Electron directly in dev mode
const path = require("path");
const { app, BrowserWindow, ipcMain } = require("electron");
const isDev = require("electron-is-dev");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Make sure this remains false as your preload script is designed for this
      enableRemoteModule: true,
      preload: path.join(
        __dirname,
        isDev ? "../src/main/preload.js" : "preload.js"
      ),
    },
  });

  mainWindow.loadURL(
    isDev
      ? "http://localhost:3000"
      : `file://${path.join(__dirname, "../build/index.html")}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Listen for any IPC messages from renderer process
ipcMain.on("message-from-renderer", (event, arg) => {
  console.log("Message from renderer:", arg);
  // You can communicate back to renderer if needed
  event.reply("message-from-main", "Hello from main process");
});
