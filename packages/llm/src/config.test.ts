import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  loadConfigFromEnv,
  loadConfig,
  validateConfig,
  DEFAULT_MODELS,
  DEFAULT_LLM_CONFIG,
} from "./config";

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("loadConfigFromEnv", () => {
    it("loads provider from TANDEM_LLM_PROVIDER", () => {
      process.env.TANDEM_LLM_PROVIDER = "anthropic";

      const config = loadConfigFromEnv();

      expect(config.provider).toBe("anthropic");
    });

    it("loads OpenAI API key", () => {
      process.env.OPENAI_API_KEY = "sk-test123";

      const config = loadConfigFromEnv();

      expect(config.apiKey).toBe("sk-test123");
    });

    it("loads Anthropic API key", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";

      const config = loadConfigFromEnv();

      expect(config.apiKey).toBe("sk-ant-test");
    });

    it("loads Gemini API key", () => {
      process.env.GEMINI_API_KEY = "gemini-key";

      const config = loadConfigFromEnv();

      expect(config.apiKey).toBe("gemini-key");
    });

    it("prefers OpenAI key when multiple are set", () => {
      process.env.OPENAI_API_KEY = "openai-key";
      process.env.ANTHROPIC_API_KEY = "anthropic-key";

      const config = loadConfigFromEnv();

      expect(config.apiKey).toBe("openai-key");
    });

    it("loads model from TANDEM_LLM_MODEL", () => {
      process.env.TANDEM_LLM_MODEL = "gpt-5-mini";

      const config = loadConfigFromEnv();

      expect(config.model).toBe("gpt-5-mini");
    });

    it("loads temperature from TANDEM_LLM_TEMPERATURE", () => {
      process.env.TANDEM_LLM_TEMPERATURE = "0.7";

      const config = loadConfigFromEnv();

      expect(config.temperature).toBe(0.7);
    });

    it("loads maxRetries from TANDEM_LLM_MAX_RETRIES", () => {
      process.env.TANDEM_LLM_MAX_RETRIES = "5";

      const config = loadConfigFromEnv();

      expect(config.maxRetries).toBe(5);
    });

    it("loads timeout from TANDEM_LLM_TIMEOUT", () => {
      process.env.TANDEM_LLM_TIMEOUT = "120000";

      const config = loadConfigFromEnv();

      expect(config.timeout).toBe(120000);
    });

    it("returns partial config with only set values", () => {
      // No env vars set
      const config = loadConfigFromEnv();

      expect(config.provider).toBeUndefined();
      expect(config.apiKey).toBeUndefined();
      expect(config.model).toBeUndefined();
    });
  });

  describe("loadConfig", () => {
    it("applies defaults when no config is provided", () => {
      const config = loadConfig();

      expect(config.provider).toBe(DEFAULT_LLM_CONFIG.provider);
      expect(config.temperature).toBe(DEFAULT_LLM_CONFIG.temperature);
      expect(config.maxRetries).toBe(DEFAULT_LLM_CONFIG.maxRetries);
      expect(config.validateOutput).toBe(DEFAULT_LLM_CONFIG.validateOutput);
    });

    it("sets default model based on provider", () => {
      process.env.TANDEM_LLM_PROVIDER = "anthropic";

      const config = loadConfig();

      expect(config.model).toBe(DEFAULT_MODELS.anthropic);
    });

    it("environment overrides defaults", () => {
      process.env.TANDEM_LLM_TEMPERATURE = "0.8";

      const config = loadConfig();

      expect(config.temperature).toBe(0.8);
    });
  });

  describe("validateConfig", () => {
    it("passes for mock provider without API key", () => {
      const config = {
        ...DEFAULT_LLM_CONFIG,
        provider: "mock" as const,
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it("throws for OpenAI provider without API key", () => {
      const config = {
        ...DEFAULT_LLM_CONFIG,
        provider: "openai" as const,
        apiKey: undefined,
      };

      expect(() => validateConfig(config)).toThrow(
        /API key required for openai/,
      );
    });

    it("throws for Anthropic provider without API key", () => {
      const config = {
        ...DEFAULT_LLM_CONFIG,
        provider: "anthropic" as const,
        apiKey: undefined,
      };

      expect(() => validateConfig(config)).toThrow(
        /API key required for anthropic/,
      );
    });

    it("passes with valid API key", () => {
      const config = {
        ...DEFAULT_LLM_CONFIG,
        provider: "openai" as const,
        apiKey: "sk-test123",
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it("throws for temperature out of range (too high)", () => {
      const config = {
        ...DEFAULT_LLM_CONFIG,
        provider: "mock" as const,
        temperature: 1.5,
      };

      expect(() => validateConfig(config)).toThrow(
        /Temperature must be between 0.0 and 1.0/,
      );
    });

    it("throws for temperature out of range (negative)", () => {
      const config = {
        ...DEFAULT_LLM_CONFIG,
        provider: "mock" as const,
        temperature: -0.1,
      };

      expect(() => validateConfig(config)).toThrow(
        /Temperature must be between 0.0 and 1.0/,
      );
    });

    it("throws for maxRetries less than 1", () => {
      const config = {
        ...DEFAULT_LLM_CONFIG,
        provider: "mock" as const,
        maxRetries: 0,
      };

      expect(() => validateConfig(config)).toThrow(
        /maxRetries must be at least 1/,
      );
    });
  });

  describe("DEFAULT_MODELS", () => {
    it("has default model for each provider", () => {
      expect(DEFAULT_MODELS.openai).toBe("gpt-5-codex");
      expect(DEFAULT_MODELS.anthropic).toBe("claude-sonnet-4-5-20250929");
      expect(DEFAULT_MODELS.gemini).toBe("gemini-2.5-flash");
      expect(DEFAULT_MODELS.mock).toBe("mock-model");
    });
  });
});
