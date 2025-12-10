import { describe, it, expect } from "vitest";
import { ComponentEmitter } from "./ComponentEmitter";
import { TypeScriptTypeMapper } from "../mappers";
import { TandemIR, IRComponent } from "@tandem-lang/compiler";
import type { GeneratedCode } from "../interfaces/ICodeEmitter";
import {
  MockProvider,
  CodeGenerationPipeline,
  IRContextBuilder,
} from "@tandem-lang/llm";

function createTestIR(components: Map<string, IRComponent>): TandemIR {
  return {
    modules: new Map([
      [
        "app.users",
        {
          name: "app.users",
          annotations: [{ name: "frontend", value: "react" }],
        },
      ],
    ]),
    types: new Map([
      [
        "app.users.User",
        {
          kind: "record",
          fields: [
            { name: "id", type: { kind: "simple", fqn: "UUID" } },
            { name: "name", type: { kind: "simple", fqn: "String" } },
          ],
        },
      ],
    ]),
    intents: new Map([
      [
        "app.users.CreateUser",
        {
          kind: "route",
          name: "app.users.CreateUser",
          inputType: {
            fields: [{ name: "name", type: { kind: "simple", fqn: "String" } }],
          },
          outputType: { kind: "simple", fqn: "app.users.User" },
          spec: "Create a user",
        },
      ],
      [
        "app.users.UpdateUser",
        {
          kind: "route",
          name: "app.users.UpdateUser",
          inputType: {
            fields: [
              { name: "id", type: { kind: "simple", fqn: "UUID" } },
              { name: "name", type: { kind: "simple", fqn: "String" } },
            ],
          },
          outputType: { kind: "simple", fqn: "app.users.User" },
        },
      ],
      [
        "app.users.DeleteUser",
        {
          kind: "route",
          name: "app.users.DeleteUser",
          inputType: {
            fields: [{ name: "id", type: { kind: "simple", fqn: "UUID" } }],
          },
          outputType: { kind: "simple", fqn: "Bool" },
        },
      ],
    ]),
    components,
  };
}

function createMockPipeline(): CodeGenerationPipeline {
  const provider = new MockProvider({ apiKey: "mock-key", model: "mock-model" });
  provider.setMockResponse({
    jsx: "<div>Mock component</div>",
    hooks: [],
    handlers: [],
    imports: [],
  });
  const contextBuilder = new IRContextBuilder();
  return new CodeGenerationPipeline(provider, contextBuilder, { maxRetries: 1 });
}

