import { contextBridge, ipcRenderer } from "electron";

import type { DesktopApi } from "../shared/contracts";
import { ipcChannels } from "../shared/contracts";

export const desktopApi: DesktopApi = {
  auth: {
    login: () => ipcRenderer.invoke(ipcChannels.authLogin),
    session: {
      get: () => ipcRenderer.invoke(ipcChannels.authSessionGet)
    }
  },
  plan: {
    generate: (input) => ipcRenderer.invoke(ipcChannels.planGenerate, input)
  },
  lesson: {
    generate: () => ipcRenderer.invoke(ipcChannels.lessonGenerate)
  }
};

contextBridge.exposeInMainWorld("desktopApi", desktopApi);
