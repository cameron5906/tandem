import { describe, it, expect } from "vitest";
import { ApiClientEmitter } from "./ApiClientEmitter";
import { TandemIR, IRIntent, createEmptyIR } from "@tandem-lang/compiler";

function createTestIR(
  intents: Array<{ fqn: string; intent: IRIntent }>
): TandemIR {
  const ir = createEmptyIR();

  for (const { fqn, intent } of intents) {
    ir.intents.set(fqn, intent);
  }

  return ir;
}

describe("ApiClientEmitter", () => {
  describe("modular output", () => {
    it("emits client to module directories", () => {
      const ir = createTestIR([
        {
          fqn: "api.users.GetUser",
          intent: {
            kind: "route",
            name: "api.users.GetUser",
            inputType: {
              fields: [{ name: "id", type: { kind: "simple", fqn: "String" } }],
            },
            outputType: { kind: "simple", fqn: "String" },
          },
        },
        {
          fqn: "api.tasks.ListTasks",
          intent: {
            kind: "route",
            name: "api.tasks.ListTasks",
            inputType: { fields: [] },
            outputType: { kind: "simple", fqn: "String" },
          },
        },
      ]);

      const emitter = new ApiClientEmitter();
      const files = emitter.emit(ir);

      const filenames = files.map((f) => f.filename);

      expect(filenames).toContain("api/users/client.ts");
      expect(filenames).toContain("api/tasks/client.ts");
      expect(filenames).toContain("api/client.ts"); // Aggregate
    });

    it("imports types from local types.ts", () => {
      const ir = createTestIR([
        {
          fqn: "api.users.GetUser",
          intent: {
            kind: "route",
            name: "api.users.GetUser",
            inputType: {
              fields: [{ name: "id", type: { kind: "simple", fqn: "String" } }],
            },
            outputType: { kind: "simple", fqn: "String" },
          },
        },
      ]);

      const emitter = new ApiClientEmitter();
      const files = emitter.emit(ir);

      const clientFile = files.find(
        (f) => f.filename === "api/users/client.ts"
      );
      expect(clientFile).toBeDefined();
      expect(clientFile!.content).toContain('from "./types"');
      expect(clientFile!.content).toContain("GetUserInput");
      expect(clientFile!.content).toContain("GetUserOutput");
    });

    it("generates aggregate client that combines all modules", () => {
      const ir = createTestIR([
        {
          fqn: "api.users.GetUser",
          intent: {
            kind: "route",
            name: "api.users.GetUser",
            inputType: { fields: [] },
            outputType: { kind: "simple", fqn: "String" },
          },
        },
        {
          fqn: "api.tasks.ListTasks",
          intent: {
            kind: "route",
            name: "api.tasks.ListTasks",
            inputType: { fields: [] },
            outputType: { kind: "simple", fqn: "String" },
          },
        },
      ]);

      const emitter = new ApiClientEmitter();
      const files = emitter.emit(ir);

      const aggregate = files.find((f) => f.filename === "api/client.ts");
      expect(aggregate).toBeDefined();
      expect(aggregate!.content).toContain("api/users/client");
      expect(aggregate!.content).toContain("api/tasks/client");
      expect(aggregate!.content).toContain("...apiUsersApi");
      expect(aggregate!.content).toContain("...apiTasksApi");
    });

    it("returns empty array for IR with no intents", () => {
      const ir = createEmptyIR();

      const emitter = new ApiClientEmitter();
      const files = emitter.emit(ir);

      expect(files).toHaveLength(0);
    });

    it("uses custom base URL", () => {
      const ir = createTestIR([
        {
          fqn: "api.users.GetUser",
          intent: {
            kind: "route",
            name: "api.users.GetUser",
            inputType: { fields: [] },
            outputType: { kind: "simple", fqn: "String" },
          },
        },
      ]);

      const emitter = new ApiClientEmitter({ baseUrl: "/custom-api" });
      const files = emitter.emit(ir);

      const clientFile = files.find(
        (f) => f.filename === "api/users/client.ts"
      );
      expect(clientFile!.content).toContain('/custom-api"');
    });
  });

  describe("API method generation", () => {
    it("generates GET method for query intents", () => {
      const ir = createTestIR([
        {
          fqn: "api.users.GetUser",
          intent: {
            kind: "route",
            name: "api.users.GetUser",
            inputType: {
              fields: [{ name: "id", type: { kind: "simple", fqn: "String" } }],
            },
            outputType: { kind: "simple", fqn: "String" },
          },
        },
      ]);

      const emitter = new ApiClientEmitter();
      const files = emitter.emit(ir);

      const clientFile = files.find(
        (f) => f.filename === "api/users/client.ts"
      );
      expect(clientFile!.content).toContain('method: "GET"');
      expect(clientFile!.content).toContain("toQueryString");
    });

    it("generates POST method for create intents", () => {
      const ir = createTestIR([
        {
          fqn: "api.users.CreateUser",
          intent: {
            kind: "route",
            name: "api.users.CreateUser",
            inputType: {
              fields: [
                { name: "name", type: { kind: "simple", fqn: "String" } },
              ],
            },
            outputType: { kind: "simple", fqn: "String" },
          },
        },
      ]);

      const emitter = new ApiClientEmitter();
      const files = emitter.emit(ir);

      const clientFile = files.find(
        (f) => f.filename === "api/users/client.ts"
      );
      expect(clientFile!.content).toContain('method: "POST"');
      expect(clientFile!.content).toContain("JSON.stringify(input)");
    });

    it("includes JSDoc from spec", () => {
      const ir = createTestIR([
        {
          fqn: "api.users.GetUser",
          intent: {
            kind: "route",
            name: "api.users.GetUser",
            inputType: { fields: [] },
            outputType: { kind: "simple", fqn: "String" },
            spec: "Retrieves a user by ID",
          },
        },
      ]);

      const emitter = new ApiClientEmitter();
      const files = emitter.emit(ir);

      const clientFile = files.find(
        (f) => f.filename === "api/users/client.ts"
      );
      expect(clientFile!.content).toContain("/** Retrieves a user by ID */");
    });

    it("generates proper route path", () => {
      const ir = createTestIR([
        {
          fqn: "api.users.GetUserById",
          intent: {
            kind: "route",
            name: "api.users.GetUserById",
            inputType: { fields: [] },
            outputType: { kind: "simple", fqn: "String" },
          },
        },
      ]);

      const emitter = new ApiClientEmitter();
      const files = emitter.emit(ir);

      const clientFile = files.find(
        (f) => f.filename === "api/users/client.ts"
      );
      expect(clientFile!.content).toContain("/getUserById");
    });
  });

  describe("module aliasing", () => {
    it("creates valid JavaScript identifiers for module aliases", () => {
      const ir = createTestIR([
        {
          fqn: "deep.nested.module.GetItem",
          intent: {
            kind: "route",
            name: "deep.nested.module.GetItem",
            inputType: { fields: [] },
            outputType: { kind: "simple", fqn: "String" },
          },
        },
      ]);

      const emitter = new ApiClientEmitter();
      const files = emitter.emit(ir);

      const aggregate = files.find((f) => f.filename === "api/client.ts");
      expect(aggregate!.content).toContain("deepNestedModuleApi");
    });
  });
});
