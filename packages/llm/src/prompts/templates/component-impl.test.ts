import { describe, it, expect } from "vitest";
import { ComponentJSXTemplate } from "./component-impl";
import type { ComponentGenerationContext } from "../../interfaces";
import type { IRComponent, IRIntent } from "@tandem-lang/compiler";
import { simpleType } from "@tandem-lang/compiler";

describe("ComponentJSXTemplate", () => {
  const template = new ComponentJSXTemplate();

  function createContext(
    overrides: Partial<ComponentGenerationContext> = {},
  ): ComponentGenerationContext {
    const component: IRComponent = {
      name: "app.users.UserCard",
      element: "card",
      displays: simpleType("api.users.User"),
      actions: ["api.users.GetUser"],
      spec: "Display user information in a card",
    };

    return {
      component,
      displayType: {
        fqn: "api.users.User",
        kind: "record",
        fields: [
          { name: "id", type: "string", isOptional: false },
          { name: "name", type: "string", isOptional: false },
          { name: "email", type: "string", isOptional: false },
        ],
        tsType: "User",
      },
      boundIntent: undefined,
      actionIntents: [],
      relatedTypes: [],
      moduleName: "app.users",
      spec: "Display user information in a card",
      elementSemantics: {
        element: "card",
        purpose: "Display data in a visually contained card layout",
        expectedBehaviors: ["Render all fields", "Support action buttons"],
        commonPatterns: ["Header with title", "Body with fields"],
      },
      ...overrides,
    };
  }

  describe("config", () => {
    it("has correct target", () => {
      expect(template.config.target).toBe("component-jsx");
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

    it("includes component name in user prompt", () => {
      const context = createContext();
      const messages = template.buildMessages(context);

      expect(messages[1].content).toContain("app.users.UserCard");
    });

    it("includes element type in user prompt", () => {
      const context = createContext();
      const messages = template.buildMessages(context);

      expect(messages[1].content).toContain("card");
    });

    it("includes specification in user prompt", () => {
      const context = createContext();
      const messages = template.buildMessages(context);

      expect(messages[1].content).toContain(
        "Display user information in a card",
      );
    });

    it("includes element semantics", () => {
      const context = createContext();
      const messages = template.buildMessages(context);

      expect(messages[1].content).toContain(
        "Display data in a visually contained card layout",
      );
    });

    it("includes display type when present", () => {
      const context = createContext();
      const messages = template.buildMessages(context);

      expect(messages[1].content).toContain("Display Type");
      expect(messages[1].content).toContain("User");
    });

    it("includes bound intent for forms", () => {
      const boundIntent: IRIntent = {
        kind: "route",
        name: "api.users.CreateUser",
        inputType: {
          fields: [
            { name: "name", type: simpleType("String") },
            { name: "email", type: simpleType("Email") },
          ],
        },
        outputType: simpleType("api.users.User"),
      };

      const context = createContext({
        component: {
          name: "app.users.UserForm",
          element: "form",
          binds: "api.users.CreateUser",
          spec: "Form to create a user",
        },
        boundIntent,
        elementSemantics: {
          element: "form",
          purpose: "Collect user input",
          expectedBehaviors: ["Validate input", "Submit data"],
          commonPatterns: ["Labeled fields", "Submit button"],
        },
      });

      const messages = template.buildMessages(context);

      expect(messages[1].content).toContain("Bound Intent");
      expect(messages[1].content).toContain("api.users.CreateUser");
      expect(messages[1].content).toContain("name, email");
    });

    it("includes action intents when present", () => {
      const actionIntent: IRIntent = {
        kind: "route",
        name: "api.users.DeleteUser",
        inputType: { fields: [{ name: "id", type: simpleType("UUID") }] },
        outputType: simpleType("Bool"),
      };

      const context = createContext({
        actionIntents: [actionIntent],
      });

      const messages = template.buildMessages(context);

      expect(messages[1].content).toContain("Action Intents");
      expect(messages[1].content).toContain("api.users.DeleteUser");
    });

    it("includes element-specific instructions for card", () => {
      const context = createContext();
      const messages = template.buildMessages(context);

      expect(messages[1].content).toContain("card layout");
      expect(messages[1].content).toContain("Display all fields");
    });

    it("includes element-specific instructions for form", () => {
      const context = createContext({
        component: {
          name: "app.users.UserForm",
          element: "form",
          binds: "api.users.CreateUser",
        },
        elementSemantics: {
          element: "form",
          purpose: "Collect input",
          expectedBehaviors: [],
          commonPatterns: [],
        },
      });

      const messages = template.buildMessages(context);

      expect(messages[1].content).toContain("form fields");
    });

    it("includes element-specific instructions for list", () => {
      const context = createContext({
        component: {
          name: "app.users.UserList",
          element: "list",
          displays: simpleType("List<User>"),
          itemComponent: "app.users.UserCard",
        },
        elementSemantics: {
          element: "list",
          purpose: "Display collection",
          expectedBehaviors: [],
          commonPatterns: [],
        },
      });

      const messages = template.buildMessages(context);

      expect(messages[1].content).toContain("Iterate over");
    });
  });

  describe("estimateTokens", () => {
    it("estimates tokens based on message length", () => {
      const context = createContext();
      const tokens = template.estimateTokens(context);

      expect(tokens).toBeGreaterThan(0);

      const messages = template.buildMessages(context);
      const chars = messages.reduce((sum, m) => sum + m.content.length, 0);
      expect(tokens).toBe(Math.ceil(chars / 4));
    });
  });
});
