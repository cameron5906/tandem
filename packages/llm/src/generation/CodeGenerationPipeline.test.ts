import { describe, it, expect, vi, beforeEach } from "vitest";
import { CodeGenerationPipeline, createPipeline } from "./CodeGenerationPipeline";
import type {
  ILLMProvider,
  IContextBuilder,
  ICodeValidator,
  LLMMessage,
  HandlerGenerationContext,
  ComponentGenerationContext,
  AppLayoutGenerationContext,
} from "../interfaces";
import { PromptRegistry } from "../prompts/PromptRegistry";
import { HandlerImplementationTemplate } from "../prompts/templates/handler-impl";
import { ComponentJSXTemplate } from "../prompts/templates/component-impl";
import { AppLayoutTemplate } from "../prompts/templates/app-layout";
import type { TandemIR, IRIntent, IRComponent } from "@tandem-lang/compiler";
import { simpleType } from "@tandem-lang/compiler";

describe("CodeGenerationPipeline", () => {
  // Mock provider
  const createMockProvider = (response: unknown): ILLMProvider => ({
    name: "mock",
    supportedModels: ["mock-model"],
    complete: vi.fn().mockResolvedValue(response),
    stream: vi.fn(),
    estimateTokens: vi.fn().mockReturnValue(100),
    getMaxContextTokens: vi.fn().mockReturnValue(8000),
  });

  // Mock context builder
  const createMockContextBuilder = (): IContextBuilder => ({
    buildHandlerContext: vi.fn().mockReturnValue({
      intent: {
        kind: "route",
        name: "api.users.GetUser",
        inputType: { fields: [{ name: "id", type: simpleType("UUID") }] },
        outputType: simpleType("api.users.User"),
      },
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
        ],
        tsType: "User",
      },
      httpMethod: "GET",
      routePath: "/getUser",
      relatedTypes: [],
      moduleName: "api.users",
    } as HandlerGenerationContext),
    buildComponentContext: vi.fn().mockReturnValue({
      component: {
        name: "app.users.UserCard",
        element: "card",
        displays: simpleType("api.users.User"),
      },
      displayType: {
        fqn: "api.users.User",
        kind: "record",
        fields: [
          { name: "id", type: "string", isOptional: false },
          { name: "name", type: "string", isOptional: false },
        ],
        tsType: "User",
      },
      boundIntent: undefined,
      actionIntents: [],
      relatedTypes: [],
      moduleName: "app.users",
      elementSemantics: {
        element: "card",
        purpose: "Display data",
        expectedBehaviors: [],
        commonPatterns: [],
      },
    } as ComponentGenerationContext),
    buildAppLayoutContext: vi.fn().mockReturnValue({
      appTitle: "Test App",
      components: [
        {
          name: "UserCard",
          fqn: "app.users.UserCard",
          element: "card",
          displayType: "User",
        },
      ],
      moduleName: "app.users",
      hasDashboard: false,
      listComponents: [],
      formComponents: [],
      modalComponents: [],
    } as AppLayoutGenerationContext),
    resolveType: vi.fn(),
  });

  // Mock validator
  const createMockValidator = (valid: boolean = true): ICodeValidator => ({
    validate: vi.fn().mockResolvedValue({
      valid,
      errors: valid ? [] : [{ type: "syntax", message: "Error", fixable: false }],
      warnings: [],
    }),
    attemptFix: vi.fn().mockResolvedValue(null),
  });

  // Mock IR
  const mockIR: TandemIR = {
    modules: new Map([
      [
        "api.users",
        {
          name: "api.users",
          imports: [],
          types: [],
          intents: [
            {
              kind: "route",
              name: "api.users.GetUser",
              inputType: { fields: [{ name: "id", type: simpleType("UUID") }] },
              outputType: simpleType("api.users.User"),
            } as IRIntent,
          ],
          components: [],
        },
      ],
      [
        "app.users",
        {
          name: "app.users",
          imports: [],
          types: [],
          intents: [],
          components: [
            {
              name: "app.users.UserCard",
              element: "card",
              displays: simpleType("api.users.User"),
            } as IRComponent,
          ],
        },
      ],
    ]),
  };

  // Registry with templates
  let registry: PromptRegistry;

  beforeEach(() => {
    registry = new PromptRegistry();
    registry.register(new HandlerImplementationTemplate());
    registry.register(new ComponentJSXTemplate());
    registry.register(new AppLayoutTemplate());
  });

  describe("generateHandler", () => {
    it("generates handler code successfully", async () => {
      const mockResponse = {
        implementation: "const user = await db.findById(req.query.id); res.json(user);",
        validation: "if (!req.query.id) return res.status(400).json({ error: 'Missing id' });",
        imports: ["import { db } from '../database';"],
      };

      const provider = createMockProvider(mockResponse);
      const contextBuilder = createMockContextBuilder();
      const validator = createMockValidator(true);

      const pipeline = new CodeGenerationPipeline(
        provider,
        contextBuilder,
        {},
        validator,
        registry,
      );

      const result = await pipeline.generateHandler(mockIR, "api.users.GetUser");

      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.code?.implementation).toBe(mockResponse.implementation);
      expect(result.code?.validation).toBe(mockResponse.validation);
      expect(result.attempts).toBe(1);
    });

    it("retries on validation failure", async () => {
      const badResponse = {
        implementation: "const x = ;", // Invalid syntax
      };
      const goodResponse = {
        implementation: "const x = 1; res.json({ x });",
      };

      const provider = createMockProvider(badResponse);
      (provider.complete as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(badResponse)
        .mockResolvedValueOnce(goodResponse);

      const contextBuilder = createMockContextBuilder();

      // First call invalid, second call valid
      const validator = createMockValidator(false);
      (validator.validate as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          valid: false,
          errors: [{ type: "syntax", message: "Unexpected token", fixable: false }],
          warnings: [],
        })
        .mockResolvedValueOnce({
          valid: true,
          errors: [],
          warnings: [],
        });

      const pipeline = new CodeGenerationPipeline(
        provider,
        contextBuilder,
        { maxRetries: 3 },
        validator,
        registry,
      );

      const result = await pipeline.generateHandler(mockIR, "api.users.GetUser");

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(provider.complete).toHaveBeenCalledTimes(2);
    });

    it("respects max retries limit", async () => {
      const badResponse = {
        implementation: "const x = ;",
      };

      const provider = createMockProvider(badResponse);
      const contextBuilder = createMockContextBuilder();
      const validator = createMockValidator(false);

      const pipeline = new CodeGenerationPipeline(
        provider,
        contextBuilder,
        { maxRetries: 2 },
        validator,
        registry,
      );

      const result = await pipeline.generateHandler(mockIR, "api.users.GetUser");

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(provider.complete).toHaveBeenCalledTimes(2);
    });

    it("handles provider errors", async () => {
      const provider = createMockProvider(null);
      (provider.complete as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("API error"),
      );

      const contextBuilder = createMockContextBuilder();
      const validator = createMockValidator(true);

      const pipeline = new CodeGenerationPipeline(
        provider,
        contextBuilder,
        { maxRetries: 2 },
        validator,
        registry,
      );

      const result = await pipeline.generateHandler(mockIR, "api.users.GetUser");

      expect(result.success).toBe(false);
      expect(result.error).toContain("API error");
    });

    it("skips validation when disabled", async () => {
      const mockResponse = {
        implementation: "res.json({ ok: true });",
      };

      const provider = createMockProvider(mockResponse);
      const contextBuilder = createMockContextBuilder();
      const validator = createMockValidator(true);

      const pipeline = new CodeGenerationPipeline(
        provider,
        contextBuilder,
        { validateCode: false },
        validator,
        registry,
      );

      const result = await pipeline.generateHandler(mockIR, "api.users.GetUser");

      expect(result.success).toBe(true);
      expect(validator.validate).not.toHaveBeenCalled();
    });

    it("returns error when template not registered", async () => {
      const provider = createMockProvider({});
      const contextBuilder = createMockContextBuilder();

      // Empty registry
      const emptyRegistry = new PromptRegistry();

      const pipeline = new CodeGenerationPipeline(
        provider,
        contextBuilder,
        {},
        createMockValidator(true),
        emptyRegistry,
      );

      const result = await pipeline.generateHandler(mockIR, "api.users.GetUser");

      expect(result.success).toBe(false);
      expect(result.error).toContain("template not registered");
    });
  });

  describe("generateComponent", () => {
    it("generates component code successfully", async () => {
      const mockResponse = {
        jsx: "<div className='card'><h2>{user.name}</h2></div>",
        hooks: ["const [user, setUser] = useState<User | null>(null);"],
        styles: "const cardStyle = { padding: '1rem' };",
      };

      const provider = createMockProvider(mockResponse);
      const contextBuilder = createMockContextBuilder();
      const validator = createMockValidator(true);

      const pipeline = new CodeGenerationPipeline(
        provider,
        contextBuilder,
        {},
        validator,
        registry,
      );

      const result = await pipeline.generateComponent(mockIR, "app.users.UserCard");

      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.code?.jsx).toBe(mockResponse.jsx);
      expect(result.code?.hooks).toEqual(mockResponse.hooks);
    });

    it("validates TSX code", async () => {
      const mockResponse = {
        jsx: "<div><span>Valid</span></div>",
      };

      const provider = createMockProvider(mockResponse);
      const contextBuilder = createMockContextBuilder();
      const validator = createMockValidator(true);

      const pipeline = new CodeGenerationPipeline(
        provider,
        contextBuilder,
        {},
        validator,
        registry,
      );

      const result = await pipeline.generateComponent(mockIR, "app.users.UserCard");

      expect(result.success).toBe(true);
      expect(validator.validate).toHaveBeenCalledWith(
        expect.stringContaining("function Component()"),
        "tsx",
      );
    });
  });

  describe("generateAppLayout", () => {
    it("generates App layout code successfully", async () => {
      const mockResponse = {
        jsx: '<div className="app"><header>My App</header><main><UserCard /></main></div>',
        hooks: [],
        handlers: [],
        stateDeclarations: [],
      };

      const provider = createMockProvider(mockResponse);
      const contextBuilder = createMockContextBuilder();
      const validator = createMockValidator(true);

      const pipeline = new CodeGenerationPipeline(
        provider,
        contextBuilder,
        {},
        validator,
        registry,
      );

      const result = await pipeline.generateAppLayout(mockIR, "Test App");

      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.code?.jsx).toBe(mockResponse.jsx);
      expect(result.attempts).toBe(1);
    });

    it("includes hooks in result", async () => {
      const mockResponse = {
        jsx: '<div><TaskList data={tasks} /></div>',
        hooks: ["const { data: tasks } = useListTasks();"],
        handlers: [],
        stateDeclarations: [],
      };

      const provider = createMockProvider(mockResponse);
      const contextBuilder = createMockContextBuilder();
      const validator = createMockValidator(true);

      const pipeline = new CodeGenerationPipeline(
        provider,
        contextBuilder,
        {},
        validator,
        registry,
      );

      const result = await pipeline.generateAppLayout(mockIR, "Test App");

      expect(result.success).toBe(true);
      expect(result.code?.hooks).toEqual(mockResponse.hooks);
    });

    it("includes state declarations in result", async () => {
      const mockResponse = {
        jsx: '<div>{isModalOpen && <EditModal />}</div>',
        hooks: [],
        handlers: [],
        stateDeclarations: ["const [isModalOpen, setIsModalOpen] = useState(false);"],
      };

      const provider = createMockProvider(mockResponse);
      const contextBuilder = createMockContextBuilder();
      const validator = createMockValidator(true);

      const pipeline = new CodeGenerationPipeline(
        provider,
        contextBuilder,
        {},
        validator,
        registry,
      );

      const result = await pipeline.generateAppLayout(mockIR, "Test App");

      expect(result.success).toBe(true);
      expect(result.code?.stateDeclarations).toEqual(mockResponse.stateDeclarations);
    });

    it("includes handlers in result", async () => {
      const mockResponse = {
        jsx: '<button onClick={handleOpenModal}>Open</button>',
        hooks: [],
        handlers: [{ name: "handleOpenModal", implementation: "const handleOpenModal = () => setIsModalOpen(true);" }],
        stateDeclarations: [],
      };

      const provider = createMockProvider(mockResponse);
      const contextBuilder = createMockContextBuilder();
      const validator = createMockValidator(true);

      const pipeline = new CodeGenerationPipeline(
        provider,
        contextBuilder,
        {},
        validator,
        registry,
      );

      const result = await pipeline.generateAppLayout(mockIR, "Test App");

      expect(result.success).toBe(true);
      expect(result.code?.handlers).toEqual(mockResponse.handlers);
    });

    it("validates TSX code", async () => {
      const mockResponse = {
        jsx: "<div><span>Valid</span></div>",
        hooks: [],
        handlers: [],
        stateDeclarations: [],
      };

      const provider = createMockProvider(mockResponse);
      const contextBuilder = createMockContextBuilder();
      const validator = createMockValidator(true);

      const pipeline = new CodeGenerationPipeline(
        provider,
        contextBuilder,
        {},
        validator,
        registry,
      );

      const result = await pipeline.generateAppLayout(mockIR, "Test App");

      expect(result.success).toBe(true);
      expect(validator.validate).toHaveBeenCalledWith(
        expect.stringContaining("function Component()"),
        "tsx",
      );
    });

    it("returns error when template not registered", async () => {
      const provider = createMockProvider({});
      const contextBuilder = createMockContextBuilder();

      // Empty registry
      const emptyRegistry = new PromptRegistry();

      const pipeline = new CodeGenerationPipeline(
        provider,
        contextBuilder,
        {},
        createMockValidator(true),
        emptyRegistry,
      );

      const result = await pipeline.generateAppLayout(mockIR, "Test App");

      expect(result.success).toBe(false);
      expect(result.error).toContain("template not registered");
    });
  });

  describe("progress events", () => {
    it("emits progress events", async () => {
      const mockResponse = {
        implementation: "res.json({});",
      };

      const provider = createMockProvider(mockResponse);
      const contextBuilder = createMockContextBuilder();
      const validator = createMockValidator(true);
      const progressEvents: unknown[] = [];

      const pipeline = new CodeGenerationPipeline(
        provider,
        contextBuilder,
        {
          onProgress: (event) => progressEvents.push(event),
        },
        validator,
        registry,
      );

      await pipeline.generateHandler(mockIR, "api.users.GetUser");

      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0]).toMatchObject({
        type: "generating",
        target: "api.users.GetUser",
      });
    });

    it("emits retry events on validation failure", async () => {
      const badResponse = {
        implementation: "const x = ;",
      };
      const goodResponse = {
        implementation: "const x = 1;",
      };

      const provider = createMockProvider(badResponse);
      (provider.complete as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(badResponse)
        .mockResolvedValueOnce(goodResponse);

      const contextBuilder = createMockContextBuilder();
      const validator = createMockValidator(false);
      (validator.validate as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          valid: false,
          errors: [{ type: "syntax", message: "Error", fixable: false }],
          warnings: [],
        })
        .mockResolvedValueOnce({
          valid: true,
          errors: [],
          warnings: [],
        });

      const progressEvents: unknown[] = [];

      const pipeline = new CodeGenerationPipeline(
        provider,
        contextBuilder,
        {
          maxRetries: 3,
          onProgress: (event) => progressEvents.push(event),
        },
        validator,
        registry,
      );

      await pipeline.generateHandler(mockIR, "api.users.GetUser");

      const retryEvent = progressEvents.find(
        (e: unknown) => (e as { type: string }).type === "retrying",
      );
      expect(retryEvent).toBeDefined();
    });
  });

  describe("createPipeline helper", () => {
    it("creates pipeline with defaults", () => {
      const provider = createMockProvider({});
      const contextBuilder = createMockContextBuilder();

      const pipeline = createPipeline(provider, contextBuilder);

      expect(pipeline).toBeInstanceOf(CodeGenerationPipeline);
    });

    it("accepts custom config", () => {
      const provider = createMockProvider({});
      const contextBuilder = createMockContextBuilder();

      const pipeline = createPipeline(provider, contextBuilder, {
        maxRetries: 5,
        temperature: 0.5,
      });

      expect(pipeline).toBeInstanceOf(CodeGenerationPipeline);
    });
  });
});
