import { describe, it, expect } from "vitest";
import { TypeDeclarationEmitter } from "./TypeDeclarationEmitter";
import { TypeScriptTypeMapper } from "../mappers/TypeScriptTypeMapper";
import { TandemIR, IRType, IRIntent, createEmptyIR } from "@tandem-lang/compiler";

function createTestIR(options: {
  types?: Array<{ fqn: string; type: IRType }>;
  intents?: Array<{ fqn: string; intent: IRIntent }>;
}): TandemIR {
  const ir = createEmptyIR();

  if (options.types) {
    for (const { fqn, type } of options.types) {
      ir.types.set(fqn, type);
    }
  }

  if (options.intents) {
    for (const { fqn, intent } of options.intents) {
      ir.intents.set(fqn, intent);
    }
  }

  return ir;
}

describe("TypeDeclarationEmitter", () => {
  const mapper = new TypeScriptTypeMapper();

  describe("modular output", () => {
    it("emits types to module directories", () => {
      const ir = createTestIR({
        types: [
          {
            fqn: "domain.user.User",
            type: {
              kind: "record",
              fields: [{ name: "id", type: { kind: "simple", fqn: "String" } }],
            },
          },
          {
            fqn: "api.tasks.Task",
            type: {
              kind: "record",
              fields: [
                { name: "title", type: { kind: "simple", fqn: "String" } },
              ],
            },
          },
        ],
      });

      const emitter = new TypeDeclarationEmitter(mapper);
      const files = emitter.emit(ir);

      const filenames = files.map((f) => f.filename);

      expect(filenames).toContain("domain/user/types.ts");
      expect(filenames).toContain("api/tasks/types.ts");
      expect(filenames).toContain("types.ts"); // Aggregate
    });

    it("generates correct cross-module imports", () => {
      const ir = createTestIR({
        types: [
          {
            fqn: "domain.user.UserId",
            type: { kind: "alias", target: { kind: "simple", fqn: "UUID" } },
          },
          {
            fqn: "api.users.UserRecord",
            type: {
              kind: "record",
              fields: [
                { name: "id", type: { kind: "simple", fqn: "domain.user.UserId" } },
              ],
            },
          },
        ],
      });

      const emitter = new TypeDeclarationEmitter(mapper);
      const files = emitter.emit(ir);

      const apiUsersFile = files.find(
        (f) => f.filename === "api/users/types.ts"
      );
      expect(apiUsersFile).toBeDefined();
      expect(apiUsersFile!.content).toContain(
        'import type { UserId } from "../../domain/user"'
      );
    });

    it("generates aggregate barrel file", () => {
      const ir = createTestIR({
        types: [
          {
            fqn: "domain.user.User",
            type: {
              kind: "record",
              fields: [{ name: "id", type: { kind: "simple", fqn: "String" } }],
            },
          },
        ],
      });

      const emitter = new TypeDeclarationEmitter(mapper);
      const files = emitter.emit(ir);

      const aggregate = files.find((f) => f.filename === "types.ts");
      expect(aggregate).toBeDefined();
      expect(aggregate!.content).toContain("domain/user");
      expect(aggregate!.content).toContain("User");
    });

    it("includes intent types in module output", () => {
      const ir = createTestIR({
        intents: [
          {
            fqn: "api.users.GetUser",
            intent: {
              kind: "route",
              name: "api.users.GetUser",
              inputType: {
                fields: [
                  { name: "id", type: { kind: "simple", fqn: "String" } },
                ],
              },
              outputType: { kind: "simple", fqn: "String" },
            },
          },
        ],
      });

      const emitter = new TypeDeclarationEmitter(mapper);
      const files = emitter.emit(ir);

      const apiUsersFile = files.find(
        (f) => f.filename === "api/users/types.ts"
      );
      expect(apiUsersFile).toBeDefined();
      expect(apiUsersFile!.content).toContain("GetUserInput");
      expect(apiUsersFile!.content).toContain("GetUserOutput");
    });

    it("skips intent types when disabled", () => {
      const ir = createTestIR({
        intents: [
          {
            fqn: "api.users.GetUser",
            intent: {
              kind: "route",
              name: "api.users.GetUser",
              inputType: {
                fields: [
                  { name: "id", type: { kind: "simple", fqn: "String" } },
                ],
              },
              outputType: { kind: "simple", fqn: "String" },
            },
          },
        ],
      });

      const emitter = new TypeDeclarationEmitter(mapper, {
        includeIntentTypes: false,
      });
      const files = emitter.emit(ir);

      // Should still generate file for the module but without intent types
      expect(files.length).toBeGreaterThan(0);
      const apiUsersFile = files.find(
        (f) => f.filename === "api/users/types.ts"
      );
      expect(apiUsersFile).toBeDefined();
      expect(apiUsersFile!.content).not.toContain("GetUserInput");
    });

    it("handles empty IR", () => {
      const ir = createEmptyIR();

      const emitter = new TypeDeclarationEmitter(mapper);
      const files = emitter.emit(ir);

      expect(files).toHaveLength(0);
    });

    it("handles types with generic references", () => {
      const ir = createTestIR({
        types: [
          {
            fqn: "domain.user.User",
            type: {
              kind: "record",
              fields: [
                {
                  name: "tags",
                  type: {
                    kind: "generic",
                    name: "List",
                    typeArgs: [{ kind: "simple", fqn: "String" }],
                  },
                },
              ],
            },
          },
        ],
      });

      const emitter = new TypeDeclarationEmitter(mapper);
      const files = emitter.emit(ir);

      const userFile = files.find(
        (f) => f.filename === "domain/user/types.ts"
      );
      expect(userFile).toBeDefined();
      expect(userFile!.content).toContain("tags: string[]");
    });

    it("sorts aggregate exports alphabetically", () => {
      const ir = createTestIR({
        types: [
          {
            fqn: "z.module.ZType",
            type: { kind: "alias", target: { kind: "simple", fqn: "String" } },
          },
          {
            fqn: "a.module.AType",
            type: { kind: "alias", target: { kind: "simple", fqn: "String" } },
          },
        ],
      });

      const emitter = new TypeDeclarationEmitter(mapper);
      const files = emitter.emit(ir);

      const aggregate = files.find((f) => f.filename === "types.ts");
      expect(aggregate).toBeDefined();

      const aIndex = aggregate!.content.indexOf("a/module");
      const zIndex = aggregate!.content.indexOf("z/module");
      expect(aIndex).toBeLessThan(zIndex);
    });
  });

  describe("type generation", () => {
    it("emits type alias correctly", () => {
      const ir = createTestIR({
        types: [
          {
            fqn: "api.users.UserId",
            type: { kind: "alias", target: { kind: "simple", fqn: "UUID" } },
          },
        ],
      });

      const emitter = new TypeDeclarationEmitter(mapper);
      const files = emitter.emit(ir);

      const typeFile = files.find(
        (f) => f.filename === "api/users/types.ts"
      );
      expect(typeFile!.content).toContain("export type UserId = string;");
    });

    it("emits interface correctly", () => {
      const ir = createTestIR({
        types: [
          {
            fqn: "api.users.User",
            type: {
              kind: "record",
              fields: [
                { name: "id", type: { kind: "simple", fqn: "String" } },
                { name: "email", type: { kind: "simple", fqn: "Email" } },
              ],
            },
          },
        ],
      });

      const emitter = new TypeDeclarationEmitter(mapper);
      const files = emitter.emit(ir);

      const typeFile = files.find(
        (f) => f.filename === "api/users/types.ts"
      );
      expect(typeFile!.content).toContain("export interface User {");
      expect(typeFile!.content).toContain("id: string;");
      expect(typeFile!.content).toContain("email: string;");
    });
  });
});
