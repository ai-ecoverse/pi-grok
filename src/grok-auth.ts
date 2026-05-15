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
  expiresAt: number; // timestamp in ms
}

/**
 * Parse the Grok auth.json structure and extract tokens.
 */
function parseGrokAuthFile(content: string | Record<string, any>): GrokAuthTokens | null {
  try {
    const data = typeof content === 'string' ? JSON.parse(content) : content;
    const entry = data[XAI_AUTH_KEY];

    if (!entry || !entry.key || !entry.refresh_token) {
      return null;
    }

    return {
      accessToken: entry.key,
      refreshToken: entry.refresh_token,
      expiresAt: entry.expires_at ? new Date(entry.expires_at).getTime() : Date.now() + 6 * 60 * 60 * 1000,
    };
  } catch (err) {
    console.error('[pi-grok] Failed to parse Grok auth file:', err);
    return null;
  }
}

/**
 * Read tokens from the filesystem (default: ~/.grok/auth.json)
 */
export function readGrokTokensFromFile(customPath?: string): GrokAuthTokens | null {
  const authPath = customPath || DEFAULT_AUTH_PATH;

  if (!fs.existsSync(authPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(authPath, 'utf-8');
    return parseGrokAuthFile(content);
  } catch (err) {
    console.error('[pi-grok] Error reading Grok auth file:', err);
    return null;
  }
}

/**
 * Refresh the access token using the refresh token.
 */
export async function refreshGrokToken(refreshToken: string, clientId?: string): Promise<GrokAuthTokens | null> {
  const client = clientId || DEFAULT_CLIENT_ID;

  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: client,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[pi-grok] Token refresh failed:', response.status, text);
      return null;
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + (data.expires_in || 21600) * 1000,
    };
  } catch (err) {
    console.error('[pi-grok] Error during token refresh:', err);
    return null;
  }
}

/**
 * Get a valid access token, refreshing if necessary.
 * This is the main function the provider will use.
 */
export async function getValidGrokAccessToken(config: GrokBuildProviderConfig): Promise<string | null> {
  let tokens: GrokAuthTokens | null = null;

  // Priority 1: Direct access token provided
  if (config.accessToken) {
    // If they also gave a refresh token, we can use it for future refreshes
    return config.accessToken;
  }

  // Priority 2: Full auth.json content provided
  if (config.authJson) {
    tokens = parseGrokAuthFile(config.authJson);
  }

  // Priority 3: Read from filesystem
  if (!tokens) {
    tokens = readGrokTokensFromFile(config.authFilePath);
  }

  if (!tokens) {
    console.error('[pi-grok] No Grok authentication found. Provide accessToken, authJson, or ensure ~/.grok/auth.json exists.');
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const now = Date.now();
  const buffer = 5 * 60 * 1000;

  if (tokens.expiresAt - buffer < now) {
    console.log('[pi-grok] Access token expired or expiring soon, refreshing...');
    const refreshed = await refreshGrokToken(tokens.refreshToken, config.clientId);

    if (refreshed) {
      tokens = refreshed;
      // TODO: Optionally write back the new tokens to auth.json or a cache
    } else {
      console.error('[pi-grok] Failed to refresh token. Using potentially expired token.');
    }
  }

  return tokens.accessToken;
}
