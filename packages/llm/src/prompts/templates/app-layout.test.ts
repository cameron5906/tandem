import { describe, it, expect } from "vitest";
import { AppLayoutTemplate } from "./app-layout";
import type { AppLayoutGenerationContext, ComponentSummary } from "../../interfaces";

describe("AppLayoutTemplate", () => {
  const template = new AppLayoutTemplate();

  describe("config", () => {
    it("has correct id", () => {
      expect(template.config.id).toBe("app-layout-v1");
    });

    it("has correct target", () => {
      expect(template.config.target).toBe("app-layout");
    });

    it("has version 1.0.0", () => {
      expect(template.config.version).toBe("1.0.0");
    });

    it("has a description", () => {
      expect(template.config.description).toBeTruthy();
    });
  });

  describe("buildMessages", () => {
    function createContext(overrides: Partial<AppLayoutGenerationContext> = {}): AppLayoutGenerationContext {
      return {
        appTitle: "Test App",
        components: [],
        moduleName: "app.test",
        hasDashboard: false,
        listComponents: [],
        formComponents: [],
        modalComponents: [],
        ...overrides,
      };
    }

    function createComponent(overrides: Partial<ComponentSummary> = {}): ComponentSummary {
      return {
        name: "TestComponent",
        fqn: "app.test.TestComponent",
        element: "card",
        ...overrides,
      };
    }

    it("returns system and user messages", () => {
      const context = createContext();
      const messages = template.buildMessages(context);

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("system");
      expect(messages[1].role).toBe("user");
    });

    describe("system prompt", () => {
      it("establishes role as React developer", () => {
        const context = createContext();
        const messages = template.buildMessages(context);
        const systemPrompt = messages[0].content;

        expect(systemPrompt).toContain("React developer");
      });

      it("includes layout principles", () => {
        const context = createContext();
        const messages = template.buildMessages(context);
        const systemPrompt = messages[0].content;

        expect(systemPrompt).toContain("Layout Principles");
        expect(systemPrompt).toContain("visual hierarchy");
      });

      it("includes component usage guidelines", () => {
        const context = createContext();
        const messages = template.buildMessages(context);
        const systemPrompt = messages[0].content;

        expect(systemPrompt).toContain("Component Usage");
        expect(systemPrompt).toContain("dashboard");
        expect(systemPrompt).toContain("list/table");
        expect(systemPrompt).toContain("form");
        expect(systemPrompt).toContain("modal");
      });

      it("includes output format instructions", () => {
        const context = createContext();
        const messages = template.buildMessages(context);
        const systemPrompt = messages[0].content;

        expect(systemPrompt).toContain("Output Format");
        expect(systemPrompt).toContain('"jsx"');
        expect(systemPrompt).toContain('"hooks"');
        expect(systemPrompt).toContain('"handlers"');
        expect(systemPrompt).toContain('"stateDeclarations"');
      });

      it("instructs not to include imports", () => {
        const context = createContext();
        const messages = template.buildMessages(context);
        const systemPrompt = messages[0].content;

        expect(systemPrompt).toContain("Do NOT include imports");
      });
    });

    describe("user prompt", () => {
      it("includes app title", () => {
        const context = createContext({ appTitle: "My Custom App" });
        const messages = template.buildMessages(context);
        const userPrompt = messages[1].content;

        expect(userPrompt).toContain("My Custom App");
      });

      it("lists available components", () => {
        const context = createContext({
          components: [
            createComponent({ name: "TaskCard", element: "card" }),
            createComponent({ name: "TaskList", element: "list" }),
          ],
        });
        const messages = template.buildMessages(context);
        const userPrompt = messages[1].content;

        expect(userPrompt).toContain("Available Components");
        expect(userPrompt).toContain("TaskCard");
        expect(userPrompt).toContain("TaskList");
      });

      it("includes component element types", () => {
        const context = createContext({
          components: [
            createComponent({ name: "TaskCard", element: "card" }),
          ],
        });
        const messages = template.buildMessages(context);
        const userPrompt = messages[1].content;

        expect(userPrompt).toContain("**Element**: card");
      });

      it("includes display type when present", () => {
        const context = createContext({
          components: [
            createComponent({ name: "TaskCard", displayType: "Task" }),
          ],
        });
        const messages = template.buildMessages(context);
        const userPrompt = messages[1].content;

        expect(userPrompt).toContain("**Displays**: Task");
      });

      it("includes bound intent for forms", () => {
        const context = createContext({
          components: [
            createComponent({ name: "CreateTaskForm", element: "form", bindsIntent: "CreateTask" }),
          ],
        });
        const messages = template.buildMessages(context);
        const userPrompt = messages[1].content;

        expect(userPrompt).toContain("**Binds**: CreateTask");
      });

      it("includes component spec/purpose", () => {
        const context = createContext({
          components: [
            createComponent({ name: "TaskCard", spec: "Displays a task summary" }),
          ],
        });
        const messages = template.buildMessages(context);
        const userPrompt = messages[1].content;

        expect(userPrompt).toContain("**Purpose**: Displays a task summary");
      });

      it("mentions dashboard when present", () => {
        const context = createContext({
          hasDashboard: true,
          components: [
            createComponent({ name: "TaskDashboard", element: "dashboard" }),
          ],
        });
        const messages = template.buildMessages(context);
        const userPrompt = messages[1].content;

        expect(userPrompt).toContain("dashboard component prominently");
      });

      it("lists list/table components", () => {
        const context = createContext({
          listComponents: [
            createComponent({ name: "TaskList", element: "list" }),
            createComponent({ name: "TaskTable", element: "table" }),
          ],
          components: [
            createComponent({ name: "TaskList", element: "list" }),
            createComponent({ name: "TaskTable", element: "table" }),
          ],
        });
        const messages = template.buildMessages(context);
        const userPrompt = messages[1].content;

        expect(userPrompt).toContain("**TaskList**");
        expect(userPrompt).toContain("**TaskTable**");
      });

      it("lists form components", () => {
        const context = createContext({
          formComponents: [
            createComponent({ name: "CreateTaskForm", element: "form" }),
          ],
          components: [
            createComponent({ name: "CreateTaskForm", element: "form" }),
          ],
        });
        const messages = template.buildMessages(context);
        const userPrompt = messages[1].content;

        expect(userPrompt).toContain("**CreateTaskForm**");
      });

      it("lists modal components with state guidance", () => {
        const context = createContext({
          modalComponents: [
            createComponent({ name: "EditTaskModal", element: "modal" }),
          ],
          components: [
            createComponent({ name: "EditTaskModal", element: "modal" }),
          ],
        });
        const messages = template.buildMessages(context);
        const userPrompt = messages[1].content;

        expect(userPrompt).toContain("**EditTaskModal**");
        expect(userPrompt).toContain("useState");
        expect(userPrompt).toContain("isOpen");
        expect(userPrompt).toContain("onClose");
      });

      it("includes component props guidance", () => {
        const context = createContext();
        const messages = template.buildMessages(context);
        const userPrompt = messages[1].content;

        expect(userPrompt).toContain("Component Props");
        expect(userPrompt).toContain("data");
        expect(userPrompt).toContain("isLoading");
        expect(userPrompt).toContain("onSuccess");
      });
    });
  });

  describe("estimateTokens", () => {
    it("returns a positive number", () => {
      const context: AppLayoutGenerationContext = {
        appTitle: "Test App",
        components: [],
        moduleName: "app.test",
        hasDashboard: false,
        listComponents: [],
        formComponents: [],
        modalComponents: [],
      };

      const tokens = template.estimateTokens(context);

      expect(tokens).toBeGreaterThan(0);
    });

    it("estimates more tokens with more components", () => {
      const smallContext: AppLayoutGenerationContext = {
        appTitle: "Test App",
        components: [{ name: "A", fqn: "a.A", element: "card" }],
        moduleName: "app.test",
        hasDashboard: false,
        listComponents: [],
        formComponents: [],
        modalComponents: [],
      };

      const largeContext: AppLayoutGenerationContext = {
        appTitle: "Test App",
        components: [
          { name: "A", fqn: "a.A", element: "card" },
          { name: "B", fqn: "a.B", element: "list" },
          { name: "C", fqn: "a.C", element: "form" },
          { name: "D", fqn: "a.D", element: "modal" },
          { name: "E", fqn: "a.E", element: "dashboard" },
        ],
        moduleName: "app.test",
        hasDashboard: true,
        listComponents: [{ name: "B", fqn: "a.B", element: "list" }],
        formComponents: [{ name: "C", fqn: "a.C", element: "form" }],
        modalComponents: [{ name: "D", fqn: "a.D", element: "modal" }],
      };

      const smallTokens = template.estimateTokens(smallContext);
      const largeTokens = template.estimateTokens(largeContext);

      expect(largeTokens).toBeGreaterThan(smallTokens);
    });
  });
});
