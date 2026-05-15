#!/usr/bin/env node
/**
 * Prints a fresh xAI access token to stdout. Used as a `!command` apiKey
 * resolver so pi reads (and, if necessary, refreshes) the token on every
 * request.
 *
 * Resolution order (first match wins):
 *   1. GROK_BUILD_API_KEY   - most specific override for this provider
 *   2. XAI_API_KEY          - standard xAI env var (matches Hermes Agent,
 *                             the official xAI examples, and pi's built-in
 *                             `xai` provider). A plain `xai-...` API key
 *                             from console.x.ai works here.
 *   3. ~/.grok/auth.json    - Grok Build CLI OAuth credentials, with
 *                             automatic refresh against auth.x.ai
 *
 * Other env vars:
 *   PI_GROK_AUTH_FILE - alternate path to auth.json
 *   PI_GROK_CLIENT_ID - alternate OAuth client id (for the refresh request)
 */
import { ensureFreshGrokToken } from "./grok-auth.js";

async function main(): Promise<void> {
  const envKey = process.env.GROK_BUILD_API_KEY?.trim() || process.env.XAI_API_KEY?.trim();
  if (envKey) {
    process.stdout.write(envKey);
    return;
  }

  const token = await ensureFreshGrokToken({
    authFilePath: process.env.PI_GROK_AUTH_FILE,
    clientId: process.env.PI_GROK_CLIENT_ID,
  });
  if (!token) {
    process.stderr.write(
      "pi-grok: no XAI_API_KEY / GROK_BUILD_API_KEY in env and no Grok Build credentials at ~/.grok/auth.json. Set one or run `grok` once to sign in.\n"
    );
    process.exit(1);
  }
  process.stdout.write(token);
}

main().catch((err) => {
  process.stderr.write(`pi-grok: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
