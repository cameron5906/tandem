import { describe, it, expect } from "vitest";
import { ReactHooksEmitter } from "./ReactHooksEmitter";
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

describe("ReactHooksEmitter", () => {
  describe("modular output", () => {
    it("emits hooks to module directories", () => {
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

      const emitter = new ReactHooksEmitter();
      const files = emitter.emit(ir);

      const filenames = files.map((f) => f.filename);

      expect(filenames).toContain("api/users/hooks.ts");
      expect(filenames).toContain("api/tasks/hooks.ts");
      expect(filenames).toContain("hooks/index.ts"); // Aggregate
    });

    it("imports from local client and types", () => {
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

      const emitter = new ReactHooksEmitter();
      const files = emitter.emit(ir);

      const hooksFile = files.find(
        (f) => f.filename === "api/users/hooks.ts"
      );
      expect(hooksFile).toBeDefined();
      expect(hooksFile!.content).toContain('from "./client"');
      expect(hooksFile!.content).toContain('from "./types"');
    });

    it("generates aggregate file that re-exports all hooks", () => {
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

      const emitter = new ReactHooksEmitter();
      const files = emitter.emit(ir);

      const aggregate = files.find((f) => f.filename === "hooks/index.ts");
      expect(aggregate).toBeDefined();
      expect(aggregate!.content).toContain("useGetUser");
      expect(aggregate!.content).toContain("api/users/hooks");
      expect(aggregate!.content).toContain("useListTasks");
      expect(aggregate!.content).toContain("api/tasks/hooks");
    });

    it("returns empty array for IR with no intents", () => {
      const ir = createEmptyIR();

      const emitter = new ReactHooksEmitter();
      const files = emitter.emit(ir);

      expect(files).toHaveLength(0);
    });
  });

  describe("hook generation", () => {
    it("generates useQuery hook for query intents", () => {
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

      const emitter = new ReactHooksEmitter();
      const files = emitter.emit(ir);

      const hooksFile = files.find(
        (f) => f.filename === "api/users/hooks.ts"
      );
      expect(hooksFile!.content).toContain("useQuery");
      expect(hooksFile!.content).toContain("useGetUser");
      expect(hooksFile!.content).toContain("queryKey");
      expect(hooksFile!.content).toContain("queryFn");
    });

    it("generates useMutation hook for mutation intents", () => {
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

      const emitter = new ReactHooksEmitter();
      const files = emitter.emit(ir);

      const hooksFile = files.find(
        (f) => f.filename === "api/users/hooks.ts"
      );
      expect(hooksFile!.content).toContain("useMutation");
      expect(hooksFile!.content).toContain("useCreateUser");
      expect(hooksFile!.content).toContain("mutationFn");
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

      const emitter = new ReactHooksEmitter();
      const files = emitter.emit(ir);

      const hooksFile = files.find(
        (f) => f.filename === "api/users/hooks.ts"
      );
      expect(hooksFile!.content).toContain("* Retrieves a user by ID");
    });

    it("imports correct types", () => {
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

      const emitter = new ReactHooksEmitter();
      const files = emitter.emit(ir);

      const hooksFile = files.find(
        (f) => f.filename === "api/users/hooks.ts"
      );
      expect(hooksFile!.content).toContain("GetUserInput");
      expect(hooksFile!.content).toContain("GetUserOutput");
    });
  });

  describe("aggregate sorting", () => {
    it("sorts hooks alphabetically in aggregate", () => {
      const ir = createTestIR([
        {
          fqn: "api.users.ZebbraUser",
          intent: {
            kind: "route",
            name: "api.users.ZebbraUser",
            inputType: { fields: [] },
            outputType: { kind: "simple", fqn: "String" },
          },
        },
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
          fqn: "api.users.AppleUser",
          intent: {
            kind: "route",
            name: "api.users.AppleUser",
            inputType: { fields: [] },
            outputType: { kind: "simple", fqn: "String" },
          },
        },
      ]);

      const emitter = new ReactHooksEmitter();
      const files = emitter.emit(ir);

      const aggregate = files.find((f) => f.filename === "hooks/index.ts");
      expect(aggregate!.content).toContain(
        "useAppleUser, useGetUser, useZebbraUser"
      );
    });

    it("sorts modules alphabetically in aggregate", () => {
      const ir = createTestIR([
        {
          fqn: "z.module.GetZ",
          intent: {
            kind: "route",
            name: "z.module.GetZ",
            inputType: { fields: [] },
            outputType: { kind: "simple", fqn: "String" },
          },
        },
        {
          fqn: "a.module.GetA",
          intent: {
            kind: "route",
            name: "a.module.GetA",
            inputType: { fields: [] },
            outputType: { kind: "simple", fqn: "String" },
          },
        },
      ]);

      const emitter = new ReactHooksEmitter();
      const files = emitter.emit(ir);

      const aggregate = files.find((f) => f.filename === "hooks/index.ts");
      const aIndex = aggregate!.content.indexOf("a/module");
      const zIndex = aggregate!.content.indexOf("z/module");
      expect(aIndex).toBeLessThan(zIndex);
    });
  });
});
