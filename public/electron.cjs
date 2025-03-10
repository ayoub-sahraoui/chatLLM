// This file is used by Electron directly in dev mode
const path = require("path");
const { app, BrowserWindow, ipcMain } = require("electron");

// In dev mode, we need to dynamically require electron-is-dev
let isDev;
try {
  isDev = require("electron-is-dev");
} catch (e) {
  // In prod mode, we know it's false
  isDev = false;
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(
        __dirname,
        isDev ? "../src/main/preload.cjs" : "preload.cjs"
      ),
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`file://${path.join(__dirname, "../build/index.html")}`);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
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
