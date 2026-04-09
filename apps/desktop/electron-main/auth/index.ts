import { shell } from "electron";

import type { DesktopSession } from "../ipc/contracts";

const session: DesktopSession = {
  status: "anonymous",
  workspaceId: null,
  accountLabel: null,
  loginHint: "Phase 1 mock session. Browser auth wiring lands in the next phase."
};

export async function loginWithChatGPT(): Promise<DesktopSession> {
  session.status = "pending";
  session.workspaceId = "workspace-python-starter";
  session.accountLabel = "Desktop auth pending browser confirmation";
  await shell.openExternal("https://chatgpt.com/");

  return { ...session };
}

export async function getSessionSnapshot(): Promise<DesktopSession> {
  return { ...session };
}
