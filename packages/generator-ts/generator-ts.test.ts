import { describe, it, expect } from "vitest";
import {
  parseTandem,
  compileToIR,
  simpleType,
  genericType,
  TandemIR,
  createEmptyIR,
} from "@tandem-lang/compiler";
import {
  generateTypeScript,
  TypeScriptTypeMapper,
  TypeDeclarationEmitter,
  ExpressRouteEmitter,
  ApiClientEmitter,
  ReactHooksEmitter,
  TypesGenerator,
  ExpressGenerator,
  ReactGenerator,
  shorten,
  toCamelCase,
  toHandlerName,
  toHookName,
  toApiMethodName,
  toRoutePath,
  classifyIntent,
  isQueryIntent,
  isMutationIntent,
  registerAllGenerators,
} from "./src";
import { generatorRegistry, GeneratorContext } from "@tandem-lang/generator-core";
import {
  MockProvider,
  CodeGenerationPipeline,
  IRContextBuilder,
} from "@tandem-lang/llm";
import * as fs from "fs";
import * as path from "path";

// Helper to create a mock pipeline for tests
function createMockPipeline(): CodeGenerationPipeline {
  const provider = new MockProvider({ apiKey: "mock-key", model: "mock-model" });
  provider.setMockResponse({
    implementation: 'res.json({ message: "Mock implementation" });',
    validation: "",
    imports: [],
  });
  const contextBuilder = new IRContextBuilder();
  return new CodeGenerationPipeline(provider, contextBuilder, { maxRetries: 1 });
}

const sampleTdmPath = path.resolve(__dirname, "../../samples/sample.tdm");
const source = fs.readFileSync(sampleTdmPath, "utf-8");

// =============================================================================
// Unit Tests for Individual Components
// =============================================================================

describe("shorten (utility)", () => {
  it("returns simple names unchanged", () => {
    expect(shorten("String")).toBe("String");
    expect(shorten("User")).toBe("User");
  });

  it("extracts short name from FQN", () => {
    expect(shorten("sample.project.User")).toBe("User");
    expect(shorten("domain.user.UserId")).toBe("UserId");
  });

  it("handles deeply nested FQNs", () => {
    expect(shorten("a.b.c.d.e.Foo")).toBe("Foo");
  });
});

describe("TypeScriptTypeMapper", () => {
  const mapper = new TypeScriptTypeMapper();

  describe("primitive types", () => {
    it("maps String to string", () => {
      expect(mapper.mapType(simpleType("String"))).toBe("string");
    });

    it("maps Int to number", () => {
      expect(mapper.mapType(simpleType("Int"))).toBe("number");
    });

    it("maps Float to number", () => {
      expect(mapper.mapType(simpleType("Float"))).toBe("number");
    });

    it("maps Bool to boolean", () => {
      expect(mapper.mapType(simpleType("Bool"))).toBe("boolean");
    });

    it("maps UUID to string", () => {
      expect(mapper.mapType(simpleType("UUID"))).toBe("string");
    });

    it("maps DateTime to Date", () => {
      expect(mapper.mapType(simpleType("DateTime"))).toBe("Date");
    });

    it("maps JSON to unknown", () => {
      expect(mapper.mapType(simpleType("JSON"))).toBe("unknown");
    });
  });

  describe("generic types", () => {
    it("maps Optional<T> to T | null", () => {
      const optional = genericType("Optional", [simpleType("String")]);
      expect(mapper.mapType(optional)).toBe("string | null");
    });

    it("maps List<T> to T[]", () => {
      const list = genericType("List", [simpleType("String")]);
      expect(mapper.mapType(list)).toBe("string[]");
    });

    it("maps Map<K, V> to Record<K, V>", () => {
      const map = genericType("Map", [simpleType("String"), simpleType("Int")]);
      expect(mapper.mapType(map)).toBe("Record<string, number>");
    });

    it("maps Result<T, E> to discriminated union", () => {
      const result = genericType("Result", [
        simpleType("String"),
        simpleType("String"),
      ]);
      expect(mapper.mapType(result)).toBe(
        "{ ok: true; value: string } | { ok: false; error: string }"
      );
    });
  });

  describe("nested generics", () => {
    it("maps List<List<String>> to string[][]", () => {
      const nested = genericType("List", [
        genericType("List", [simpleType("String")]),
      ]);
      expect(mapper.mapType(nested)).toBe("string[][]");
    });

    it("maps List<Optional<String>> to (string | null)[]", () => {
      const nested = genericType("List", [
        genericType("Optional", [simpleType("String")]),
      ]);
      expect(mapper.mapType(nested)).toBe("(string | null)[]");
    });

    it("maps Optional<List<String>> to string[] | null", () => {
      const nested = genericType("Optional", [
        genericType("List", [simpleType("String")]),
      ]);
      expect(mapper.mapType(nested)).toBe("string[] | null");
    });
  });

  describe("user-defined types", () => {
    it("shortens FQN for user types", () => {
      expect(mapper.mapType(simpleType("sample.project.User"))).toBe("User");
    });
  });
});

