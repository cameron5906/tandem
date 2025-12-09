import { describe, it, expect } from "vitest";
import { ComponentEmitter } from "./ComponentEmitter";
import { TypeScriptTypeMapper } from "../mappers";
import { TandemIR, IRComponent, IRTypeRef } from "@tandem-lang/compiler";

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

describe("ComponentEmitter", () => {
  const mapper = new TypeScriptTypeMapper();
  const emitter = new ComponentEmitter(mapper);

  describe("Card Component", () => {
    it("generates a card component with displays and actions", () => {
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
      const files = emitter.emit(ir);

      // Should generate component file and index
      expect(files.length).toBe(2);

      const cardFile = files.find((f) => f.filename === "components/UserCard.tsx");
      expect(cardFile).toBeDefined();

      const content = cardFile!.content;
      expect(content).toContain("export function UserCard");
      expect(content).toContain("interface UserCardProps");
      expect(content).toContain("data: User");
      expect(content).toContain("Displays user info");
      expect(content).toContain("tandem-card");
      expect(content).toContain("tandem-actions");
      expect(content).toContain("UpdateUser");
      expect(content).toContain("DeleteUser");
    });

    it("generates a card component without actions", () => {
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
      const files = emitter.emit(ir);

      const cardFile = files.find((f) => f.filename === "components/UserCard.tsx");
      const content = cardFile!.content;

      expect(content).toContain("export function UserCard");
      expect(content).not.toContain("tandem-actions");
    });
  });

  describe("Form Component", () => {
    it("generates a form component with binds", () => {
      const components = new Map<string, IRComponent>([
        [
          "app.users.CreateUserForm",
          {
            name: "app.users.CreateUserForm",
            element: "form",
            binds: "app.users.CreateUser",
            spec: "Create user form",
          },
        ],
      ]);

      const ir = createTestIR(components);
      const files = emitter.emit(ir);

      const formFile = files.find(
        (f) => f.filename === "components/CreateUserForm.tsx"
      );
      expect(formFile).toBeDefined();

      const content = formFile!.content;
      expect(content).toContain("export function CreateUserForm");
      expect(content).toContain("useCreateUser");
      expect(content).toContain("CreateUserInput");
      expect(content).toContain("useState");
      expect(content).toContain("FormEvent");
      expect(content).toContain("handleSubmit");
      expect(content).toContain("mutation.mutate");
      expect(content).toContain("mutation.isPending");
      expect(content).toContain("tandem-form");
    });

    it("includes onSuccess and onError callbacks", () => {
      const components = new Map<string, IRComponent>([
        [
          "app.users.CreateUserForm",
          {
            name: "app.users.CreateUserForm",
            element: "form",
            binds: "app.users.CreateUser",
          },
        ],
      ]);

      const ir = createTestIR(components);
      const files = emitter.emit(ir);

      const formFile = files.find(
        (f) => f.filename === "components/CreateUserForm.tsx"
      );
      const content = formFile!.content;

      expect(content).toContain("onSuccess?: () => void");
      expect(content).toContain("onError?: (error: Error) => void");
    });
  });

  describe("List Component", () => {
    it("generates a list component with displays and itemComponent", () => {
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
            itemComponent: "app.users.UserCard",
            emptyState: "No users found",
            spec: "List of users",
          },
        ],
      ]);

      const ir = createTestIR(components);
      const files = emitter.emit(ir);

      const listFile = files.find((f) => f.filename === "components/UserList.tsx");
      expect(listFile).toBeDefined();

      const content = listFile!.content;
      expect(content).toContain("export function UserList");
      expect(content).toContain("data: User[]");
      expect(content).toContain("isLoading?: boolean");
      expect(content).toContain("No users found");
      expect(content).toContain("tandem-list");
      expect(content).toContain("tandem-loading");
      expect(content).toContain("tandem-empty");
      expect(content).toContain("UserCard");
      expect(content).toContain('import { UserCard } from "./UserCard"');
    });

    it("generates a list component without itemComponent", () => {
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
          },
        ],
      ]);

      const ir = createTestIR(components);
      const files = emitter.emit(ir);

      const listFile = files.find((f) => f.filename === "components/UserList.tsx");
      const content = listFile!.content;

      expect(content).toContain("tandem-list-item");
      expect(content).not.toContain('import { UserCard }');
    });
  });

  describe("Table Component", () => {
    it("generates a table component with actions", () => {
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
            emptyState: "No data",
          },
        ],
      ]);

      const ir = createTestIR(components);
      const files = emitter.emit(ir);

      const tableFile = files.find((f) => f.filename === "components/UserTable.tsx");
      expect(tableFile).toBeDefined();

      const content = tableFile!.content;
      expect(content).toContain("export function UserTable");
      expect(content).toContain("tandem-table");
      expect(content).toContain("<table");
      expect(content).toContain("<thead>");
      expect(content).toContain("<tbody>");
      expect(content).toContain("<th>Actions</th>");
      expect(content).toContain("UpdateUser");
      expect(content).toContain("DeleteUser");
    });
  });

  describe("Modal Component", () => {
    it("generates a modal component with binds and displays", () => {
      const components = new Map<string, IRComponent>([
        [
          "app.users.EditUserModal",
          {
            name: "app.users.EditUserModal",
            element: "modal",
            binds: "app.users.UpdateUser",
            displays: { kind: "simple", fqn: "app.users.User" },
            spec: "Edit user modal",
          },
        ],
      ]);

      const ir = createTestIR(components);
      const files = emitter.emit(ir);

      const modalFile = files.find(
        (f) => f.filename === "components/EditUserModal.tsx"
      );
      expect(modalFile).toBeDefined();

      const content = modalFile!.content;
      expect(content).toContain("export function EditUserModal");
      expect(content).toContain("isOpen: boolean");
      expect(content).toContain("onClose: () => void");
      expect(content).toContain("initialData?: User");
      expect(content).toContain("tandem-modal");
      expect(content).toContain("tandem-modal-overlay");
      expect(content).toContain("useUpdateUser");
      expect(content).toContain("Escape");
    });
  });

  describe("Detail Component", () => {
    it("generates a detail component", () => {
      const components = new Map<string, IRComponent>([
        [
          "app.users.UserDetail",
          {
            name: "app.users.UserDetail",
            element: "detail",
            displays: { kind: "simple", fqn: "app.users.User" },
            actions: ["app.users.UpdateUser"],
            spec: "User detail view",
          },
        ],
      ]);

      const ir = createTestIR(components);
      const files = emitter.emit(ir);

      const detailFile = files.find(
        (f) => f.filename === "components/UserDetail.tsx"
      );
      expect(detailFile).toBeDefined();

      const content = detailFile!.content;
      expect(content).toContain("export function UserDetail");
      expect(content).toContain("tandem-detail");
      expect(content).toContain("tandem-detail-field");
      expect(content).toContain("tandem-detail-label");
      expect(content).toContain("tandem-detail-value");
    });
  });

  describe("Index File", () => {
    it("generates an index file exporting all components", () => {
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
      const files = emitter.emit(ir);

      const indexFile = files.find((f) => f.filename === "components/index.ts");
      expect(indexFile).toBeDefined();

      const content = indexFile!.content;
      expect(content).toContain('export { UserCard } from "./UserCard"');
      expect(content).toContain('export { UserList } from "./UserList"');
    });

    it("does not generate index file when no components", () => {
      const ir = createTestIR(new Map());
      const files = emitter.emit(ir);

      expect(files.length).toBe(0);
    });
  });

  describe("Generic/Dashboard Components", () => {
    it("generates a generic component for unsupported element types", () => {
      const components = new Map<string, IRComponent>([
        [
          "app.users.Dashboard",
          {
            name: "app.users.Dashboard",
            element: "dashboard",
            spec: "Main dashboard",
          },
        ],
      ]);

      const ir = createTestIR(components);
      const files = emitter.emit(ir);

      const dashFile = files.find((f) => f.filename === "components/Dashboard.tsx");
      expect(dashFile).toBeDefined();

      const content = dashFile!.content;
      expect(content).toContain("export function Dashboard");
      expect(content).toContain("tandem-dashboard");
      expect(content).toContain("Main dashboard");
    });
  });

  describe("JSDoc Comments", () => {
    it("includes spec as JSDoc comment", () => {
      const components = new Map<string, IRComponent>([
        [
          "app.users.UserCard",
          {
            name: "app.users.UserCard",
            element: "card",
            displays: { kind: "simple", fqn: "app.users.User" },
            spec: "A card showing user information",
          },
        ],
      ]);

      const ir = createTestIR(components);
      const files = emitter.emit(ir);

      const cardFile = files.find((f) => f.filename === "components/UserCard.tsx");
      const content = cardFile!.content;

      expect(content).toContain("/**");
      expect(content).toContain("* A card showing user information");
      expect(content).toContain("*/");
    });
  });
});
