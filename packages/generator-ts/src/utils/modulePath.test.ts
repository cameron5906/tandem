import { describe, it, expect } from "vitest";
import {
  fqnToPath,
  extractModulePath,
  getRelativeImportPath,
  groupByModule,
  moduleToDirectory,
} from "./modulePath";

describe("fqnToPath", () => {
  it("converts dot notation to path", () => {
    expect(fqnToPath("api.users")).toBe("api/users");
  });

  it("handles single segment", () => {
    expect(fqnToPath("domain")).toBe("domain");
  });

  it("handles deeply nested modules", () => {
    expect(fqnToPath("a.b.c.d")).toBe("a/b/c/d");
  });

  it("handles item FQN", () => {
    expect(fqnToPath("api.users.GetUser")).toBe("api/users/GetUser");
  });
});

describe("extractModulePath", () => {
  it("extracts module from type FQN", () => {
    expect(extractModulePath("api.users.User")).toBe("api.users");
  });

  it("extracts module from intent FQN", () => {
    expect(extractModulePath("api.users.GetUser")).toBe("api.users");
  });

  it("handles single segment", () => {
    expect(extractModulePath("User")).toBe("User");
  });

  it("handles two segments", () => {
    expect(extractModulePath("domain.User")).toBe("domain");
  });

  it("handles deeply nested FQN", () => {
    expect(extractModulePath("a.b.c.d.Type")).toBe("a.b.c.d");
  });
});

describe("getRelativeImportPath", () => {
  it("calculates sibling path", () => {
    expect(getRelativeImportPath("api/users", "api/tasks")).toBe("../tasks");
  });

  it("calculates path to parent sibling", () => {
    expect(getRelativeImportPath("api/users", "domain/user")).toBe(
      "../../domain/user"
    );
  });

  it("calculates path to nested sibling", () => {
    expect(getRelativeImportPath("api", "domain/user")).toBe("../domain/user");
  });

  it("handles same directory", () => {
    expect(getRelativeImportPath("api/users", "api/users")).toBe(".");
  });

  it("calculates path to child", () => {
    expect(getRelativeImportPath("api", "api/users")).toBe("./users");
  });

  it("handles deeply nested paths", () => {
    expect(getRelativeImportPath("a/b/c", "x/y/z")).toBe("../../../x/y/z");
  });

  it("handles common prefix", () => {
    expect(getRelativeImportPath("app/api/users", "app/api/tasks")).toBe(
      "../tasks"
    );
  });
});

describe("groupByModule", () => {
  it("groups types by module prefix", () => {
    const types = new Map([
      ["api.users.User", { kind: "record" }],
      ["api.users.UserId", { kind: "alias" }],
      ["domain.tasks.Task", { kind: "record" }],
    ]);

    const grouped = groupByModule(types);

    expect(grouped.size).toBe(2);
    expect(grouped.get("api.users")?.size).toBe(2);
    expect(grouped.get("domain.tasks")?.size).toBe(1);
  });

  it("handles empty map", () => {
    const grouped = groupByModule(new Map());
    expect(grouped.size).toBe(0);
  });

  it("handles single item", () => {
    const items = new Map([["api.users.User", { kind: "record" }]]);
    const grouped = groupByModule(items);

    expect(grouped.size).toBe(1);
    expect(grouped.get("api.users")?.size).toBe(1);
  });

  it("preserves original FQN as key", () => {
    const items = new Map([["api.users.User", { kind: "record" }]]);
    const grouped = groupByModule(items);

    const moduleItems = grouped.get("api.users");
    expect(moduleItems?.has("api.users.User")).toBe(true);
  });
});

describe("moduleToDirectory", () => {
  it("converts module path to directory", () => {
    expect(moduleToDirectory("api.users")).toBe("api/users");
  });

  it("handles single segment", () => {
    expect(moduleToDirectory("domain")).toBe("domain");
  });

  it("handles deeply nested", () => {
    expect(moduleToDirectory("a.b.c.d")).toBe("a/b/c/d");
  });
});