describe("TypeDeclarationEmitter", () => {
  const mapper = new TypeScriptTypeMapper();
  const emitter = new TypeDeclarationEmitter(mapper);

  it("returns GeneratedCode array", () => {
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);

    const files = emitter.emit(ir);

    // Modular output: per-module types.ts + aggregate types.ts
    expect(files.length).toBeGreaterThanOrEqual(1);
    const aggregateFile = files.find((f) => f.filename === "types.ts");
    expect(aggregateFile).toBeDefined();
    expect(typeof aggregateFile!.content).toBe("string");
  });

  it("emits type aliases", () => {
    const aliasSource = `
module test
type UserId = UUID
`;
    const { program } = parseTandem(aliasSource);
    const { ir } = compileToIR(program);
    const files = emitter.emit(ir);

    expect(files[0].content).toContain("export type UserId = string;");
  });

  it("emits interfaces for record types", () => {
    const recordSource = `
module test
type User {
  id: UUID
  name: String
}
`;
    const { program } = parseTandem(recordSource);
    const { ir } = compileToIR(program);
    const files = emitter.emit(ir);

    expect(files[0].content).toContain("export interface User {");
    expect(files[0].content).toContain("id: string;");
    expect(files[0].content).toContain("name: string;");
  });
});

// =============================================================================
// Integration Tests (Original Tests - Preserved)
// =============================================================================

