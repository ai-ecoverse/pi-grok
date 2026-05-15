#!/usr/bin/env node
/**
 * Prints a fresh Grok Build access token to stdout. Used as a `!command`
 * apiKey resolver so that pi reads (and, if necessary, refreshes) the token
 * from ~/.grok/auth.json on every request.
 *
 * Honors a couple of env vars so the extension can pass non-default config:
 *   PI_GROK_AUTH_FILE - alternate path to auth.json
 *   PI_GROK_CLIENT_ID - alternate OAuth client id
 */
import { ensureFreshGrokToken } from "./grok-auth.js";

async function main(): Promise<void> {
  const token = await ensureFreshGrokToken({
    authFilePath: process.env.PI_GROK_AUTH_FILE,
    clientId: process.env.PI_GROK_CLIENT_ID,
  });
  if (!token) {
    process.stderr.write(
      "pi-grok: could not obtain a Grok Build access token. Run `grok` once to sign in.\n"
    );
    process.exit(1);
  }
  process.stdout.write(token);
}

main().catch((err) => {
  process.stderr.write(`pi-grok: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
