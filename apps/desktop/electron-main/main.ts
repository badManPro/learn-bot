import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, ipcMain } from "electron";

import { generateDesktopLesson, generateDesktopPlan, generateDesktopReplan } from "./ai";
import { getSessionSnapshot, loginWithChatGPT } from "./auth";
import { ipcChannels } from "./ipc/contracts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const preloadEntry = path.join(__dirname, "../preload/preload.mjs");
const rendererEntry = path.join(__dirname, "../renderer/index.html");

function isDevRuntime() {
  return !app.isPackaged || Boolean(process.env.ELECTRON_RENDERER_URL);
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    title: "Learn Bot Desktop",
    backgroundColor: "#111111",
    webPreferences: {
      preload: preloadEntry,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error("[desktop] did-fail-load", { errorCode, errorDescription, validatedURL, isMainFrame });
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error("[desktop] render-process-gone", details);
  });

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log("[renderer]", { level, message, line, sourceId });
  });

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("[desktop] renderer loaded", mainWindow.webContents.getURL());
  });

  if (isDevRuntime()) {
    mainWindow.webContents.once("dom-ready", () => {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    });
  }

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL).catch((error) => {
      console.error("[desktop] failed to load renderer url", error);
    });
    return;
  }

  void mainWindow.loadFile(rendererEntry).catch((error) => {
    console.error("[desktop] failed to load renderer file", error);
  });
}

app.whenReady().then(() => {
  ipcMain.handle(ipcChannels.authLogin, () => loginWithChatGPT());
  ipcMain.handle(ipcChannels.authSessionGet, () => getSessionSnapshot());
  ipcMain.handle(ipcChannels.planGenerate, (_event, input) => generateDesktopPlan(input));
  ipcMain.handle(ipcChannels.planReplan, (_event, input) => generateDesktopReplan(input));
  ipcMain.handle(ipcChannels.lessonGenerate, (_event, input) => generateDesktopLesson(input));

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
