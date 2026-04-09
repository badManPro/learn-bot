import { shell } from "electron";

type DesktopSession = {
  status: "anonymous" | "pending";
  workspaceId: string | null;
  accountLabel: string | null;
  loginHint: string;
};

const session: DesktopSession = {
  status: "anonymous",
  workspaceId: null,
  accountLabel: null,
  loginHint: "Phase 1 mock session. Browser auth wiring lands in the next phase."
};

export async function loginWithChatGPT() {
  session.status = "pending";
  await shell.openExternal("https://chatgpt.com/");

  return session;
}

export async function getSessionSnapshot() {
  return session;
}
