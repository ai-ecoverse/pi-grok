/**
 * Pi Grok Build Extension
 *
 * First-class native support for Grok Build inside the Pi Coding Agent.
 *
 * - Reads ~/.grok/auth.json automatically
 * - Supports manual token / full auth.json via config
 * - Automatic token refresh (basic version)
 * - Exposes model "grok-build" with full reasoning effort support
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getValidGrokAccessToken } from "./grok-auth.js";
import type { GrokBuildProviderConfig } from "./types.js";

export default async function (pi: ExtensionAPI, userConfig: GrokBuildProviderConfig = {}) {
  console.log("[pi-grok] Loading Grok Build provider...");

  const accessToken = await getValidGrokAccessToken(userConfig);

  if (!accessToken) {
    console.error("[pi-grok] Could not obtain a valid access token for Grok.");
    console.error("[pi-grok] Either run Grok Build at least once to generate ~/.grok/auth.json,");
    console.error("[pi-grok] or provide 'accessToken' / 'authJson' in the extension config.");
    return;
  }

  // Register the native grok-build provider
  pi.registerProvider("grok-build", {
    name: "Grok Build (xAI)",
    baseUrl: userConfig.baseUrl ?? "https://api.x.ai/v1",
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

  console.log("[pi-grok] Successfully registered provider 'grok-build'.");
  console.log("[pi-grok] You can now use: /model grok-build  or  pi --model grok-build");
}
