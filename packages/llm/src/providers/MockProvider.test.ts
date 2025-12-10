import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";
import { MockProvider } from "./MockProvider";

describe("MockProvider", () => {
  let provider: MockProvider;

  beforeEach(() => {
    provider = new MockProvider({
      apiKey: "",
      model: "mock-model",
    });
  });

  describe("constructor", () => {
    it("creates provider with minimal config", () => {
      expect(provider.name).toBe("mock");
      expect(provider.supportedModels).toContain("mock-model");
    });
  });

  describe("complete", () => {
    it("returns parsed response matching schema", async () => {
      const schema = z.object({
        implementation: z.string(),
      });

      provider.setMockResponse({ implementation: "const x = 1;" });

      const result = await provider.complete(
        [{ role: "user", content: "Generate code" }],
        schema,
      );

      expect(result.implementation).toBe("const x = 1;");
    });

    it("validates response against schema", async () => {
      const schema = z.object({
        implementation: z.string(),
        required: z.number(),
      });

      provider.setMockResponse({ implementation: "code" }); // missing required

      await expect(
        provider.complete(
          [{ role: "user", content: "Generate" }],
          schema,
        ),
      ).rejects.toThrow();
    });

    it("records last messages and options", async () => {
      const schema = z.object({ code: z.string() });
      provider.setMockResponse({ code: "test" });

      const messages = [
        { role: "system" as const, content: "You are helpful" },
        { role: "user" as const, content: "Generate code" },
      ];
      const options = { temperature: 0.5 };

      await provider.complete(messages, schema, options);

      expect(provider.getLastMessages()).toEqual(messages);
      expect(provider.getLastOptions()).toEqual(options);
    });

    it("respects configured delay", async () => {
      const schema = z.object({ code: z.string() });
      provider.setMockResponse({ code: "test" });
      provider.setMockDelay(100);

      const start = Date.now();
      await provider.complete(
        [{ role: "user", content: "Generate" }],
        schema,
      );
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it("throws configured error", async () => {
      const schema = z.object({ code: z.string() });
      const testError = new Error("Test error");
      provider.setMockError(testError);

      await expect(
        provider.complete(
          [{ role: "user", content: "Generate" }],
          schema,
        ),
      ).rejects.toThrow("Test error");
    });

    it("fails configured number of times then succeeds", async () => {
      const schema = z.object({ code: z.string() });
      provider.setMockResponse({ code: "success" });
      provider.setFailCount(2);

      // First two calls fail
      await expect(
        provider.complete([{ role: "user", content: "1" }], schema),
      ).rejects.toThrow("Mock failure 1/2");

      await expect(
        provider.complete([{ role: "user", content: "2" }], schema),
      ).rejects.toThrow("Mock failure 2/2");

      // Third call succeeds
      const result = await provider.complete(
        [{ role: "user", content: "3" }],
        schema,
      );
      expect(result.code).toBe("success");
    });

    it("tracks call count", async () => {
      const schema = z.object({ code: z.string() });
      provider.setMockResponse({ code: "test" });

      expect(provider.getCallCount()).toBe(0);

      await provider.complete([{ role: "user", content: "1" }], schema);
      expect(provider.getCallCount()).toBe(1);

      await provider.complete([{ role: "user", content: "2" }], schema);
      expect(provider.getCallCount()).toBe(2);
    });
  });

  describe("stream", () => {
    it("yields configured stream chunks", async () => {
      provider.setMockStreamChunks(["Hello", " ", "World"]);

      const chunks: string[] = [];
      for await (const chunk of provider.stream([
        { role: "user", content: "Hi" },
      ])) {
        chunks.push(chunk.content);
      }

      expect(chunks).toEqual(["Hello", " ", "World"]);
    });

    it("marks last chunk as complete", async () => {
      provider.setMockStreamChunks(["a", "b", "c"]);

      const results: boolean[] = [];
      for await (const chunk of provider.stream([
        { role: "user", content: "Hi" },
      ])) {
        results.push(chunk.isComplete);
      }

      expect(results).toEqual([false, false, true]);
    });

    it("yields single chunk with response if no chunks configured", async () => {
      provider.setMockResponse({ test: "data" });

      const chunks: string[] = [];
      for await (const chunk of provider.stream([
        { role: "user", content: "Hi" },
      ])) {
        chunks.push(chunk.content);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe('{"test":"data"}');
    });

    it("throws configured error", async () => {
      provider.setMockError(new Error("Stream error"));

      const iterator = provider.stream([{ role: "user", content: "Hi" }]);

      await expect(iterator.next()).rejects.toThrow("Stream error");
    });
  });

  describe("configure", () => {
    it("sets all options at once", async () => {
      const schema = z.object({ code: z.string() });

      provider.configure({
        response: { code: "configured" },
        delay: 0,
      });

      const result = await provider.complete(
        [{ role: "user", content: "test" }],
        schema,
      );

      expect(result.code).toBe("configured");
    });
  });

  describe("reset", () => {
    it("clears all mock state", async () => {
      const schema = z.object({ code: z.string() });

      provider.setMockResponse({ code: "before" });
      await provider.complete([{ role: "user", content: "test" }], schema);

      expect(provider.getCallCount()).toBe(1);

      provider.reset();

      expect(provider.getCallCount()).toBe(0);
      expect(provider.getLastMessages()).toEqual([]);
    });
  });

  describe("estimateTokens", () => {
    it("estimates based on character count", () => {
      const messages = [
        { role: "user" as const, content: "Hello world" }, // 11 chars
      ];

      const estimate = provider.estimateTokens(messages);

      // ~4 chars per token, so 11/4 = 2.75 -> 3
      expect(estimate).toBe(3);
    });

    it("sums tokens across multiple messages", () => {
      const messages = [
        { role: "system" as const, content: "You are helpful" }, // 15 chars
        { role: "user" as const, content: "Hello" }, // 5 chars
      ];

      const estimate = provider.estimateTokens(messages);

      // 20/4 = 5
      expect(estimate).toBe(5);
    });
  });

  describe("getMaxContextTokens", () => {
    it("returns large context window", () => {
      expect(provider.getMaxContextTokens()).toBe(128000);
    });
  });
});