describe("generateTypeScript (integration)", () => {
  it("generates correct TypeScript code for sample.tdm", () => {
    const { program } = parseTandem(source);
    const { ir, diagnostics } = compileToIR(program);

    expect(diagnostics).toEqual([]); // Ensure no compilation errors

    const generatedCode = generateTypeScript(ir);

    // Check for key parts of the generated code
    expect(generatedCode).toContain("export type UserId = string;");
    expect(generatedCode).toContain("export interface User {");
    expect(generatedCode).toContain("id: UserId;");
    expect(generatedCode).toContain("name: string;");

    // Intents should NOT be generated
    expect(generatedCode).not.toContain("export const Intents = {");
  });

  it("generates correct TypeScript for generic types", () => {
    const genericSource = `
module test.generics

type Tags = List<String>
type MaybeName = Optional<String>
type Settings = Map<String, Int>
type UserResult = Result<String, String>

type User {
  id: UUID
  tags: List<String>
  bio: String?
  scores: Int[]
  metadata: Map<String, JSON>
}
`;

    const { program } = parseTandem(genericSource);
    const { ir, diagnostics } = compileToIR(program);

    expect(diagnostics).toEqual([]);

    const generatedCode = generateTypeScript(ir);

    // List<String> -> string[]
    expect(generatedCode).toContain("export type Tags = string[];");

    // Optional<String> -> string | null
    expect(generatedCode).toContain("export type MaybeName = string | null;");

    // Map<String, Int> -> Record<string, number>
    expect(generatedCode).toContain(
      "export type Settings = Record<string, number>;"
    );

    // Result<String, String> -> discriminated union
    expect(generatedCode).toContain(
      "export type UserResult = { ok: true; value: string } | { ok: false; error: string };"
    );

    // User interface with generic fields
    expect(generatedCode).toContain("export interface User {");
    expect(generatedCode).toContain("tags: string[];"); // List<String>
    expect(generatedCode).toContain("bio: string | null;"); // String?
    expect(generatedCode).toContain("scores: number[];"); // Int[]
    expect(generatedCode).toContain("metadata: Record<string, unknown>;"); // Map<String, JSON>
  });

  it("generates correct TypeScript for all primitive types", () => {
    const primitiveSource = `
module test.primitives

type TestRecord {
  str: String
  num: Int
  flt: Float
  flag: Bool
  id: UUID
  ts: DateTime
  money: Decimal
  link: URL
  mail: Email
  day: Date
  hour: Time
  len: Duration
  data: JSON
}
`;

    const { program } = parseTandem(primitiveSource);
    const { ir, diagnostics } = compileToIR(program);

    expect(diagnostics).toEqual([]);

    const generatedCode = generateTypeScript(ir);

    expect(generatedCode).toContain("str: string;");
    expect(generatedCode).toContain("num: number;");
    expect(generatedCode).toContain("flt: number;");
    expect(generatedCode).toContain("flag: boolean;");
    expect(generatedCode).toContain("id: string;"); // UUID -> string
    expect(generatedCode).toContain("ts: Date;"); // DateTime -> Date
    expect(generatedCode).toContain("money: string;"); // Decimal -> string
    expect(generatedCode).toContain("link: string;"); // URL -> string
    expect(generatedCode).toContain("mail: string;"); // Email -> string
    expect(generatedCode).toContain("day: string;"); // Date -> string
    expect(generatedCode).toContain("hour: string;"); // Time -> string
    expect(generatedCode).toContain("len: string;"); // Duration -> string
    expect(generatedCode).toContain("data: unknown;"); // JSON -> unknown
  });

  it("generates correct TypeScript for nested generic types", () => {
    const nestedSource = `
module test.nested

type NestedList = List<List<String>>
type MaybeList = Optional<List<String>>
type ListOfMaybe = List<Optional<String>>
`;

    const { program } = parseTandem(nestedSource);
    const { ir, diagnostics } = compileToIR(program);

    expect(diagnostics).toEqual([]);

    const generatedCode = generateTypeScript(ir);

    // List<List<String>> -> string[][]
    expect(generatedCode).toContain("export type NestedList = string[][];");

    // Optional<List<String>> -> string[] | null
    expect(generatedCode).toContain(
      "export type MaybeList = string[] | null;"
    );

    // List<Optional<String>> -> (string | null)[]
    expect(generatedCode).toContain(
      "export type ListOfMaybe = (string | null)[];"
    );
  });
});

// =============================================================================
// Naming Utility Tests
// =============================================================================

describe("toCamelCase", () => {
  it("converts PascalCase to camelCase", () => {
    expect(toCamelCase("GetUser")).toBe("getUser");
    expect(toCamelCase("CreateTask")).toBe("createTask");
    expect(toCamelCase("ListTasks")).toBe("listTasks");
  });

  it("handles single letter", () => {
    expect(toCamelCase("A")).toBe("a");
  });

  it("handles empty string", () => {
    expect(toCamelCase("")).toBe("");
  });

  it("handles already camelCase", () => {
    expect(toCamelCase("getUser")).toBe("getUser");
  });
});

describe("toHandlerName", () => {
  it("converts intent name to handler name", () => {
    expect(toHandlerName("api.tasks.GetTask")).toBe("getTaskHandler");
    expect(toHandlerName("CreateUser")).toBe("createUserHandler");
  });
});

describe("toHookName", () => {
  it("converts intent name to hook name", () => {
    expect(toHookName("api.tasks.GetTask")).toBe("useGetTask");
    expect(toHookName("CreateUser")).toBe("useCreateUser");
  });
});

describe("toApiMethodName", () => {
  it("converts intent name to API method name", () => {
    expect(toApiMethodName("api.tasks.GetTask")).toBe("getTask");
    expect(toApiMethodName("CreateUser")).toBe("createUser");
  });
});

describe("toRoutePath", () => {
  it("converts intent name to route path", () => {
    expect(toRoutePath("api.tasks.GetTask")).toBe("/getTask");
    expect(toRoutePath("CreateUser")).toBe("/createUser");
  });
});

// =============================================================================
// Intent Classifier Tests
// =============================================================================

