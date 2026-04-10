import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";

import { shell } from "electron";

import type { DesktopSession } from "../ipc/contracts";

const OPENAI_OIDC_DISCOVERY_URL = "https://auth.openai.com/.well-known/openid-configuration";
const DEFAULT_AUTHORIZATION_ENDPOINT = "https://auth.openai.com/authorize";
const DEFAULT_TOKEN_ENDPOINT = "https://auth0.openai.com/oauth/token";
const DEFAULT_AUDIENCE = "https://api.openai.com/v1";
const DEFAULT_SCOPES = ["openid", "profile", "email", "offline_access"];
const CALLBACK_HOST = "127.0.0.1";
const CALLBACK_PATH = "/auth/callback";
const LOGIN_TIMEOUT_MS = 3 * 60 * 1000;
const APP_AUTH_FILE_PATH = path.join(os.homedir(), ".learn-bot", "auth.json");
const CODEX_AUTH_FILE_PATH = path.join(process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex"), "auth.json");
const PREFERRED_CALLBACK_PORT = Number.parseInt(process.env.LEARN_BOT_OPENAI_OAUTH_PORT ?? "1455", 10);

type TokenBundle = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  account_id?: string;
};

type StoredAuthFile = {
  auth_mode?: string;
  last_refresh?: string;
  oauth?: {
    audience?: string;
    authorization_endpoint?: string;
    client_id?: string;
    scopes?: string[];
    token_endpoint?: string;
  };
  source?: "learn-bot" | "codex";
  tokens?: TokenBundle;
};

type JwtClaims = {
  aud?: string | string[];
  client_id?: string;
  email?: string;
  exp?: number;
  iss?: string;
  name?: string;
  scp?: string[];
  [key: string]: unknown;
};

type OpenAiOauthConfig = {
  audience: string;
  authorizationEndpoint: string;
  clientId: string;
  scopes: string[];
  tokenEndpoint: string;
};

type LoginFlowController = {
  redirectUri: string;
  server: Server;
  timeoutHandle: NodeJS.Timeout | null;
};

const anonymousHint =
  "当前桌面端会优先复用本机 Codex 登录状态；没有可用会话时，再发起 OpenAI 浏览器 OAuth 登录。";

let session: DesktopSession = {
  status: "anonymous",
  workspaceId: null,
  accountLabel: null,
  loginHint: anonymousHint
};

let activeLoginPromise: Promise<DesktopSession> | null = null;

function base64UrlEncode(buffer: Buffer) {
  return buffer.toString("base64url");
}

function decodeJwtPayload(token: string | undefined): JwtClaims | null {
  if (!token) {
    return null;
  }

  const payload = token.split(".")[1];
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as JwtClaims;
  } catch {
    return null;
  }
}

function isJwtExpired(token: string | undefined, skewSeconds = 60) {
  const claims = decodeJwtPayload(token);
  if (!claims?.exp) {
    return true;
  }

  return claims.exp <= Math.floor(Date.now() / 1000) + skewSeconds;
}

