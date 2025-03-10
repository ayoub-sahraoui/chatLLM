// Since contextIsolation is set to false, we should not use contextBridge
// Instead, directly expose functionality to the window object

const { ipcRenderer } = require("electron");

// Direct exposure method when contextIsolation is false
window.electronAPI = {
  sendToMain: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  receiveFromMain: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  },
  // Add any other methods you need
};

console.log("Preload script loaded successfully!");
