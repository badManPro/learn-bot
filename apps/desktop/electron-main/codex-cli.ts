import { access, cp, lstat, mkdir, readlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type CodexCliCommand = {
  executable: string;
  argsPrefix: string[];
  displayPath: string;
};

const COMMON_CODEX_PATHS = [
  process.env.LEARN_BOT_CODEX_CLI_PATH?.trim() || null,
  "/usr/local/bin/codex",
  "/opt/homebrew/bin/codex",
  path.join(process.env.HOME ?? "", ".local/bin/codex")
].filter((value): value is string => Boolean(value));

const GLOBAL_CODEX_HOME = process.env.LEARN_BOT_CODEX_SOURCE_HOME?.trim() || path.join(process.env.HOME ?? "", ".codex");
const DESKTOP_CODEX_HOME = process.env.LEARN_BOT_CODEX_HOME?.trim() || path.join(os.tmpdir(), "learn-bot-desktop-codex-home");
const AUTH_FILE_NAMES = ["auth.json", "installation_id"] as const;
const AUTH_DIRECTORY_NAMES = ["accounts"] as const;

const COMMON_NODE_PATHS = [
  process.env.LEARN_BOT_NODE_PATH?.trim() || null,
  "/usr/local/bin/node",
  "/opt/homebrew/bin/node",
  path.join(process.env.HOME ?? "", ".local/bin/node"),
  process.versions.electron ? null : process.execPath
].filter((value): value is string => Boolean(value));

let resolvedCodexCommand: CodexCliCommand | null = null;
let preparedCodexHome: string | null = null;

async function isAccessible(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveNodePath() {
  for (const candidate of COMMON_NODE_PATHS) {
    if (await isAccessible(candidate)) {
      return candidate;
    }
  }

  return process.execPath;
}

async function pathExists(targetPath: string) {
  return isAccessible(targetPath);
}

async function hasLocalCodexAuth(homePath: string) {
  if (await pathExists(path.join(homePath, "auth.json"))) {
    return true;
  }

  return pathExists(path.join(homePath, "accounts", "registry.json"));
}

async function copyIfPresent(sourcePath: string, targetPath: string) {
  if (!(await pathExists(sourcePath))) {
    return;
  }

  await cp(sourcePath, targetPath, {
    recursive: true,
    force: true
  });
}

async function ensureDesktopCodexHome() {
  if (preparedCodexHome) {
    return preparedCodexHome;
  }

  await mkdir(DESKTOP_CODEX_HOME, { recursive: true });

  if (!(await hasLocalCodexAuth(DESKTOP_CODEX_HOME))) {
    for (const fileName of AUTH_FILE_NAMES) {
      await copyIfPresent(path.join(GLOBAL_CODEX_HOME, fileName), path.join(DESKTOP_CODEX_HOME, fileName));
    }

    for (const directoryName of AUTH_DIRECTORY_NAMES) {
      await copyIfPresent(path.join(GLOBAL_CODEX_HOME, directoryName), path.join(DESKTOP_CODEX_HOME, directoryName));
    }
  }

  preparedCodexHome = DESKTOP_CODEX_HOME;
  return preparedCodexHome;
}

async function buildNodeBackedCommand(candidate: string): Promise<CodexCliCommand | null> {
  try {
    const stats = await lstat(candidate);
    const nodePath = await resolveNodePath();

    if (stats.isSymbolicLink()) {
      const linkTarget = await readlink(candidate);
      const scriptPath = path.resolve(path.dirname(candidate), linkTarget);
      if (await isAccessible(scriptPath)) {
        return {
          executable: nodePath,
          argsPrefix: [scriptPath],
          displayPath: `${nodePath} ${scriptPath}`
        };
      }
    }

    if (candidate.endsWith(".js")) {
      return {
        executable: nodePath,
        argsPrefix: [candidate],
        displayPath: `${nodePath} ${candidate}`
      };
    }
  } catch {
    return null;
  }

  return null;
}

export async function resolveCodexCliCommand(): Promise<CodexCliCommand> {
  if (resolvedCodexCommand) {
    return resolvedCodexCommand;
  }

  for (const candidate of COMMON_CODEX_PATHS) {
    if (!(await isAccessible(candidate))) {
      continue;
    }

    const nodeBacked = await buildNodeBackedCommand(candidate);
    resolvedCodexCommand =
      nodeBacked ??
      ({
        executable: candidate,
        argsPrefix: [],
        displayPath: candidate
      } satisfies CodexCliCommand);
    return resolvedCodexCommand;
  }

  resolvedCodexCommand = {
    executable: "codex",
    argsPrefix: [],
    displayPath: "codex"
  };
  return resolvedCodexCommand;
}

export async function buildCodexCliEnv() {
  const pathEntries = [
    process.env.PATH ?? "",
    "/usr/local/bin",
    "/opt/homebrew/bin",
    path.join(process.env.HOME ?? "", ".local/bin")
  ]
    .flatMap((entry) => entry.split(":"))
    .filter(Boolean);

  const codexHome = await ensureDesktopCodexHome();

  return {
    ...process.env,
    PATH: [...new Set(pathEntries)].join(":"),
    CODEX_HOME: codexHome
  };
}
