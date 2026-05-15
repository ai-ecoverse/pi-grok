import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import {
  DEFAULT_AUTH_PATH,
  XAI_AUTH_KEY,
  ensureFreshGrokToken,
} from "./grok-auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const XAI_BASE_URL = "https://api.x.ai/v1";

/**
 * Clear any stale `grok-build` credential left behind by an older version of
 * this extension that wrote API keys directly into pi's auth.json. Such a
 * credential would shadow the live token we read from ~/.grok/auth.json and
 * inevitably expire, producing 401s that look like "auth is configured but
 * the API rejects it".
 */
function purgeStalePiAuth(provider: string): void {
  const candidates = [
    path.join(os.homedir(), ".pi", "agent", "auth.json"),
    path.join(os.homedir(), ".config", "pi", "agent", "auth.json"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, unknown>;
      if (!(provider in data)) continue;
      delete data[provider];
      fs.writeFileSync(file, JSON.stringify(data, null, 2), { mode: 0o600 });
      console.log(`[pi-grok] Removed stale ${provider} credential from ${file}.`);
    } catch (err) {
      console.error(`[pi-grok] Could not clean ${file}:`, err);
    }
  }
}

export default async function (pi: ExtensionAPI): Promise<void> {
  const authPath = DEFAULT_AUTH_PATH;
  if (!fs.existsSync(authPath)) {
    console.error(
      `[pi-grok] ${authPath} not found. Run 'grok' once to sign in to Grok Build, then restart pi.`
    );
    return;
  }

  // Verify we can read (and if needed, refresh) the token before we register
  // the provider. This lets us fail loudly on startup rather than the first
  // time the model is called.
  const initialToken = await ensureFreshGrokToken();
  if (!initialToken) {
    console.error(
      `[pi-grok] Could not extract a Grok Build token from ${authPath}. Check the file or re-run 'grok'.`
    );
    return;
  }

  purgeStalePiAuth("grok-build");

  // pi resolves `!`-prefixed apiKey values by running the command on every
  // request (uncached), so this gives us automatic OAuth-style refresh: the
  // CLI reads ~/.grok/auth.json, refreshes via auth.x.ai when the access
  // token is within 5 minutes of expiry, writes the new tokens back, and
  // prints the current access token.
  // Pi may load us from src/ via tsx (no build) or from dist/ via tsc.
  // Locate the compiled CLI shim and a tsx fallback so both modes work.
  const tokenCli = [
    path.join(__dirname, "grok-token-cli.js"),
    path.join(__dirname, "..", "dist", "grok-token-cli.js"),
  ].find((p) => fs.existsSync(p));
  const tokenCliTs = path.join(__dirname, "grok-token-cli.ts");
  let apiKeyCommand: string;
  if (tokenCli) {
    apiKeyCommand = `!node ${JSON.stringify(tokenCli)}`;
  } else if (fs.existsSync(tokenCliTs)) {
    apiKeyCommand = `!npx --yes tsx ${JSON.stringify(tokenCliTs)}`;
  } else {
    console.error(`[pi-grok] Token resolver script not found near ${__dirname}. Run 'npm run build'.`);
    return;
  }

  // Register a dedicated provider so we don't replace the built-in xAI model
  // list (which the user may also have a regular xai-... API key for). The
  // model id is `grok-build`, matching the value the xAI completions endpoint
  // expects in `model:`.
  pi.registerProvider("grok-build", {
    name: "Grok Build",
    baseUrl: XAI_BASE_URL,
    api: "openai-completions",
    apiKey: apiKeyCommand,
    models: [
      {
        id: "grok-build",
        name: "Grok Build",
        // grok-build serves xAI's reasoning internally and rejects an explicit
        // reasoning_effort parameter, so we expose it as a non-reasoning model.
        reasoning: false,
        input: ["text", "image"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 200000,
        maxTokens: 32768,
        compat: {
          maxTokensField: "max_tokens",
        },
      },
    ],
  });

  // Also overload auth on the built-in `xai` provider so users can reach the
  // other Grok models (grok-4.3, grok-code-fast-1, ...) with the same Grok
  // Build credentials. This is an override-only registration — no models are
  // touched, just the apiKey resolver.
  pi.registerProvider("xai", {
    apiKey: apiKeyCommand,
  });

  // Surface the auth source in the Grok Build entry's expires_at so the user
  // can tell at a glance the token is being managed by this extension.
  const expiresAt = (() => {
    try {
      const raw = JSON.parse(fs.readFileSync(authPath, "utf-8")) as Record<
        string,
        { expires_at?: string }
      >;
      return raw[XAI_AUTH_KEY]?.expires_at;
    } catch {
      return undefined;
    }
  })();
  console.log(
    `[pi-grok] Registered grok-build model (token valid until ${expiresAt ?? "unknown"}). Use --model grok-build.`
  );
}