describe("ComponentEmitter", () => {
  const mapper = new TypeScriptTypeMapper();

  describe("Card Component", () => {
    it("generates a card component with displays and actions", async () => {
      const components = new Map<string, IRComponent>([
        [
          "app.users.UserCard",
          {
            name: "app.users.UserCard",
            element: "card",
            displays: { kind: "simple", fqn: "app.users.User" },
            actions: ["app.users.UpdateUser", "app.users.DeleteUser"],
            spec: "Displays user info",
          },
        ],
      ]);

      const ir = createTestIR(components);
      const emitter = new ComponentEmitter(mapper, { pipeline: createMockPipeline() });
      const files = await emitter.emit(ir);

      // Should generate component file, module index, and aggregate index
      expect(files.length).toBe(3);

      const cardFile = files.find(
        (f) => f.filename === "components/users/UserCard.tsx"
      );
      expect(cardFile).toBeDefined();
      expect(cardFile!.content).toContain("UserCard");
    });
  });

  describe("Form Component", () => {
    it("generates a form component bound to an intent", async () => {
      const components = new Map<string, IRComponent>([
        [
          "app.users.CreateUserForm",
          {
            name: "app.users.CreateUserForm",
            element: "form",
            binds: "app.users.CreateUser",
            spec: "Form to create users",
          },
        ],
      ]);

      const ir = createTestIR(components);
      const emitter = new ComponentEmitter(mapper, { pipeline: createMockPipeline() });
      const files = await emitter.emit(ir);

      expect(files.length).toBe(3);

      const formFile = files.find(
        (f) => f.filename === "components/users/CreateUserForm.tsx"
      );
      expect(formFile).toBeDefined();
      expect(formFile!.content).toContain("CreateUserForm");
    });
  });

  describe("List Component", () => {
    it("generates a list component", async () => {
      const components = new Map<string, IRComponent>([
        [
          "app.users.UserList",
          {
            name: "app.users.UserList",
            element: "list",
            displays: {
              kind: "generic",
              name: "List",
              typeArgs: [{ kind: "simple", fqn: "app.users.User" }],
            },
            emptyState: "No users found",
          },
        ],
      ]);

      const ir = createTestIR(components);
      const emitter = new ComponentEmitter(mapper, { pipeline: createMockPipeline() });
      const files = await emitter.emit(ir);

      expect(files.length).toBe(3);

      const listFile = files.find(
        (f) => f.filename === "components/users/UserList.tsx"
      );
      expect(listFile).toBeDefined();
      expect(listFile!.content).toContain("UserList");
    });

    it("includes item component import when specified", async () => {
      const components = new Map<string, IRComponent>([
        [
          "app.users.UserListWithItems",
          {
            name: "app.users.UserListWithItems",
            element: "list",
            displays: {
              kind: "generic",
              name: "List",
              typeArgs: [{ kind: "simple", fqn: "app.users.User" }],
            },
            itemComponent: "app.users.UserCard",
          },
        ],
      ]);

      const ir = createTestIR(components);
      const emitter = new ComponentEmitter(mapper, { pipeline: createMockPipeline() });
      const files = await emitter.emit(ir);

      const listFile = files.find(
        (f) => f.filename === "components/users/UserListWithItems.tsx"
      );
      expect(listFile).toBeDefined();
    });
  });

  describe("Table Component", () => {
    it("generates a table component", async () => {
      const components = new Map<string, IRComponent>([
        [
          "app.users.UserTable",
          {
            name: "app.users.UserTable",
            element: "table",
            displays: {
              kind: "generic",
              name: "List",
              typeArgs: [{ kind: "simple", fqn: "app.users.User" }],
            },
            actions: ["app.users.UpdateUser", "app.users.DeleteUser"],
          },
        ],
      ]);

      const ir = createTestIR(components);
      const emitter = new ComponentEmitter(mapper, { pipeline: createMockPipeline() });
      const files = await emitter.emit(ir);

      expect(files.length).toBe(3);

      const tableFile = files.find(
        (f) => f.filename === "components/users/UserTable.tsx"
      );
      expect(tableFile).toBeDefined();
      expect(tableFile!.content).toContain("UserTable");
    });
  });

  describe("Modal Component", () => {
    it("generates a modal component", async () => {
      const components = new Map<string, IRComponent>([
        [
          "app.users.EditUserModal",
          {
            name: "app.users.EditUserModal",
            element: "modal",
            displays: { kind: "simple", fqn: "app.users.User" },
            binds: "app.users.UpdateUser",
          },
        ],
      ]);

      const ir = createTestIR(components);
      const emitter = new ComponentEmitter(mapper, { pipeline: createMockPipeline() });
      const files = await emitter.emit(ir);

      expect(files.length).toBe(3);

      const modalFile = files.find(
        (f) => f.filename === "components/users/EditUserModal.tsx"
      );
      expect(modalFile).toBeDefined();
      expect(modalFile!.content).toContain("EditUserModal");
    });
  });

  describe("Detail Component", () => {
    it("generates a detail component", async () => {
      const components = new Map<string, IRComponent>([
        [
          "app.users.UserDetail",
          {
            name: "app.users.UserDetail",
            element: "detail",
            displays: { kind: "simple", fqn: "app.users.User" },
            actions: ["app.users.UpdateUser"],
          },
        ],
      ]);

      const ir = createTestIR(components);
      const emitter = new ComponentEmitter(mapper, { pipeline: createMockPipeline() });
      const files = await emitter.emit(ir);

      expect(files.length).toBe(3);

      const detailFile = files.find(
        (f) => f.filename === "components/users/UserDetail.tsx"
      );
      expect(detailFile).toBeDefined();
      expect(detailFile!.content).toContain("UserDetail");
    });
  });

  describe("Generic Component", () => {
    it("generates a generic component for unknown element types", async () => {
      const components = new Map<string, IRComponent>([
        [
          "app.users.CustomWidget",
          {
            name: "app.users.CustomWidget",
            element: "widget" as any,
            spec: "A custom widget",
          },
        ],
      ]);

      const ir = createTestIR(components);
      const emitter = new ComponentEmitter(mapper, { pipeline: createMockPipeline() });
      const files = await emitter.emit(ir);

      expect(files.length).toBe(3);

      const widgetFile = files.find(
        (f) => f.filename === "components/users/CustomWidget.tsx"
      );
      expect(widgetFile).toBeDefined();
      expect(widgetFile!.content).toContain("CustomWidget");
    });
  });

  describe("Index Generation", () => {
    it("generates module index with component exports", async () => {
      const components = new Map<string, IRComponent>([
        [
          "app.users.UserCard",
          {
            name: "app.users.UserCard",
            element: "card",
            displays: { kind: "simple", fqn: "app.users.User" },
          },
        ],
        [
          "app.users.UserList",
          {
            name: "app.users.UserList",
            element: "list",
            displays: {
              kind: "generic",
              name: "List",
              typeArgs: [{ kind: "simple", fqn: "app.users.User" }],
            },
          },
        ],
      ]);

      const ir = createTestIR(components);
      const emitter = new ComponentEmitter(mapper, { pipeline: createMockPipeline() });
      const files = await emitter.emit(ir);

      const moduleIndex = files.find(
        (f) => f.filename === "components/users/index.ts"
      );
      expect(moduleIndex).toBeDefined();
      expect(moduleIndex!.content).toContain("UserCard");
      expect(moduleIndex!.content).toContain("UserList");
    });

    it("generates aggregate index with all modules", async () => {
      const components = new Map<string, IRComponent>([
        [
          "app.users.UserCard",
          {
            name: "app.users.UserCard",
            element: "card",
            displays: { kind: "simple", fqn: "app.users.User" },
          },
        ],
      ]);

      const ir = createTestIR(components);
      const emitter = new ComponentEmitter(mapper, { pipeline: createMockPipeline() });
      const files = await emitter.emit(ir);

      const aggregateIndex = files.find(
        (f) => f.filename === "components/index.ts"
      );
      expect(aggregateIndex).toBeDefined();
      expect(aggregateIndex!.content).toContain("./users");
    });
  });

  describe("Empty IR", () => {
    it("returns empty array when no components exist", async () => {
      const components = new Map<string, IRComponent>();
      const ir = createTestIR(components);
      const emitter = new ComponentEmitter(mapper, { pipeline: createMockPipeline() });
      const files = await emitter.emit(ir);

      expect(files).toHaveLength(0);
    });
  });
});
