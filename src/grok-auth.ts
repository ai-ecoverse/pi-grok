import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { GrokBuildProviderConfig } from "./types.js";

const DEFAULT_AUTH_PATH = path.join(os.homedir(), ".grok", "auth.json");
const XAI_AUTH_KEY = "https://auth.x.ai::b1a00492-073a-47ea-816f-4c329264a828";
const TOKEN_ENDPOINT = "https://auth.x.ai/oauth2/token";
const DEFAULT_CLIENT_ID = "b1a00492-073a-47ea-816f-4c329264a828";

// Refresh when fewer than this many ms remain on the access token.
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export interface GrokAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface GrokAuthEntry {
  key: string;
  refresh_token: string;
  expires_at?: string;
  [extra: string]: unknown;
}

type GrokAuthFile = Record<string, GrokAuthEntry>;

function parseGrokAuthObject(data: any, authKey: string = XAI_AUTH_KEY): GrokAuthTokens | null {
  const entry = data?.[authKey];
  if (!entry?.key || !entry?.refresh_token) return null;
  return {
    accessToken: entry.key,
    refreshToken: entry.refresh_token,
    expiresAt: entry.expires_at
      ? new Date(entry.expires_at).getTime()
      : Date.now() + 6 * 60 * 60 * 1000,
  };
}

export function readGrokAuthFile(customPath?: string): GrokAuthFile | null {
  const authPath = customPath || DEFAULT_AUTH_PATH;
  if (!fs.existsSync(authPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(authPath, "utf-8")) as GrokAuthFile;
  } catch (err) {
    console.error("[pi-grok] Failed to read/parse Grok auth file:", err);
    return null;
  }
}

export function readGrokTokensFromFile(customPath?: string): GrokAuthTokens | null {
  const data = readGrokAuthFile(customPath);
  return data ? parseGrokAuthObject(data) : null;
}

function writeGrokAuthFile(filePath: string, data: GrokAuthFile): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  // Atomic-ish write: write to .tmp then rename
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(tmp, filePath);
}

export async function refreshGrokToken(
  refreshToken: string,
  clientId?: string
): Promise<GrokAuthTokens | null> {
  const client = clientId || DEFAULT_CLIENT_ID;
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: client,
      }),
    });
    if (!res.ok) {
      console.error("[pi-grok] Refresh failed:", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + (data.expires_in || 21600) * 1000,
    };
  } catch (err) {
    console.error("[pi-grok] Refresh error:", err);
    return null;
  }
}

/**
 * Update an entry in the on-disk Grok auth file in place, preserving
 * unrelated fields (email, user_id, etc.) so the grok TUI keeps working.
 */
function persistRefreshedTokens(
  filePath: string,
  authKey: string,
  refreshed: GrokAuthTokens
): void {
  const current = readGrokAuthFile(filePath) ?? {};
  const existing = current[authKey] ?? ({} as GrokAuthEntry);
  current[authKey] = {
    ...existing,
    key: refreshed.accessToken,
    refresh_token: refreshed.refreshToken,
    expires_at: new Date(refreshed.expiresAt).toISOString(),
  };
  writeGrokAuthFile(filePath, current);
}

/**
 * Ensure we have a non-expired access token. Reads from disk (or config),
 * refreshes via the x.ai OAuth endpoint when needed, and writes the new
 * tokens back so that subsequent calls and the grok TUI stay in sync.
 */
export async function ensureFreshGrokToken(
  config: GrokBuildProviderConfig = {}
): Promise<string | null> {
  // 1. Direct access token wins (caller-provided, can't refresh)
  if (config.accessToken && !config.refreshToken) {
    return config.accessToken;
  }

  // 2. Inline authJson takes precedence over disk
  if (config.authJson) {
    const data =
      typeof config.authJson === "string" ? JSON.parse(config.authJson) : config.authJson;
    const tokens = parseGrokAuthObject(data);
    if (!tokens) return null;
    if (Date.now() + REFRESH_BUFFER_MS < tokens.expiresAt) return tokens.accessToken;
    const refreshed = await refreshGrokToken(tokens.refreshToken, config.clientId);
    return refreshed?.accessToken ?? tokens.accessToken;
  }

  // 3. Read from disk and refresh in place
  const authPath = config.authFilePath
    ? config.authFilePath.replace(/^~/, os.homedir())
    : DEFAULT_AUTH_PATH;
  const authData = readGrokAuthFile(authPath);
  const tokens = authData ? parseGrokAuthObject(authData) : null;
  if (!tokens) return null;

  if (Date.now() + REFRESH_BUFFER_MS < tokens.expiresAt) {
    return tokens.accessToken;
  }

  const refreshed = await refreshGrokToken(tokens.refreshToken, config.clientId);
  if (!refreshed) {
    // Refresh failed but we still have a token (possibly recently expired).
    return tokens.accessToken;
  }

  try {
    persistRefreshedTokens(authPath, XAI_AUTH_KEY, refreshed);
  } catch (err) {
    console.error("[pi-grok] Could not persist refreshed token to", authPath, err);
  }
  return refreshed.accessToken;
}

/** Legacy alias retained for backwards compatibility. */
export const getValidGrokAccessToken = ensureFreshGrokToken;

export { DEFAULT_AUTH_PATH, XAI_AUTH_KEY, DEFAULT_CLIENT_ID };
