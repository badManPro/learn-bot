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
    generate: (input) => ipcRenderer.invoke(ipcChannels.planGenerate, input),
    replan: (input) => ipcRenderer.invoke(ipcChannels.planReplan, input)
  },
  lesson: {
    generate: (input) => ipcRenderer.invoke(ipcChannels.lessonGenerate, input)
  }
};

contextBridge.exposeInMainWorld("desktopApi", desktopApi);
