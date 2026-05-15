import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { DEFAULT_AUTH_PATH, ensureFreshGrokToken } from "./grok-auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_XAI_BASE_URL = "https://api.x.ai/v1";

function resolveEnvApiKey(): string | undefined {
  const candidates = [
    process.env.GROK_BUILD_API_KEY,
    process.env.XAI_API_KEY,
  ];
  for (const v of candidates) {
    const t = v?.trim();
    if (t) return t;
  }
  return undefined;
}

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
  const baseUrl = process.env.XAI_BASE_URL?.trim() || DEFAULT_XAI_BASE_URL;
  const envApiKey = resolveEnvApiKey();
  const authPath = DEFAULT_AUTH_PATH;

  // Two auth paths: a plain xAI API key in the environment (works anywhere,
  // including container/CI/slicc-style setups with no filesystem access to
  // ~/.grok), or the Grok Build CLI's OAuth credentials on disk (refreshed
  // automatically).
  let authSource: string;
  if (envApiKey) {
    authSource = process.env.GROK_BUILD_API_KEY ? "GROK_BUILD_API_KEY env" : "XAI_API_KEY env";
  } else if (fs.existsSync(authPath)) {
    const initialToken = await ensureFreshGrokToken();
    if (!initialToken) {
      console.error(
        `[pi-grok] Could not extract a Grok Build token from ${authPath}. Check the file, re-run 'grok', or set XAI_API_KEY.`
      );
      return;
    }
    authSource = authPath;
  } else {
    console.error(
      `[pi-grok] No credentials. Either set XAI_API_KEY (or GROK_BUILD_API_KEY) in the environment, or run 'grok' once to populate ${authPath}, then restart pi.`
    );
    return;
  }

  purgeStalePiAuth("grok-build");

  // Resolve the apiKey value pi will see for the grok-build provider.
  //
  // - When an API key is in env, point pi straight at the env var name. pi
  //   resolves bare strings via process.env, so this avoids spawning a node
  //   subprocess on every request.
  // - Otherwise use a `!command` apiKey that runs grok-token-cli.js. pi
  //   re-resolves `!`-prefixed values uncached on every request, which gives
  //   us automatic OAuth-style refresh: the CLI reads ~/.grok/auth.json,
  //   refreshes via auth.x.ai when within 5 min of expiry, and writes the
  //   refreshed tokens back atomically.
  let apiKeyCommand: string;
  if (envApiKey) {
    apiKeyCommand = process.env.GROK_BUILD_API_KEY ? "GROK_BUILD_API_KEY" : "XAI_API_KEY";
  } else {
    // Pi may load us from src/ via tsx (no build) or from dist/ via tsc.
    // Locate the compiled CLI shim and a tsx fallback so both modes work.
    const tokenCli = [
      path.join(__dirname, "grok-token-cli.js"),
      path.join(__dirname, "..", "dist", "grok-token-cli.js"),
    ].find((p) => fs.existsSync(p));
    const tokenCliTs = path.join(__dirname, "grok-token-cli.ts");
    if (tokenCli) {
      apiKeyCommand = `!node ${JSON.stringify(tokenCli)}`;
    } else if (fs.existsSync(tokenCliTs)) {
      apiKeyCommand = `!npx --yes tsx ${JSON.stringify(tokenCliTs)}`;
    } else {
      console.error(`[pi-grok] Token resolver script not found near ${__dirname}. Run 'npm run build'.`);
      return;
    }
  }

  // Register a dedicated provider so we don't replace the built-in xAI model
  // list (which the user may also have a regular xai-... API key for). The
  // model id is `grok-build`, matching the value the xAI completions endpoint
  // expects in `model:`.
  pi.registerProvider("grok-build", {
    name: "Grok Build",
    baseUrl,
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
  //
  // When the user has set XAI_API_KEY in the env, skip this override: pi's
  // built-in env-var lookup already picks up XAI_API_KEY for the `xai`
  // provider, and re-registering would force every request through our
  // resolver indirection for no gain.
  if (!process.env.XAI_API_KEY?.trim()) {
    pi.registerProvider("xai", {
      apiKey: apiKeyCommand,
    });
  }

  console.log(`[pi-grok] Registered grok-build model (auth: ${authSource}). Use --model grok-build.`);
}