describe("classifyIntent", () => {
  describe("query intents (GET)", () => {
    it("classifies Get* as query/GET", () => {
      expect(classifyIntent("GetUser")).toEqual({ kind: "query", method: "GET" });
      expect(classifyIntent("api.GetTask")).toEqual({ kind: "query", method: "GET" });
    });

    it("classifies List* as query/GET", () => {
      expect(classifyIntent("ListTasks")).toEqual({ kind: "query", method: "GET" });
    });

    it("classifies Search* as query/GET", () => {
      expect(classifyIntent("SearchUsers")).toEqual({ kind: "query", method: "GET" });
    });

    it("classifies Find* as query/GET", () => {
      expect(classifyIntent("FindByEmail")).toEqual({ kind: "query", method: "GET" });
    });

    it("classifies Fetch* as query/GET", () => {
      expect(classifyIntent("FetchData")).toEqual({ kind: "query", method: "GET" });
    });

    it("classifies Load* as query/GET", () => {
      expect(classifyIntent("LoadProfile")).toEqual({ kind: "query", method: "GET" });
    });
  });

  describe("create intents (POST)", () => {
    it("classifies Create* as mutation/POST", () => {
      expect(classifyIntent("CreateUser")).toEqual({ kind: "mutation", method: "POST" });
    });

    it("classifies Add* as mutation/POST", () => {
      expect(classifyIntent("AddComment")).toEqual({ kind: "mutation", method: "POST" });
    });

    it("classifies Insert* as mutation/POST", () => {
      expect(classifyIntent("InsertRecord")).toEqual({ kind: "mutation", method: "POST" });
    });
  });

  describe("update intents (PUT)", () => {
    it("classifies Update* as mutation/PUT", () => {
      expect(classifyIntent("UpdateUser")).toEqual({ kind: "mutation", method: "PUT" });
    });

    it("classifies Edit* as mutation/PUT", () => {
      expect(classifyIntent("EditProfile")).toEqual({ kind: "mutation", method: "PUT" });
    });

    it("classifies Modify* as mutation/PUT", () => {
      expect(classifyIntent("ModifySettings")).toEqual({ kind: "mutation", method: "PUT" });
    });

    it("classifies Set* as mutation/PUT", () => {
      expect(classifyIntent("SetPreferences")).toEqual({ kind: "mutation", method: "PUT" });
    });
  });

  describe("delete intents (DELETE)", () => {
    it("classifies Delete* as mutation/DELETE", () => {
      expect(classifyIntent("DeleteUser")).toEqual({ kind: "mutation", method: "DELETE" });
    });

    it("classifies Remove* as mutation/DELETE", () => {
      expect(classifyIntent("RemoveItem")).toEqual({ kind: "mutation", method: "DELETE" });
    });

    it("classifies Destroy* as mutation/DELETE", () => {
      expect(classifyIntent("DestroySession")).toEqual({ kind: "mutation", method: "DELETE" });
    });
  });

  describe("default behavior", () => {
    it("defaults to mutation/POST for unrecognized patterns", () => {
      expect(classifyIntent("ProcessPayment")).toEqual({ kind: "mutation", method: "POST" });
      expect(classifyIntent("SendEmail")).toEqual({ kind: "mutation", method: "POST" });
    });
  });
});

describe("isQueryIntent / isMutationIntent", () => {
  it("correctly identifies query intents", () => {
    expect(isQueryIntent("GetUser")).toBe(true);
    expect(isQueryIntent("ListTasks")).toBe(true);
    expect(isQueryIntent("CreateTask")).toBe(false);
  });

  it("correctly identifies mutation intents", () => {
    expect(isMutationIntent("CreateTask")).toBe(true);
    expect(isMutationIntent("UpdateUser")).toBe(true);
    expect(isMutationIntent("GetUser")).toBe(false);
  });
});

// =============================================================================
// TypeDeclarationEmitter with Intent Types Tests
// =============================================================================

describe("TypeDeclarationEmitter with intent types", () => {
  const mapper = new TypeScriptTypeMapper();

  it("generates input/output types for intents", () => {
    const source = `
module test.api

type UserId = UUID

intent route GetUser {
  input: { id: UserId }
  output: String
  spec: "Get user by ID"
}
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const emitter = new TypeDeclarationEmitter(mapper, { includeIntentTypes: true });
    const files = emitter.emit(ir);

    expect(files[0].content).toContain("export interface GetUserInput {");
    expect(files[0].content).toContain("id: UserId;");
    expect(files[0].content).toContain("export type GetUserOutput = string;");
  });

  it("can disable intent type generation", () => {
    const source = `
module test.api

intent route GetUser {
  input: { id: UUID }
  output: String
}
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const emitter = new TypeDeclarationEmitter(mapper, { includeIntentTypes: false });
    const files = emitter.emit(ir);

    expect(files[0].content).not.toContain("GetUserInput");
    expect(files[0].content).not.toContain("GetUserOutput");
  });
});

