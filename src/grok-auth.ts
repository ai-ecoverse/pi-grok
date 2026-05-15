import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { GrokBuildProviderConfig } from './types.js';

const DEFAULT_AUTH_PATH = path.join(os.homedir(), '.grok', 'auth.json');
const XAI_AUTH_KEY = 'https://auth.x.ai::b1a00492-073a-47ea-816f-4c329264a828';
const TOKEN_ENDPOINT = 'https://auth.x.ai/oauth2/token';
const DEFAULT_CLIENT_ID = 'b1a00492-073a-47ea-816f-4c329264a828';

export interface GrokAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

function parseGrokAuthObject(data: any): GrokAuthTokens | null {
  const entry = data?.[XAI_AUTH_KEY];
  if (!entry?.key || !entry?.refresh_token) return null;

  return {
    accessToken: entry.key,
    refreshToken: entry.refresh_token,
    expiresAt: entry.expires_at
      ? new Date(entry.expires_at).getTime()
      : Date.now() + 6 * 60 * 60 * 1000,
  };
}

export function readGrokTokensFromFile(customPath?: string): GrokAuthTokens | null {
  const authPath = customPath || DEFAULT_AUTH_PATH;
  if (!fs.existsSync(authPath)) return null;

  try {
    const content = fs.readFileSync(authPath, 'utf-8');
    return parseGrokAuthObject(JSON.parse(content));
  } catch (err) {
    console.error('[pi-grok] Failed to read/parse Grok auth file:', err);
    return null;
  }
}

export async function refreshGrokToken(
  refreshToken: string,
  clientId?: string
): Promise<GrokAuthTokens | null> {
  const client = clientId || DEFAULT_CLIENT_ID;

  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: client,
      }),
    });

    if (!res.ok) {
      console.error('[pi-grok] Refresh failed:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + (data.expires_in || 21600) * 1000,
    };
  } catch (err) {
    console.error('[pi-grok] Refresh error:', err);
    return null;
  }
}

/**
 * Main entry point used by the extension.
 * Supports all three input methods requested by the user.
 */
export async function getValidGrokAccessToken(
  config: GrokBuildProviderConfig = {}
): Promise<string | null> {
  let tokens: GrokAuthTokens | null = null;

  // 1. Direct access token
  if (config.accessToken) {
    if (config.refreshToken) {
      // We have both — still check expiration if possible, but for now just return it
      return config.accessToken;
    }
    return config.accessToken;
  }

  // 2. Full auth.json content passed in
  if (config.authJson) {
    tokens = parseGrokAuthObject(
      typeof config.authJson === 'string' ? JSON.parse(config.authJson) : config.authJson
    );
  }

  // 3. Read from filesystem (default behavior)
  if (!tokens) {
    tokens = readGrokTokensFromFile(config.authFilePath);
  }

  if (!tokens) {
    console.error('[pi-grok] No Grok authentication found.');
    return null;
  }

  // Auto-refresh if expired (5 min buffer)
  const buffer = 5 * 60 * 1000;
  if (Date.now() + buffer > tokens.expiresAt) {
    const refreshed = await refreshGrokToken(tokens.refreshToken, config.clientId);
    if (refreshed) {
      tokens = refreshed;
    }
  }

  return tokens.accessToken;
}
