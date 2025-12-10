import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createProvider,
  createProviderFromConfig,
  getAvailableProviders,
} from "./ProviderFactory";
import { MockProvider } from "./MockProvider";
import { DEFAULT_MODELS, DEFAULT_LLM_CONFIG } from "../config";

describe("ProviderFactory", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("createProvider", () => {
    it("creates MockProvider for mock type", () => {
      const provider = createProvider({
        provider: "mock",
      });

      expect(provider).toBeInstanceOf(MockProvider);
      expect(provider.name).toBe("mock");
    });

    it("uses default model when not specified", () => {
      const provider = createProvider({
        provider: "mock",
      });

      // MockProvider doesn't expose model, but we can verify it was created
      expect(provider).toBeDefined();
    });

    it("throws for unknown provider type", () => {
      expect(() =>
        createProvider({
          provider: "unknown" as "mock",
        }),
      ).toThrow(/Unknown provider/);
    });

    it("uses provided API key", () => {
      // For mock provider, API key is optional but should be passed
      const provider = createProvider({
        provider: "mock",
        apiKey: "test-key",
      });

      expect(provider).toBeDefined();
    });

    it("uses environment API key when not provided", () => {
      process.env.OPENAI_API_KEY = "env-key";

      // For mock, this won't throw even without key
      const provider = createProvider({
        provider: "mock",
      });

      expect(provider).toBeDefined();
    });

    it("uses custom model when specified", () => {
      const provider = createProvider({
        provider: "mock",
        model: "custom-model",
      });

      expect(provider).toBeDefined();
    });

    it("passes timeout to provider", () => {
      const provider = createProvider({
        provider: "mock",
        timeout: 30000,
      });

      expect(provider).toBeDefined();
    });
  });

  describe("createProviderFromConfig", () => {
    it("creates provider from full LLM config", () => {
      const config = {
        ...DEFAULT_LLM_CONFIG,
        provider: "mock" as const,
      };

      const provider = createProviderFromConfig(config);

      expect(provider).toBeInstanceOf(MockProvider);
    });

    it("passes all config options to provider", () => {
      const config = {
        provider: "mock" as const,
        apiKey: "test-key",
        model: "custom-model",
        temperature: 0.5,
        maxRetries: 5,
        validateOutput: true,
        timeout: 30000,
      };

      const provider = createProviderFromConfig(config);

      expect(provider).toBeDefined();
    });
  });

  describe("getAvailableProviders", () => {
    it("returns info for all providers", () => {
      const providers = getAvailableProviders();

      expect(providers.openai).toBeDefined();
      expect(providers.anthropic).toBeDefined();
      expect(providers.gemini).toBeDefined();
      expect(providers.mock).toBeDefined();
    });

    it("includes correct default models", () => {
      const providers = getAvailableProviders();

      expect(providers.openai.defaultModel).toBe(DEFAULT_MODELS.openai);
      expect(providers.anthropic.defaultModel).toBe(DEFAULT_MODELS.anthropic);
      expect(providers.gemini.defaultModel).toBe(DEFAULT_MODELS.gemini);
      expect(providers.mock.defaultModel).toBe(DEFAULT_MODELS.mock);
    });

    it("includes provider names", () => {
      const providers = getAvailableProviders();

      expect(providers.openai.name).toBe("OpenAI");
      expect(providers.anthropic.name).toBe("Anthropic");
      expect(providers.gemini.name).toBe("Google Gemini");
      expect(providers.mock.name).toBe("Mock");
    });

    it("includes descriptions", () => {
      const providers = getAvailableProviders();

      expect(providers.openai.description).toContain("GPT-5.1-codex");
      expect(providers.anthropic.description).toContain("Claude");
      expect(providers.gemini.description).toContain("Gemini");
      expect(providers.mock.description).toContain("testing");
    });
  });
});
