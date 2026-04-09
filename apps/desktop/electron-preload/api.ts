import { contextBridge, ipcRenderer } from "electron";

import { ipcChannels } from "../electron-main/ipc/contracts";

export const desktopApi = {
  auth: {
    login: () => ipcRenderer.invoke(ipcChannels.authLogin),
    session: {
      get: () => ipcRenderer.invoke(ipcChannels.authSessionGet)
    }
  },
  plan: {
    generate: () => ipcRenderer.invoke(ipcChannels.planGenerate)
  }
};

contextBridge.exposeInMainWorld("desktopApi", desktopApi);
