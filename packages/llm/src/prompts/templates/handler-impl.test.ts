import { describe, it, expect } from "vitest";
import { HandlerImplementationTemplate } from "./handler-impl";
import type { HandlerGenerationContext } from "../../interfaces";
import type { IRIntent } from "@tandem-lang/compiler";
import { simpleType } from "@tandem-lang/compiler";

describe("HandlerImplementationTemplate", () => {
  const template = new HandlerImplementationTemplate();

  function createContext(
    overrides: Partial<HandlerGenerationContext> = {},
  ): HandlerGenerationContext {
    const intent: IRIntent = {
      kind: "route",
      name: "api.users.GetUser",
      inputType: {
        fields: [{ name: "id", type: simpleType("UUID") }],
      },
      outputType: simpleType("api.users.User"),
      spec: "Fetch a user by their unique ID",
    };

    return {
      intent,
      inputType: {
        fqn: "GetUserInput",
        kind: "record",
        fields: [{ name: "id", type: "string", isOptional: false }],
        tsType: "{ id: string }",
      },
      outputType: {
        fqn: "api.users.User",
        kind: "record",
        fields: [
          { name: "id", type: "string", isOptional: false },
          { name: "name", type: "string", isOptional: false },
          { name: "email", type: "string", isOptional: false },
        ],
        tsType: "User",
      },
      httpMethod: "GET",
      routePath: "/getUser",
      relatedTypes: [],
      moduleName: "api.users",
      spec: "Fetch a user by their unique ID",
      ...overrides,
    };
  }

  describe("config", () => {
    it("has correct target", () => {
      expect(template.config.target).toBe("handler-implementation");
    });

    it("has version", () => {
      expect(template.config.version).toBe("1.0.0");
    });
  });

  describe("buildMessages", () => {
    it("returns system and user messages", () => {
      const context = createContext();
      const messages = template.buildMessages(context);

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("system");
      expect(messages[1].role).toBe("user");
    });

    it("includes intent name in user prompt", () => {
      const context = createContext();
      const messages = template.buildMessages(context);

      expect(messages[1].content).toContain("api.users.GetUser");
    });

    it("includes HTTP method in user prompt", () => {
      const context = createContext();
      const messages = template.buildMessages(context);

      expect(messages[1].content).toContain("GET");
    });

    it("includes specification in user prompt", () => {
      const context = createContext();
      const messages = template.buildMessages(context);

      expect(messages[1].content).toContain("Fetch a user by their unique ID");
    });

    it("includes input type fields", () => {
      const context = createContext();
      const messages = template.buildMessages(context);

      expect(messages[1].content).toContain("id");
      expect(messages[1].content).toContain("string");
    });

    it("includes output type", () => {
      const context = createContext();
      const messages = template.buildMessages(context);

      expect(messages[1].content).toContain("User");
    });

    it("mentions req.query for GET requests", () => {
      const context = createContext({ httpMethod: "GET" });
      const messages = template.buildMessages(context);

      expect(messages[1].content).toContain("req.query");
    });

    it("mentions req.body for POST requests", () => {
      const context = createContext({ httpMethod: "POST" });
      const messages = template.buildMessages(context);

      expect(messages[1].content).toContain("req.body");
    });

    it("includes related types when present", () => {
      const context = createContext({
        relatedTypes: [
          {
            fqn: "api.users.UserRole",
            kind: "alias",
            tsType: "string",
          },
        ],
      });
      const messages = template.buildMessages(context);

      expect(messages[1].content).toContain("UserRole");
    });
  });

  describe("estimateTokens", () => {
    it("estimates tokens based on message length", () => {
      const context = createContext();
      const tokens = template.estimateTokens(context);

      // Should be positive
      expect(tokens).toBeGreaterThan(0);

      // Should be roughly 1/4 of character count
      const messages = template.buildMessages(context);
      const chars = messages.reduce((sum, m) => sum + m.content.length, 0);
      expect(tokens).toBe(Math.ceil(chars / 4));
    });
  });
});
