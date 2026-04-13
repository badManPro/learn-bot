import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { DesktopSession } from "../ipc/contracts";
import { buildCodexCliEnv, resolveCodexCliCommand } from "../codex-cli";

const execFileAsync = promisify(execFile);

type CodexCliRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

const anonymousHint = "当前桌面端复用本机 `codex login` 登录态；没有可用会话时，会通过官方 Codex CLI 拉起浏览器登录。";

let session: DesktopSession = {
  status: "anonymous",
  workspaceId: null,
  accountLabel: null,
  loginHint: anonymousHint
};

let activeLoginPromise: Promise<DesktopSession> | null = null;

async function runCodexCli(args: string[]): Promise<CodexCliRunResult> {
  try {
    const command = await resolveCodexCliCommand();
    const env = await buildCodexCliEnv();
    const result = await execFileAsync(command.executable, [...command.argsPrefix, ...args], {
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
      env
    });

    return {
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      exitCode: 0
    };
  } catch (error) {
    const command = await resolveCodexCliCommand().catch(() => null);
    if (error instanceof Error) {
      console.error("[desktop-codex] auth command failed", {
        command: command?.displayPath ?? "unresolved",
        message: error.message
      });
      if (/ENOENT|not found/i.test(error.message)) {
        throw error;
      }

      const execError = error as Error & { stdout?: string; stderr?: string; code?: number | string };
      return {
        stdout: execError.stdout ?? "",
        stderr: execError.stderr ?? execError.message,
        exitCode: typeof execError.code === "number" ? execError.code : 1
      };
    }

    return {
      stdout: "",
      stderr: "Codex CLI 调用失败。",
      exitCode: 1
    };
  }
}

function combineOutput(result: CodexCliRunResult) {
  return [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
}

function createAnonymousSession(loginHint = anonymousHint): DesktopSession {
  return {
    status: "anonymous",
    workspaceId: null,
    accountLabel: null,
    loginHint
  };
}

function createPendingSession(loginHint: string): DesktopSession {
  return {
    status: "pending",
    workspaceId: null,
    accountLabel: "Codex 浏览器登录已启动",
    loginHint
  };
}

function createAuthenticatedSession(loginHint: string): DesktopSession {
  return {
    status: "authenticated",
    workspaceId: null,
    accountLabel: "Codex CLI",
    loginHint
  };
}

function describeUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return createAnonymousSession(
    message
      ? `当前机器未安装或无法调用 Codex CLI。原始错误：${message}`
      : "当前机器未安装或无法调用 Codex CLI。"
  );
}

function describeStatus(output: string): DesktopSession {
  const normalized = output.trim();

  if (/Logged in using ChatGPT/i.test(normalized) || /logged in/i.test(normalized)) {
    return createAuthenticatedSession("已检测到可复用的 `codex login` 登录态，桌面端将通过 Codex CLI 访问模型。");
  }

  if (/opening browser|continue in your browser|device code|enter the device code/i.test(normalized)) {
    return createPendingSession("官方 Codex 浏览器登录已启动，请在外部浏览器完成验证。");
  }

  if (/expired|revoked|invalid|re-auth/i.test(normalized)) {
    return createAnonymousSession("Codex 登录已失效，请重新点击登录。");
  }

  if (/not logged in|login required|sign in|signed out|authenticate/i.test(normalized)) {
    return createAnonymousSession("当前尚未检测到可复用的 `codex login` 登录态，请先完成浏览器登录。");
  }

  return createAnonymousSession(normalized || anonymousHint);
}

async function readCodexStatus() {
  try {
    const result = await runCodexCli(["login", "status"]);
    return describeStatus(combineOutput(result));
  } catch (error) {
    if (error instanceof Error && /ENOENT|not found/i.test(error.message)) {
      return describeUnavailable(error);
    }

    throw error;
  }
}

async function startBrowserLoginFlow() {
  try {
    const result = await runCodexCli(["login"]);
    const nextSession = await readCodexStatus();

    if (nextSession.status === "authenticated") {
      session = nextSession;
      return session;
    }

    const startedSession = describeStatus(combineOutput(result));
    session = startedSession;
    return session;
  } catch (error) {
    if (error instanceof Error && /ENOENT|not found/i.test(error.message)) {
      session = describeUnavailable(error);
      return session;
    }

    throw error;
  }
}

export async function loginWithChatGPT(): Promise<DesktopSession> {
  const restoredSession = await readCodexStatus();
  if (restoredSession.status === "authenticated") {
    session = restoredSession;
    return { ...session };
  }

  if (!activeLoginPromise) {
    activeLoginPromise = startBrowserLoginFlow().finally(() => {
      activeLoginPromise = null;
    });
  }

  session = createPendingSession("正在通过官方 Codex CLI 发起浏览器登录。");
  return { ...(await activeLoginPromise) };
}

export async function getSessionSnapshot(): Promise<DesktopSession> {
  session = await readCodexStatus();
  return { ...session };
}