function getAuthContext(claims: JwtClaims | null) {
  const value = claims?.["https://api.openai.com/auth"];
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pickWorkspaceLabel(claims: JwtClaims | null) {
  const authContext = getAuthContext(claims);
  const organizations = Array.isArray(authContext?.organizations) ? authContext.organizations : [];
  const defaultOrganization =
    organizations.find(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        "is_default" in entry &&
        (entry as Record<string, unknown>).is_default === true
    ) ?? organizations[0];

  if (!defaultOrganization || typeof defaultOrganization !== "object") {
    return null;
  }

  const candidate = defaultOrganization as Record<string, unknown>;
  return typeof candidate.title === "string"
    ? candidate.title
    : typeof candidate.id === "string"
      ? candidate.id
      : null;
}

function pickAccountLabel(idClaims: JwtClaims | null, accessClaims: JwtClaims | null) {
  const values = [idClaims?.name, idClaims?.email, accessClaims?.email];
  return values.find((value) => typeof value === "string" && value.trim()) ?? null;
}

function extractClientId(record: StoredAuthFile | null) {
  if (record?.oauth?.client_id?.trim()) {
    return record.oauth.client_id.trim();
  }

  const accessClaims = decodeJwtPayload(record?.tokens?.access_token);
  if (accessClaims?.client_id?.trim()) {
    return accessClaims.client_id.trim();
  }

  const idClaims = decodeJwtPayload(record?.tokens?.id_token);
  const audience = Array.isArray(idClaims?.aud) ? idClaims.aud[0] : idClaims?.aud;
  return typeof audience === "string" && audience.startsWith("app_") ? audience : null;
}

function extractAudience(record: StoredAuthFile | null) {
  if (record?.oauth?.audience?.trim()) {
    return record.oauth.audience.trim();
  }

  const accessClaims = decodeJwtPayload(record?.tokens?.access_token);
  const audience = Array.isArray(accessClaims?.aud) ? accessClaims.aud[0] : accessClaims?.aud;
  return typeof audience === "string" && audience.startsWith("https://") ? audience : DEFAULT_AUDIENCE;
}

function extractScopes(record: StoredAuthFile | null) {
  if (Array.isArray(record?.oauth?.scopes) && record.oauth.scopes.length > 0) {
    return record.oauth.scopes;
  }

  const accessClaims = decodeJwtPayload(record?.tokens?.access_token);
  return Array.isArray(accessClaims?.scp) && accessClaims.scp.length > 0 ? accessClaims.scp : DEFAULT_SCOPES;
}

function buildSessionFromTokens(tokens: TokenBundle, source: "learn-bot" | "codex"): DesktopSession | null {
  if (!tokens.access_token) {
    return null;
  }

  const idClaims = decodeJwtPayload(tokens.id_token);
  const accessClaims = decodeJwtPayload(tokens.access_token);
  const workspaceLabel = pickWorkspaceLabel(idClaims) ?? pickWorkspaceLabel(accessClaims);
  const accountLabel = pickAccountLabel(idClaims, accessClaims);

  if (!accountLabel && !workspaceLabel) {
    return null;
  }

  const loginHint =
    source === "codex"
      ? "已复用本机 Codex 登录状态。当前桌面端可以直接使用这份本地会话。"
      : "已通过桌面端 OpenAI OAuth 回调完成登录。";

  return {
    status: "authenticated",
    workspaceId: workspaceLabel,
    accountLabel,
    loginHint
  };
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    console.warn("[desktop-auth] failed to read json file", { filePath, error });
    return null;
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function discoverOauthEndpoints() {
  try {
    const response = await fetch(OPENAI_OIDC_DISCOVERY_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`OIDC discovery failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      authorization_endpoint?: string;
      token_endpoint?: string;
    };

    return {
      authorizationEndpoint: payload.authorization_endpoint || DEFAULT_AUTHORIZATION_ENDPOINT,
      tokenEndpoint: payload.token_endpoint || DEFAULT_TOKEN_ENDPOINT
    };
  } catch (error) {
    console.warn("[desktop-auth] failed to discover OIDC metadata, falling back to defaults", error);
    return {
      authorizationEndpoint: DEFAULT_AUTHORIZATION_ENDPOINT,
      tokenEndpoint: DEFAULT_TOKEN_ENDPOINT
    };
  }
}

async function resolveOauthConfig() {
  const learnBotRecord = await readJsonFile<StoredAuthFile>(APP_AUTH_FILE_PATH);
  const codexRecord = await readJsonFile<StoredAuthFile>(CODEX_AUTH_FILE_PATH);
  const sourceRecord = learnBotRecord ?? codexRecord;
  const envClientId = process.env.LEARN_BOT_OPENAI_OAUTH_CLIENT_ID?.trim();
  const envAudience = process.env.LEARN_BOT_OPENAI_OAUTH_AUDIENCE?.trim();
  const envScopes = process.env.LEARN_BOT_OPENAI_OAUTH_SCOPES?.trim();
  const endpoints = await discoverOauthEndpoints();
  const clientId = envClientId || extractClientId(sourceRecord);

  if (!clientId) {
    throw new Error("未找到可用的 OpenAI OAuth client_id。本机至少需要已有 Codex 登录状态，或者显式配置 LEARN_BOT_OPENAI_OAUTH_CLIENT_ID。");
  }

  return {
    authorizationEndpoint: endpoints.authorizationEndpoint,
    tokenEndpoint: endpoints.tokenEndpoint,
    clientId,
    audience: envAudience || extractAudience(sourceRecord),
    scopes: envScopes ? envScopes.split(/[,\s]+/u).filter(Boolean) : extractScopes(sourceRecord)
  } satisfies OpenAiOauthConfig;
}

async function refreshStoredAuthIfNeeded(record: StoredAuthFile | null) {
  if (!record?.tokens?.access_token || !record.tokens.refresh_token) {
    return record;
  }

  if (!isJwtExpired(record.tokens.access_token)) {
    return record;
  }

  const clientId = extractClientId(record);
  if (!clientId) {
    return null;
  }

  const endpoints = await discoverOauthEndpoints();
  const response = await fetch(endpoints.tokenEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: record.tokens.refresh_token
    })
  });

  if (!response.ok) {
    throw new Error(`刷新 OpenAI OAuth token 失败，状态码 ${response.status}`);
  }

  const payload = (await response.json()) as Partial<TokenBundle>;

  return {
    ...record,
    last_refresh: new Date().toISOString(),
    oauth: {
      ...record.oauth,
      authorization_endpoint: endpoints.authorizationEndpoint,
      client_id: clientId,
      token_endpoint: endpoints.tokenEndpoint
    },
    tokens: {
      ...record.tokens,
      ...payload,
      refresh_token: payload.refresh_token ?? record.tokens.refresh_token
    }
  } satisfies StoredAuthFile;
}

function createPendingSession(loginHint: string): DesktopSession {
  return {
    status: "pending",
    workspaceId: null,
    accountLabel: "浏览器登录流程已启动",
    loginHint
  };
}

function createAnonymousSession(loginHint = anonymousHint): DesktopSession {
  return {
    status: "anonymous",
    workspaceId: null,
    accountLabel: null,
    loginHint
  };
}

async function restoreDesktopSession() {
  const storedLearnBotRecord = await readJsonFile<StoredAuthFile>(APP_AUTH_FILE_PATH);
  const refreshedLearnBotRecord = storedLearnBotRecord
    ? await refreshStoredAuthIfNeeded(storedLearnBotRecord).catch((error) => {
        console.warn("[desktop-auth] failed to refresh learn-bot auth record", error);
        return storedLearnBotRecord;
      })
    : null;
  if (refreshedLearnBotRecord?.tokens?.access_token) {
    await writeJsonFile(APP_AUTH_FILE_PATH, {
      ...refreshedLearnBotRecord,
      source: "learn-bot"
    } satisfies StoredAuthFile);

    const restoredLearnBotSession = buildSessionFromTokens(refreshedLearnBotRecord.tokens, "learn-bot");
    if (restoredLearnBotSession) {
      session = restoredLearnBotSession;
      return session;
    }
  }

  const storedCodexRecord = await readJsonFile<StoredAuthFile>(CODEX_AUTH_FILE_PATH);
  const refreshedCodexRecord = storedCodexRecord
    ? await refreshStoredAuthIfNeeded(storedCodexRecord).catch((error) => {
        console.warn("[desktop-auth] failed to refresh codex auth record", error);
        return storedCodexRecord;
      })
    : null;

  if (refreshedCodexRecord?.tokens?.access_token && !isJwtExpired(refreshedCodexRecord.tokens.access_token)) {
    await writeJsonFile(APP_AUTH_FILE_PATH, {
      ...refreshedCodexRecord,
      source: "codex"
    } satisfies StoredAuthFile);

    const restoredCodexSession = buildSessionFromTokens(refreshedCodexRecord.tokens, "codex");
    if (restoredCodexSession) {
      session = restoredCodexSession;
      return session;
    }
  }

  session = createAnonymousSession();
  return session;
}

async function reserveCallbackServer(onRequest: (request: IncomingMessage, response: ServerResponse) => void) {
  const server = createServer(onRequest);

  const address = await new Promise<{ port: number }>((resolve, reject) => {
    const handleError = (error: Error) => reject(error);
    server.once("error", handleError);
    server.listen(PREFERRED_CALLBACK_PORT, CALLBACK_HOST, () => {
      server.off("error", handleError);
      const value = server.address();
      if (value && typeof value === "object") {
        resolve({ port: value.port });
        return;
      }

      reject(new Error("OAuth callback server failed to bind to a TCP port."));
    });
  }).catch(async (error) => {
    if ((error as NodeJS.ErrnoException).code !== "EADDRINUSE") {
      throw error;
    }

    await new Promise<void>((resolve, reject) => {
      const handleError = (fallbackError: Error) => reject(fallbackError);
      server.once("error", handleError);
      server.listen(0, CALLBACK_HOST, () => {
        server.off("error", handleError);
        const value = server.address();
        if (value && typeof value === "object") {
          resolve();
          return;
        }

        reject(new Error("OAuth callback server failed to bind to a fallback TCP port."));
      });
    });

    const fallbackAddress = server.address();
    if (!fallbackAddress || typeof fallbackAddress !== "object") {
      throw new Error("OAuth callback server did not expose a valid fallback port.");
    }

    return { port: fallbackAddress.port };
  });

  return {
    redirectUri: `http://localhost:${address.port}${CALLBACK_PATH}`,
    server
  };
}

function renderOauthResponsePage(title: string, description: string) {
  const escapedTitle = title.replace(/[<>&]/g, "");
  const escapedDescription = description.replace(/[<>&]/g, "");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta content="width=device-width, initial-scale=1" name="viewport" />
    <title>${escapedTitle}</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #0b1020;
        color: #eef3ff;
      }
      main {
        width: min(520px, calc(100% - 32px));
        padding: 28px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(186, 203, 255, 0.16);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 28px;
      }
      p {
        margin: 0;
        line-height: 1.7;
        color: #c7d2eb;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapedTitle}</h1>
      <p>${escapedDescription}</p>
    </main>
    <script>
      window.setTimeout(() => window.close(), 500);
    </script>
  </body>
</html>`;
}

async function exchangeAuthorizationCode(
  oauthConfig: OpenAiOauthConfig,
  redirectUri: string,
  code: string,
  codeVerifier: string
) {
  const response = await fetch(oauthConfig.tokenEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: oauthConfig.clientId,
      code_verifier: codeVerifier
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI token exchange failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as TokenBundle;
  if (!payload.access_token) {
    throw new Error("OpenAI token exchange completed without an access_token.");
  }

  return payload;
}

async function runBrowserLoginFlow() {
  const oauthConfig = await resolveOauthConfig();
  const codeVerifier = base64UrlEncode(randomBytes(32));
  const codeChallenge = base64UrlEncode(createHash("sha256").update(codeVerifier).digest());
  const state = base64UrlEncode(randomBytes(24));
  const nonce = base64UrlEncode(randomBytes(24));

  const result = await new Promise<DesktopSession>(async (resolve, reject) => {
    let controller: LoginFlowController | null = null;

    const finalize = async (nextSession: DesktopSession | null, error?: Error) => {
      if (!controller) {
        if (error) {
          reject(error);
        } else if (nextSession) {
          resolve(nextSession);
        }
        return;
      }

      if (controller.timeoutHandle) {
        clearTimeout(controller.timeoutHandle);
      }
      await new Promise<void>((closeResolve) => controller?.server.close(() => closeResolve()));
      controller = null;

      if (error) {
        reject(error);
        return;
      }

      if (!nextSession) {
        reject(new Error("OAuth login completed without a session payload."));
        return;
      }

      resolve(nextSession);
    };

    try {
      const reservedServer = await reserveCallbackServer(async (request, response) => {
        const requestUrl = new URL(request.url || "/", `http://${CALLBACK_HOST}`);

        if (requestUrl.pathname !== CALLBACK_PATH) {
          response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
          response.end("Not found");
          return;
        }

        const returnedState = requestUrl.searchParams.get("state");
        const returnedCode = requestUrl.searchParams.get("code");
        const returnedError = requestUrl.searchParams.get("error");
        const returnedErrorDescription = requestUrl.searchParams.get("error_description");

        if (returnedError) {
          response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          response.end(
            renderOauthResponsePage("Sign-in failed", returnedErrorDescription || `OAuth error: ${returnedError}`)
          );
          await finalize(null, new Error(returnedErrorDescription || returnedError));
          return;
        }

        if (!returnedCode || returnedState !== state) {
          response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          response.end(renderOauthResponsePage("Sign-in failed", "OAuth callback validation failed."));
          await finalize(null, new Error("OAuth callback validation failed."));
          return;
        }

        try {
          const tokens = await exchangeAuthorizationCode(oauthConfig, reservedServer.redirectUri, returnedCode, codeVerifier);
          const authRecord = {
            auth_mode: "chatgpt",
            last_refresh: new Date().toISOString(),
            oauth: {
              audience: oauthConfig.audience,
              authorization_endpoint: oauthConfig.authorizationEndpoint,
              client_id: oauthConfig.clientId,
              scopes: oauthConfig.scopes,
              token_endpoint: oauthConfig.tokenEndpoint
            },
            source: "learn-bot",
            tokens
          } satisfies StoredAuthFile;

          await writeJsonFile(APP_AUTH_FILE_PATH, authRecord);

          const nextSession = buildSessionFromTokens(tokens, "learn-bot");
          if (!nextSession) {
            throw new Error("OAuth callback returned tokens, but the desktop session payload could not be derived.");
          }

          session = nextSession;
          response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          response.end(renderOauthResponsePage("Signed in", "You can return to Learn Bot Desktop."));
          await finalize(nextSession);
        } catch (error) {
          response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          response.end(renderOauthResponsePage("Sign-in failed", error instanceof Error ? error.message : "Unknown OAuth error."));
          await finalize(null, error instanceof Error ? error : new Error("Unknown OAuth error."));
        }
      });

      controller = {
        ...reservedServer,
        timeoutHandle: null
      };

      controller.timeoutHandle = setTimeout(() => {
        void finalize(null, new Error("OpenAI OAuth login timed out before the localhost callback completed."));
      }, LOGIN_TIMEOUT_MS);

      const authorizeUrl = new URL(oauthConfig.authorizationEndpoint);
      authorizeUrl.searchParams.set("audience", oauthConfig.audience);
      authorizeUrl.searchParams.set("client_id", oauthConfig.clientId);
      authorizeUrl.searchParams.set("redirect_uri", controller.redirectUri);
      authorizeUrl.searchParams.set("scope", oauthConfig.scopes.join(" "));
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("response_mode", "query");
      authorizeUrl.searchParams.set("state", state);
      authorizeUrl.searchParams.set("nonce", nonce);
      authorizeUrl.searchParams.set("code_challenge", codeChallenge);
      authorizeUrl.searchParams.set("code_challenge_method", "S256");

      session = createPendingSession("浏览器已打开，等待 localhost 回调完成 token exchange。");
      await shell.openExternal(authorizeUrl.toString());
    } catch (error) {
      if (controller) {
        if (controller.timeoutHandle) {
          clearTimeout(controller.timeoutHandle);
        }
        await new Promise<void>((closeResolve) => controller?.server.close(() => closeResolve()));
      }
      reject(error instanceof Error ? error : new Error("Failed to start browser OAuth login."));
    }
  });

  return result;
}

export async function loginWithChatGPT(): Promise<DesktopSession> {
  const restoredSession = await restoreDesktopSession();
  if (restoredSession.status === "authenticated") {
    return { ...restoredSession };
  }

  if (!activeLoginPromise) {
    activeLoginPromise = runBrowserLoginFlow().finally(() => {
      activeLoginPromise = null;
    });
  }

  session = createPendingSession("正在发起 OpenAI 浏览器 OAuth 登录。");

  return { ...(await activeLoginPromise) };
}

export async function getSessionSnapshot(): Promise<DesktopSession> {
  return { ...(await restoreDesktopSession()) };
}
