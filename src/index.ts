/**
 * Pi Grok Build Extension - Full Version
 *
 * Provides first-class support for Grok Build using Pi's OAuth credential system.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  grokBuildLogin,
  grokBuildRefreshToken,
  grokBuildGetApiKey,
} from "./grok-oauth.js";

export default async function (pi: ExtensionAPI) {
  console.log("[pi-grok] Registering Grok Build with OAuth support...");

  pi.registerProvider("grok-build", {
    name: "Grok Build (xAI)",
    baseUrl: "https://api.x.ai/v1",
    api: "openai-completions",
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
    oauth: {
      name: "Grok Build",
      login: grokBuildLogin,
      refreshToken: grokBuildRefreshToken,
      getApiKey: grokBuildGetApiKey,
    },
  });

  console.log("[pi-grok] Registered 'grok-build' with automatic token refresh.");
  console.log("[pi-grok] You can now use: /model grok-build or /login grok-build");
}
