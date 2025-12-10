import type { ILLMProvider, LLMProviderConfig } from "../interfaces";
import type { ProviderType, LLMConfig } from "../config";
import { DEFAULT_MODELS, getApiKeyForProvider } from "../config";
import { OpenAIProvider } from "./OpenAIProvider";
import { AnthropicProvider } from "./AnthropicProvider";
import { GeminiProvider } from "./GeminiProvider";
import { MockProvider } from "./MockProvider";

/**
 * Factory configuration for creating providers.
 */
export interface ProviderFactoryConfig {
  /** Provider type to create */
  provider: ProviderType;
  /** API key (optional, will try env if not provided) */
  apiKey?: string;
  /** Model to use (optional, uses provider default) */
  model?: string;
  /** Custom API base URL */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Create an LLM provider instance.
 *
 * @param config - Factory configuration
 * @returns Provider instance
 */
export function createProvider(config: ProviderFactoryConfig): ILLMProvider {
  const providerConfig: LLMProviderConfig = {
    apiKey: config.apiKey ?? getApiKeyForProvider(config.provider) ?? "",
    model: config.model ?? DEFAULT_MODELS[config.provider],
    baseUrl: config.baseUrl,
    timeout: config.timeout,
  };

  switch (config.provider) {
    case "openai":
      return new OpenAIProvider(providerConfig);
    case "anthropic":
      return new AnthropicProvider(providerConfig);
    case "gemini":
      return new GeminiProvider(providerConfig);
    case "mock":
      return new MockProvider(providerConfig);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

/**
 * Create an LLM provider from full LLM config.
 *
 * @param config - Full LLM configuration
 * @returns Provider instance
 */
export function createProviderFromConfig(config: LLMConfig): ILLMProvider {
  return createProvider({
    provider: config.provider,
    apiKey: config.apiKey,
    model: config.model,
    timeout: config.timeout,
  });
}

/**
 * Get provider information for a given type.
 */
export interface ProviderInfo {
  name: string;
  defaultModel: string;
  description: string;
}

/**
 * Get information about all available providers.
 */
export function getAvailableProviders(): Record<ProviderType, ProviderInfo> {
  return {
    openai: {
      name: "OpenAI",
      defaultModel: DEFAULT_MODELS.openai,
      description: "GPT-5.1-codex for optimized code generation",
    },
    anthropic: {
      name: "Anthropic",
      defaultModel: DEFAULT_MODELS.anthropic,
      description: "Claude with structured outputs for code generation",
    },
    gemini: {
      name: "Google Gemini",
      defaultModel: DEFAULT_MODELS.gemini,
      description: "Gemini 2.0 Flash for fast code generation",
    },
    mock: {
      name: "Mock",
      defaultModel: DEFAULT_MODELS.mock,
      description: "Mock provider for testing",
    },
  };
}
