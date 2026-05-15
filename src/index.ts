/**
 * Pi Grok Build Extension - Production Version
 *
 * Provides first-class, native support for Grok Build in Pi.
 * Includes real streamSimple delegation with per-request fresh token resolution.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type {
  Context,
  Model,
  SimpleStreamOptions,
  AssistantMessageEventStream,
} from "@earendil-works/pi-ai";
import { streamSimpleOpenAICompletions } from "@earendil-works/pi-ai";
import {
  grokBuildLogin,
  grokBuildRefreshToken,
  grokBuildGetApiKey,
} from "./grok-oauth.js";
import { getValidGrokAccessToken } from "./grok-auth.js";
import type { GrokBuildProviderConfig } from "./types.js";

export default async function (pi: ExtensionAPI, userConfig: GrokBuildProviderConfig = {}) {
  console.log("[pi-grok] Initializing Grok Build provider with real streaming...");

  // Create a custom streamSimple that always resolves a fresh token
  const streamSimpleGrokBuild = async (
    model: Model<"openai-completions">,
    context: Context,
    options?: SimpleStreamOptions
  ): Promise<AssistantMessageEventStream> => {
    // Always get a fresh (possibly refreshed) token for this request
    const freshToken = await getValidGrokAccessToken(userConfig);

    if (!freshToken) {
      throw new Error("Failed to obtain valid Grok access token for streaming.");
    }

    // Create a temporary model copy with the fresh token
    const grokModel: Model<"openai-completions"> = {
      ...model,
      provider: "grok-build",
      // Override apiKey with fresh token
      // Note: The actual Model type may store it differently; we pass via options if needed
    };

    // Delegate to the real OpenAI completions streamer
    // We pass the fresh token via the options mechanism if supported,
    // otherwise we rely on the fact that Pi will use getApiKey from the oauth handler.
    return streamSimpleOpenAICompletions(grokModel, context, {
      ...options,
      // Some versions allow overriding apiKey per call
      // @ts-ignore - dynamic override
      apiKey: freshToken,
    });
  };

  pi.registerProvider("grok-build", {
    name: "Grok Build (xAI)",
    baseUrl: "https://api.x.ai/v1",
    api: "openai-completions",
    // Provide our own streamSimple for true per-request token freshness
    streamSimple: streamSimpleGrokBuild as any,

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

    // Still register OAuth for /login and Pi's credential system
    oauth: {
      name: "Grok Build",
      login: grokBuildLogin,
      refreshToken: grokBuildRefreshToken,
      getApiKey: grokBuildGetApiKey,
    },
  });

  console.log("[pi-grok] Registered 'grok-build' with real streamSimple + auto-refresh.");
}