// =============================================================================
// ExpressRouteEmitter Tests
// =============================================================================

describe("ExpressRouteEmitter", () => {
  it("generates handlers and router files", async () => {
    const source = `
@backend(express)
module test.api

type TaskId = UUID

intent route GetTask {
  input: { id: TaskId }
  output: String
  spec: "Get task by ID"
}

intent route CreateTask {
  input: { title: String }
  output: String
  spec: "Create a new task"
}
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const emitter = new ExpressRouteEmitter({ pipeline: createMockPipeline() });
    const files = await emitter.emit(ir);

    // Modular output: per-module handlers.ts + routes.ts + aggregate routes/index.ts
    const filenames = files.map((f) => f.filename);
    expect(filenames).toContain("test/api/handlers.ts");
    expect(filenames).toContain("test/api/routes.ts");
    expect(filenames).toContain("routes/index.ts");
  });

  it("generates typed handlers with correct HTTP method behavior", async () => {
    const source = `
@backend(express)
module test.api

intent route GetTask {
  input: { id: UUID }
  output: String
}

intent route CreateTask {
  input: { title: String }
  output: String
}
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const emitter = new ExpressRouteEmitter({ pipeline: createMockPipeline() });
    const files = await emitter.emit(ir);
    const handlersFile = files.find((f) => f.filename === "test/api/handlers.ts");
    const handlersContent = handlersFile!.content;

    // GET handler should use req.query
    expect(handlersContent).toContain("getTaskHandler");
    expect(handlersContent).toContain("req.query as GetTaskInput");

    // POST handler should use req.body
    expect(handlersContent).toContain("createTaskHandler");
    expect(handlersContent).toContain("req.body as CreateTaskInput");
  });

  it("generates router with correct HTTP methods", async () => {
    const source = `
@backend(express)
module test.api

intent route GetTask { input: { id: UUID } output: String }
intent route CreateTask { input: { title: String } output: String }
intent route UpdateTask { input: { id: UUID, title: String } output: String }
intent route DeleteTask { input: { id: UUID } output: Bool }
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const emitter = new ExpressRouteEmitter({ pipeline: createMockPipeline() });
    const files = await emitter.emit(ir);
    const routerFile = files.find((f) => f.filename === "test/api/routes.ts");
    const routerContent = routerFile!.content;

    expect(routerContent).toContain('router.get("/getTask"');
    expect(routerContent).toContain('router.post("/createTask"');
    expect(routerContent).toContain('router.put("/updateTask"');
    expect(routerContent).toContain('router.delete("/deleteTask"');
  });

  it("includes JSDoc comments from spec", async () => {
    const source = `
@backend(express)
module test.api

intent route GetTask {
  input: { id: UUID }
  output: String
  spec: "Fetch a task by its unique identifier"
}
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const emitter = new ExpressRouteEmitter({ pipeline: createMockPipeline() });
    const files = await emitter.emit(ir);
    const handlersFile = files.find((f) => f.filename === "test/api/handlers.ts");

    expect(handlersFile!.content).toContain("* Fetch a task by its unique identifier");
  });
});

// =============================================================================
// ApiClientEmitter Tests
// =============================================================================

