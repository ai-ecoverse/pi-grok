/**
 * Pi Grok Build Extension
 *
 * First-class support for Grok Build in the Pi Coding Agent.
 *
 * Features:
 * - Reads authentication from ~/.grok/auth.json (with auto-refresh)
 * - Supports direct token or full auth.json via configuration
 * - Model: "grok-build"
 * - Full reasoning effort support (low, medium, high, xhigh, max)
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getValidGrokAccessToken } from "./grok-auth.js";
import type { GrokBuildProviderConfig } from "./types.js";

export default async function (pi: ExtensionAPI, config: GrokBuildProviderConfig = {}) {
  console.log("[pi-grok] Initializing Grok Build provider...");

  // Get a valid access token (this will trigger refresh if needed)
  const accessToken = await getValidGrokAccessToken(config);

  if (!accessToken) {
    console.error("[pi-grok] Failed to obtain a valid Grok access token.");
    console.error("[pi-grok] Make sure you are logged into Grok Build, or provide accessToken/authJson in config.");
    return;
  }

  // Register the grok-build provider
  pi.registerProvider("grok-build", {
    name: "Grok Build (xAI)",
    baseUrl: config.baseUrl || "https://api.x.ai/v1",
    apiKey: accessToken,
    api: "openai-completions",
    authHeader: true,
    models: [
      {
        id: "grok-build",
        name: "Grok Build",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 200000,
        maxTokens: 32768,
        thinkingLevelMap: {
          off: null,
          minimal: "low",
          low: "low",
          medium: "medium",
          high: "high",
          xhigh: "xhigh",
        },
        compat: {
          supportsReasoningEffort: true,
          maxTokensField: "max_tokens",
        },
      },
    ],
  });

  console.log("[pi-grok] Successfully registered 'grok-build' provider with automatic token management.");
}
