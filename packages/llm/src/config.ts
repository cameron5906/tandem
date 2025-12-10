import { existsSync, readFileSync } from "fs";
import { join } from "path";

/**
 * Supported LLM provider types.
 */
export type ProviderType = "openai" | "anthropic" | "gemini" | "mock";

/**
 * LLM-specific configuration.
 */
export interface LLMConfig {
  /** LLM provider to use */
  provider: ProviderType;
  /** API key for the provider */
  apiKey?: string;
  /** Model identifier */
  model?: string;
  /** Generation temperature (0.0 - 1.0) */
  temperature?: number;
  /** Maximum retries on failure */
  maxRetries?: number;
  /** Whether to validate generated code */
  validateOutput?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Full Tandem configuration including LLM settings.
 */
export interface TandemConfig {
  llm: LLMConfig;
}

/**
 * Default models for each provider.
 */
export const DEFAULT_MODELS: Record<ProviderType, string> = {
  openai: "gpt-5-codex",
  anthropic: "claude-sonnet-4-5-20250929",
  gemini: "gemini-2.5-flash",
  mock: "mock-model",
};

/**
 * Default LLM configuration.
 */
export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: "openai",
  temperature: 0.2,
  maxRetries: 3,
  validateOutput: true,
  timeout: 60000,
};

/**
 * Environment variable names for each provider's API key.
 */
const API_KEY_ENV_VARS: Record<ProviderType, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  mock: "",
};

/**
 * Config file names to search for (in order of preference).
 */
const CONFIG_FILE_NAMES = [
  "tandem.config.json",
  ".tandemrc",
  ".tandemrc.json",
];

/**
 * Load configuration from environment variables.
 */
export function loadConfigFromEnv(): Partial<LLMConfig> {
  const provider = process.env.TANDEM_LLM_PROVIDER as ProviderType | undefined;

  // Get API key based on provider or try all
  let apiKey: string | undefined;
  if (provider) {
    apiKey = process.env[API_KEY_ENV_VARS[provider]];
  } else {
    // Try to find any API key
    apiKey =
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GEMINI_API_KEY;
  }

  return {
    provider,
    apiKey,
    model: process.env.TANDEM_LLM_MODEL,
    temperature: process.env.TANDEM_LLM_TEMPERATURE
      ? parseFloat(process.env.TANDEM_LLM_TEMPERATURE)
      : undefined,
    maxRetries: process.env.TANDEM_LLM_MAX_RETRIES
      ? parseInt(process.env.TANDEM_LLM_MAX_RETRIES, 10)
      : undefined,
    timeout: process.env.TANDEM_LLM_TIMEOUT
      ? parseInt(process.env.TANDEM_LLM_TIMEOUT, 10)
      : undefined,
  };
}

/**
 * Load configuration from a config file.
 *
 * @param searchDir - Directory to search for config files (defaults to cwd)
 * @returns Parsed configuration or null if not found
 */
export function loadConfigFromFile(searchDir?: string): TandemConfig | null {
  const dir = searchDir || process.cwd();

  for (const filename of CONFIG_FILE_NAMES) {
    const filepath = join(dir, filename);
    if (existsSync(filepath)) {
      try {
        const content = readFileSync(filepath, "utf-8");
        return JSON.parse(content) as TandemConfig;
      } catch {
        // Invalid JSON, continue to next file
        continue;
      }
    }
  }

  return null;
}

/**
 * Merge configurations with proper precedence.
 * Priority: env > file > defaults
 *
 * @param fileConfig - Configuration from file
 * @param envConfig - Configuration from environment
 * @returns Merged configuration
 */
function mergeConfigs(
  fileConfig: Partial<LLMConfig> | undefined,
  envConfig: Partial<LLMConfig>,
): LLMConfig {
  return {
    ...DEFAULT_LLM_CONFIG,
    ...fileConfig,
    ...Object.fromEntries(
      Object.entries(envConfig).filter(([, v]) => v !== undefined),
    ),
  };
}

/**
 * Load and merge configuration from all sources.
 * Priority: environment variables > config file > defaults
 *
 * @param searchDir - Directory to search for config files
 * @returns Complete LLM configuration
 */
export function loadConfig(searchDir?: string): LLMConfig {
  const envConfig = loadConfigFromEnv();
  const fileConfig = loadConfigFromFile(searchDir);
  const config = mergeConfigs(fileConfig?.llm, envConfig);

  // Set default model if not specified
  if (!config.model) {
    config.model = DEFAULT_MODELS[config.provider];
  }

  // Infer provider from API key if not specified
  if (!config.provider && config.apiKey) {
    if (process.env.OPENAI_API_KEY) {
      config.provider = "openai";
    } else if (process.env.ANTHROPIC_API_KEY) {
      config.provider = "anthropic";
    } else if (process.env.GEMINI_API_KEY) {
      config.provider = "gemini";
    }
  }

  return config;
}

/**
 * Get the API key for a specific provider.
 *
 * @param provider - Provider type
 * @returns API key or undefined
 */
export function getApiKeyForProvider(provider: ProviderType): string | undefined {
  return process.env[API_KEY_ENV_VARS[provider]];
}

/**
 * Validate that required configuration is present.
 *
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateConfig(config: LLMConfig): void {
  if (config.provider !== "mock" && !config.apiKey) {
    const envVar = API_KEY_ENV_VARS[config.provider];
    throw new Error(
      `API key required for ${config.provider} provider. ` +
        `Set ${envVar} environment variable or add to config file.`,
    );
  }

  if (config.temperature !== undefined) {
    if (config.temperature < 0 || config.temperature > 1) {
      throw new Error("Temperature must be between 0.0 and 1.0");
    }
  }

  if (config.maxRetries !== undefined && config.maxRetries < 1) {
    throw new Error("maxRetries must be at least 1");
  }
}