describe("ApiClientEmitter", () => {
  it("generates API client with typed methods", () => {
    const source = `
@frontend(react)
module test.api

intent route GetTask { input: { id: UUID } output: String }
intent route CreateTask { input: { title: String } output: String }
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const emitter = new ApiClientEmitter();
    const files = emitter.emit(ir);

    // Modular output: per-module client.ts + aggregate api/client.ts
    const filenames = files.map((f) => f.filename);
    expect(filenames).toContain("test/api/client.ts");
    expect(filenames).toContain("api/client.ts");
    const moduleClient = files.find((f) => f.filename === "test/api/client.ts");
    expect(moduleClient!.content).toContain("getTask:");
    expect(moduleClient!.content).toContain("createTask:");
  });

  it("uses correct HTTP methods for queries and mutations", () => {
    const source = `
@frontend(react)
module test.api

intent route GetTask { input: { id: UUID } output: String }
intent route CreateTask { input: { title: String } output: String }
intent route UpdateTask { input: { id: UUID } output: String }
intent route DeleteTask { input: { id: UUID } output: Bool }
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const emitter = new ApiClientEmitter();
    const files = emitter.emit(ir);
    const moduleClient = files.find((f) => f.filename === "test/api/client.ts");
    const content = moduleClient!.content;

    // GET methods use query string
    expect(content).toContain('method: "GET"');
    expect(content).toContain("toQueryString(input");

    // POST/PUT methods use body
    expect(content).toContain('method: "POST"');
    expect(content).toContain('method: "PUT"');
    expect(content).toContain('method: "DELETE"');
    expect(content).toContain("JSON.stringify(input)");
  });

  it("uses custom base URL", () => {
    const source = `
@frontend(react)
module test.api
intent route GetTask { input: { id: UUID } output: String }
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const emitter = new ApiClientEmitter({ baseUrl: "/custom/api" });
    const files = emitter.emit(ir);
    const moduleClient = files.find((f) => f.filename === "test/api/client.ts");

    expect(moduleClient!.content).toContain('BASE_URL = "/custom/api"');
  });
});

// =============================================================================
// ReactHooksEmitter Tests
// =============================================================================

describe("ReactHooksEmitter", () => {
  it("generates hooks with correct types", () => {
    const source = `
@frontend(react)
module test.api

intent route GetTask { input: { id: UUID } output: String }
intent route CreateTask { input: { title: String } output: String }
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const emitter = new ReactHooksEmitter();
    const files = emitter.emit(ir);

    // Modular output: per-module hooks.ts + aggregate hooks/index.ts
    const filenames = files.map((f) => f.filename);
    expect(filenames).toContain("test/api/hooks.ts");
    expect(filenames).toContain("hooks/index.ts");
  });

  it("generates useQuery hooks for query intents", () => {
    const source = `
@frontend(react)
module test.api
intent route GetTask { input: { id: UUID } output: String }
intent route ListTasks { input: { limit: Int } output: String }
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const emitter = new ReactHooksEmitter();
    const files = emitter.emit(ir);
    const moduleHooks = files.find((f) => f.filename === "test/api/hooks.ts");
    const content = moduleHooks!.content;

    expect(content).toContain("export function useGetTask(");
    expect(content).toContain("export function useListTasks(");
    expect(content).toContain("useQuery({");
    expect(content).toContain('queryKey: ["GetTask", input]');
  });

  it("generates useMutation hooks for mutation intents", () => {
    const source = `
@frontend(react)
module test.api
intent route CreateTask { input: { title: String } output: String }
intent route UpdateTask { input: { id: UUID } output: String }
intent route DeleteTask { input: { id: UUID } output: Bool }
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const emitter = new ReactHooksEmitter();
    const files = emitter.emit(ir);
    const moduleHooks = files.find((f) => f.filename === "test/api/hooks.ts");
    const content = moduleHooks!.content;

    expect(content).toContain("export function useCreateTask(");
    expect(content).toContain("export function useUpdateTask(");
    expect(content).toContain("export function useDeleteTask(");
    expect(content).toContain("useMutation({");
    expect(content).toContain("mutationFn:");
  });
});

// =============================================================================
// Generator Classes Tests
// =============================================================================

