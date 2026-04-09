import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, ipcMain } from "electron";

import { generateMockLesson, generateMockPlan } from "./ai";
import { getSessionSnapshot, loginWithChatGPT } from "./auth";
import { ipcChannels } from "./ipc/contracts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    title: "Learn Bot Desktop",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    return;
  }

  void mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
  ipcMain.handle(ipcChannels.authLogin, () => loginWithChatGPT());
  ipcMain.handle(ipcChannels.authSessionGet, () => getSessionSnapshot());
  ipcMain.handle(ipcChannels.planGenerate, () => generateMockPlan());
  ipcMain.handle(ipcChannels.lessonGenerate, () => generateMockLesson());

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
