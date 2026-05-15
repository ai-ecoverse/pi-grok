/**
 * OAuth-style adapter for Grok Build authentication.
 *
 * This allows Pi to treat Grok Build as a first-class OAuth provider
 * with automatic login + refresh support.
 */

import type { OAuthCredentials, OAuthLoginCallbacks } from "@earendil-works/pi-ai";
import { readGrokTokensFromFile, refreshGrokToken } from "./grok-auth.js";

const DEFAULT_AUTH_PATH = "~/.grok/auth.json";

export async function grokBuildLogin(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
  // Try to read existing tokens from disk
  const tokens = readGrokTokensFromFile();

  if (tokens) {
    return {
      access: tokens.accessToken,
      refresh: tokens.refreshToken,
      expires: tokens.expiresAt,
    };
  }

  // No tokens found — ask the user to authenticate with Grok Build first
  await callbacks.onPrompt({
    message: "No Grok Build authentication found.\nPlease run 'grok' once in your terminal to log in, then press Enter.",
  });

  // Try again after user confirmation
  const newTokens = readGrokTokensFromFile();
  if (!newTokens) {
    throw new Error("Still no Grok authentication found after prompting user.");
  }

  return {
    access: newTokens.accessToken,
    refresh: newTokens.refreshToken,
    expires: newTokens.expiresAt,
  };
}

export async function grokBuildRefreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials> {
  const refreshed = await refreshGrokToken(credentials.refresh);

  if (!refreshed) {
    throw new Error("Failed to refresh Grok Build access token.");
  }

  return {
    access: refreshed.accessToken,
    refresh: refreshed.refreshToken,
    expires: refreshed.expiresAt,
  };
}

export function grokBuildGetApiKey(credentials: OAuthCredentials): string {
  return credentials.access;
}