describe("TypesGenerator", () => {
  it("has correct metadata", () => {
    const generator = new TypesGenerator();

    expect(generator.meta.id).toBe("typescript:types");
    expect(generator.meta.target).toBe("shared");
    expect(generator.meta.language).toBe("typescript");
  });

  it("generates types file", () => {
    const source = `
module test
type UserId = UUID
type User { id: UserId name: String }
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const generator = new TypesGenerator();
    const context: GeneratorContext = {
      ir,
      config: { outputDir: "./out" },
      targetModules: Array.from(ir.modules.values()),
    };

    const output = generator.generate(context);

    // Modular output: per-module types + aggregate types.ts
    expect(output.files.length).toBeGreaterThanOrEqual(1);
    const aggregateFile = output.files.find((f) => f.path === "types.ts");
    expect(aggregateFile).toBeDefined();
    // Check per-module file has the types
    const moduleFile = output.files.find((f) => f.path === "test/types.ts");
    expect(moduleFile).toBeDefined();
    expect(moduleFile!.content).toContain("export type UserId");
    expect(moduleFile!.content).toContain("export interface User");
  });
});

describe("ExpressGenerator", () => {
  it("has correct metadata", () => {
    const generator = new ExpressGenerator();

    expect(generator.meta.id).toBe("typescript:express");
    expect(generator.meta.target).toBe("backend");
    expect(generator.meta.framework).toBe("express");
  });

  it("generates all required files", async () => {
    const source = `
@backend(express)
module test.api

type TaskId = UUID
intent route GetTask { input: { id: TaskId } output: String }
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const generator = new ExpressGenerator();
    const context: GeneratorContext = {
      ir,
      config: { outputDir: "./out", llm: { provider: "mock" } },
      targetModules: Array.from(ir.modules.values()),
    };

    const output = await generator.generate(context);

    const filePaths = output.files.map((f) => f.path);
    // Aggregate types
    expect(filePaths).toContain("src/types.ts");
    // Per-module handlers and routes (modular output)
    expect(filePaths).toContain("src/test/api/handlers.ts");
    expect(filePaths).toContain("src/test/api/routes.ts");
    expect(filePaths).toContain("src/routes/index.ts");
    // Project files should be generated by default
    expect(filePaths).toContain("package.json");
    expect(filePaths).toContain("tsconfig.json");
    expect(filePaths).toContain("src/index.ts");
  });

  it("can skip project files", async () => {
    const source = `
@backend(express)
module test.api
intent route GetTask { input: { id: UUID } output: String }
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const generator = new ExpressGenerator({ includeProjectFiles: false });
    const context: GeneratorContext = {
      ir,
      config: { outputDir: "./out", llm: { provider: "mock" } },
      targetModules: Array.from(ir.modules.values()),
    };

    const output = await generator.generate(context);

    const filePaths = output.files.map((f) => f.path);
    expect(filePaths).not.toContain("package.json");
    expect(filePaths).not.toContain("tsconfig.json");
    expect(filePaths).not.toContain("src/index.ts");
  });

  it("includes correct dependencies", async () => {
    const source = `
@backend(express)
module test.api
intent route GetTask { input: { id: UUID } output: String }
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const generator = new ExpressGenerator();
    const context: GeneratorContext = {
      ir,
      config: { outputDir: "./out", llm: { provider: "mock" } },
      targetModules: Array.from(ir.modules.values()),
    };

    const output = await generator.generate(context);

    expect(output.dependencies).toHaveProperty("express");
    expect(output.dependencies).toHaveProperty("cors");
    expect(output.devDependencies).toHaveProperty("@types/express");
    expect(output.devDependencies).toHaveProperty("tsx");
  });
});

describe("ReactGenerator", () => {
  it("has correct metadata", () => {
    const generator = new ReactGenerator();

    expect(generator.meta.id).toBe("typescript:react");
    expect(generator.meta.target).toBe("frontend");
    expect(generator.meta.framework).toBe("react");
  });

  it("generates all required files", async () => {
    const source = `
@frontend(react)
module test.api
intent route GetTask { input: { id: UUID } output: String }
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const generator = new ReactGenerator();
    const context: GeneratorContext = {
      ir,
      config: { outputDir: "./out" },
      targetModules: Array.from(ir.modules.values()),
    };

    const output = await generator.generate(context);

    const filePaths = output.files.map((f) => f.path);
    expect(filePaths).toContain("src/types.ts");
    expect(filePaths).toContain("src/api/client.ts");
    expect(filePaths).toContain("src/hooks/index.ts");
    // Project files should be generated by default
    expect(filePaths).toContain("package.json");
    expect(filePaths).toContain("tsconfig.json");
    expect(filePaths).toContain("vite.config.ts");
    expect(filePaths).toContain("index.html");
    expect(filePaths).toContain("src/main.tsx");
    expect(filePaths).toContain("src/App.tsx");
  });

  it("can skip project files", async () => {
    const source = `
@frontend(react)
module test.api
intent route GetTask { input: { id: UUID } output: String }
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const generator = new ReactGenerator({ includeProjectFiles: false });
    const context: GeneratorContext = {
      ir,
      config: { outputDir: "./out" },
      targetModules: Array.from(ir.modules.values()),
    };

    const output = await generator.generate(context);

    const filePaths = output.files.map((f) => f.path);
    expect(filePaths).not.toContain("package.json");
    expect(filePaths).not.toContain("vite.config.ts");
    expect(filePaths).not.toContain("src/main.tsx");
  });

  it("includes correct dependencies", async () => {
    const source = `
@frontend(react)
module test.api
intent route GetTask { input: { id: UUID } output: String }
`;
    const { program } = parseTandem(source);
    const { ir } = compileToIR(program);
    const generator = new ReactGenerator();
    const context: GeneratorContext = {
      ir,
      config: { outputDir: "./out" },
      targetModules: Array.from(ir.modules.values()),
    };

    const output = await generator.generate(context);

    expect(output.dependencies).toHaveProperty("@tanstack/react-query");
  });
});

