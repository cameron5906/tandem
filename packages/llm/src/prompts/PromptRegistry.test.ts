import { describe, it, expect, beforeEach } from "vitest";
import { PromptRegistry } from "./PromptRegistry";
import { HandlerImplementationTemplate } from "./templates/handler-impl";
import { ComponentJSXTemplate } from "./templates/component-impl";
import type { IPromptTemplate, PromptTemplateConfig, LLMMessage } from "../interfaces";

describe("PromptRegistry", () => {
  let registry: PromptRegistry;

  beforeEach(() => {
    registry = new PromptRegistry();
  });

  describe("register", () => {
    it("registers a template", () => {
      const template = new HandlerImplementationTemplate();

      registry.register(template);

      expect(registry.has("handler-implementation", "1.0.0")).toBe(true);
    });

    it("registers template as latest", () => {
      const template = new HandlerImplementationTemplate();

      registry.register(template);

      expect(registry.has("handler-implementation", "latest")).toBe(true);
    });

    it("updates latest when newer version is registered", () => {
      // Create a mock template with version 1.0.0
      const oldTemplate: IPromptTemplate<unknown> = {
        config: {
          id: "test-v1",
          target: "handler-implementation",
          version: "1.0.0",
          description: "Old version",
        },
        buildMessages: () => [],
        estimateTokens: () => 0,
      };

      // Create a mock template with version 2.0.0
      const newTemplate: IPromptTemplate<unknown> = {
        config: {
          id: "test-v2",
          target: "handler-implementation",
          version: "2.0.0",
          description: "New version",
        },
        buildMessages: () => [],
        estimateTokens: () => 0,
      };

      registry.register(oldTemplate);
      registry.register(newTemplate);

      const latest = registry.get("handler-implementation", "latest");
      expect(latest?.config.version).toBe("2.0.0");
    });

    it("does not update latest with older version", () => {
      const newTemplate: IPromptTemplate<unknown> = {
        config: {
          id: "test-v2",
          target: "handler-implementation",
          version: "2.0.0",
          description: "New version",
        },
        buildMessages: () => [],
        estimateTokens: () => 0,
      };

      const oldTemplate: IPromptTemplate<unknown> = {
        config: {
          id: "test-v1",
          target: "handler-implementation",
          version: "1.0.0",
          description: "Old version",
        },
        buildMessages: () => [],
        estimateTokens: () => 0,
      };

      registry.register(newTemplate);
      registry.register(oldTemplate);

      const latest = registry.get("handler-implementation", "latest");
      expect(latest?.config.version).toBe("2.0.0");
    });
  });

  describe("get", () => {
    it("returns template by target and version", () => {
      const template = new HandlerImplementationTemplate();
      registry.register(template);

      const result = registry.get("handler-implementation", "1.0.0");

      expect(result).toBe(template);
    });

    it("returns latest by default", () => {
      const template = new HandlerImplementationTemplate();
      registry.register(template);

      const result = registry.get("handler-implementation");

      expect(result).toBe(template);
    });

    it("returns undefined for unregistered template", () => {
      const result = registry.get("handler-implementation");

      expect(result).toBeUndefined();
    });
  });

  describe("has", () => {
    it("returns true for registered template", () => {
      registry.register(new HandlerImplementationTemplate());

      expect(registry.has("handler-implementation")).toBe(true);
    });

    it("returns false for unregistered template", () => {
      expect(registry.has("handler-implementation")).toBe(false);
    });
  });

  describe("list", () => {
    it("lists all registered templates", () => {
      registry.register(new HandlerImplementationTemplate());
      registry.register(new ComponentJSXTemplate());

      const list = registry.list();

      expect(list.length).toBe(2);
      expect(list.map((t) => t.target)).toContain("handler-implementation");
      expect(list.map((t) => t.target)).toContain("component-jsx");
    });

    it("excludes 'latest' versions from list", () => {
      registry.register(new HandlerImplementationTemplate());

      const list = registry.list();

      expect(list.every((t) => t.version !== "latest")).toBe(true);
    });
  });

  describe("clear", () => {
    it("removes all templates", () => {
      registry.register(new HandlerImplementationTemplate());
      registry.register(new ComponentJSXTemplate());

      registry.clear();

      expect(registry.has("handler-implementation")).toBe(false);
      expect(registry.has("component-jsx")).toBe(false);
    });
  });
});