// =============================================================================
// Registry Integration Tests
// =============================================================================

describe("Generator Registration", () => {
  it("registers all generators", () => {
    // Clear and re-register to test
    generatorRegistry.clear();
    registerAllGenerators();

    expect(generatorRegistry.has("typescript:types")).toBe(true);
    expect(generatorRegistry.has("typescript:express")).toBe(true);
    expect(generatorRegistry.has("typescript:react")).toBe(true);
  });

  it("can find generator by annotation", () => {
    generatorRegistry.clear();
    registerAllGenerators();

    const express = generatorRegistry.findByAnnotation("backend", "express", "typescript");
    const react = generatorRegistry.findByAnnotation("frontend", "react", "typescript");

    expect(express).toBeDefined();
    expect(express?.meta.id).toBe("typescript:express");

    expect(react).toBeDefined();
    expect(react?.meta.id).toBe("typescript:react");
  });
});

// =============================================================================
// Full Stack Integration Test
// =============================================================================

describe("Full Stack Generation (sample-fullstack.tdm)", () => {
  const fullstackPath = path.resolve(__dirname, "../../samples/sample-fullstack.tdm");

  it("generates complete output for fullstack sample", async () => {
    const source = fs.readFileSync(fullstackPath, "utf-8");
    const { program } = parseTandem(source);
    const { ir, diagnostics } = compileToIR(program);

    expect(diagnostics).toEqual([]);

    // Test TypesGenerator
    const typesGen = new TypesGenerator();
    const typesOutput = typesGen.generate({
      ir,
      config: { outputDir: "./out", llm: { provider: "mock" } },
      targetModules: Array.from(ir.modules.values()),
    });

    expect(typesOutput.files[0].content).toContain("export type TaskId");
    expect(typesOutput.files[0].content).toContain("export interface Task");
    expect(typesOutput.files[0].content).toContain("export interface ListTasksInput");
    expect(typesOutput.files[0].content).toContain("export type GetTaskOutput");

    // Test ExpressGenerator
    const expressGen = new ExpressGenerator();
    const expressOutput = await expressGen.generate({
      ir,
      config: { outputDir: "./out", llm: { provider: "mock" } },
      targetModules: Array.from(ir.modules.values()),
    });

    const handlersFile = expressOutput.files.find((f) => f.path.includes("handlers"));
    expect(handlersFile?.content).toContain("listTasksHandler");
    expect(handlersFile?.content).toContain("getTaskHandler");
    expect(handlersFile?.content).toContain("createTaskHandler");
    expect(handlersFile?.content).toContain("deleteTaskHandler");

    // Test ReactGenerator
    const reactGen = new ReactGenerator();
    const reactOutput = await reactGen.generate({
      ir,
      config: { outputDir: "./out", llm: { provider: "mock" } },
      targetModules: Array.from(ir.modules.values()),
    });

    const hooksFile = reactOutput.files.find((f) => f.path.includes("hooks"));
    expect(hooksFile?.content).toContain("useListTasks");
    expect(hooksFile?.content).toContain("useGetTask");
    expect(hooksFile?.content).toContain("useCreateTask");
    expect(hooksFile?.content).toContain("useDeleteTask");

    const clientFile = reactOutput.files.find((f) => f.path.includes("client"));
    expect(clientFile?.content).toContain("listTasks:");
    expect(clientFile?.content).toContain("getTask:");
    expect(clientFile?.content).toContain("createTask:");
  });
});
