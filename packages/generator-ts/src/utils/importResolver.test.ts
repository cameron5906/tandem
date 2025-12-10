import { describe, it, expect, beforeEach } from "vitest";
import { ImportResolver } from "./importResolver";
import { IRTypeRef } from "@tandem-lang/compiler";

describe("ImportResolver", () => {
  let resolver: ImportResolver;

  beforeEach(() => {
    resolver = new ImportResolver();
  });

  describe("registerType", () => {
    it("registers a type location", () => {
      resolver.registerType("api.users.User", "api.users");
      expect(resolver.getTypeModule("api.users.User")).toBe("api.users");
    });
  });

  describe("registerTypes", () => {
    it("registers all types from a map", () => {
      const types = new Map([
        ["api.users.User", {}],
        ["domain.tasks.Task", {}],
      ]);

      resolver.registerTypes(types);

      expect(resolver.getTypeModule("api.users.User")).toBe("api.users");
      expect(resolver.getTypeModule("domain.tasks.Task")).toBe("domain.tasks");
    });
  });

  describe("isPrimitive", () => {
    it("recognizes primitive types", () => {
      expect(resolver.isPrimitive("String")).toBe(true);
      expect(resolver.isPrimitive("Int")).toBe(true);
      expect(resolver.isPrimitive("UUID")).toBe(true);
      expect(resolver.isPrimitive("DateTime")).toBe(true);
    });

    it("rejects non-primitive types", () => {
      expect(resolver.isPrimitive("User")).toBe(false);
      expect(resolver.isPrimitive("api.users.User")).toBe(false);
    });
  });

  describe("collectTypeRefs", () => {
    it("collects simple type ref", () => {
      resolver.registerType("api.users.User", "api.users");

      const ref: IRTypeRef = { kind: "simple", fqn: "api.users.User" };
      const refs = resolver.collectTypeRefs(ref);

      expect(refs).toEqual(["api.users.User"]);
    });

    it("skips primitive types", () => {
      const ref: IRTypeRef = { kind: "simple", fqn: "String" };
      const refs = resolver.collectTypeRefs(ref);

      expect(refs).toEqual([]);
    });

    it("collects nested generic type refs", () => {
      resolver.registerType("api.users.User", "api.users");
      resolver.registerType("domain.tasks.Task", "domain.tasks");

      const ref: IRTypeRef = {
        kind: "generic",
        name: "List",
        typeArgs: [{ kind: "simple", fqn: "api.users.User" }],
      };
      const refs = resolver.collectTypeRefs(ref);

      expect(refs).toEqual(["api.users.User"]);
    });

    it("collects from deeply nested generics", () => {
      resolver.registerType("api.users.User", "api.users");

      const ref: IRTypeRef = {
        kind: "generic",
        name: "Optional",
        typeArgs: [
          {
            kind: "generic",
            name: "List",
            typeArgs: [{ kind: "simple", fqn: "api.users.User" }],
          },
        ],
      };
      const refs = resolver.collectTypeRefs(ref);

      expect(refs).toEqual(["api.users.User"]);
    });
  });

  describe("resolveImports", () => {
    it("resolves cross-module import", () => {
      resolver.registerType("domain.user.User", "domain.user");

      const refs: IRTypeRef[] = [{ kind: "simple", fqn: "domain.user.User" }];
      const imports = resolver.resolveImports("api.users", refs);

      expect(imports).toHaveLength(1);
      expect(imports[0]).toEqual({
        from: "../../domain/user",
        types: ["User"],
        isTypeOnly: true,
      });
    });

    it("skips same-module types", () => {
      resolver.registerType("api.users.User", "api.users");

      const refs: IRTypeRef[] = [{ kind: "simple", fqn: "api.users.User" }];
      const imports = resolver.resolveImports("api.users", refs);

      expect(imports).toHaveLength(0);
    });

    it("groups imports by source module", () => {
      resolver.registerType("domain.user.User", "domain.user");
      resolver.registerType("domain.user.UserId", "domain.user");

      const refs: IRTypeRef[] = [
        { kind: "simple", fqn: "domain.user.User" },
        { kind: "simple", fqn: "domain.user.UserId" },
      ];
      const imports = resolver.resolveImports("api.users", refs);

      expect(imports).toHaveLength(1);
      expect(imports[0].types).toEqual(["User", "UserId"]);
    });

    it("handles multiple source modules", () => {
      resolver.registerType("domain.user.User", "domain.user");
      resolver.registerType("domain.tasks.Task", "domain.tasks");

      const refs: IRTypeRef[] = [
        { kind: "simple", fqn: "domain.user.User" },
        { kind: "simple", fqn: "domain.tasks.Task" },
      ];
      const imports = resolver.resolveImports("api.users", refs);

      expect(imports).toHaveLength(2);
    });

    it("sorts types alphabetically", () => {
      resolver.registerType("domain.user.Zebra", "domain.user");
      resolver.registerType("domain.user.Apple", "domain.user");

      const refs: IRTypeRef[] = [
        { kind: "simple", fqn: "domain.user.Zebra" },
        { kind: "simple", fqn: "domain.user.Apple" },
      ];
      const imports = resolver.resolveImports("api.users", refs);

      expect(imports[0].types).toEqual(["Apple", "Zebra"]);
    });
  });

  describe("generateImportCode", () => {
    it("generates type import statement", () => {
      const imports = [
        {
          from: "../../domain/user",
          types: ["User", "UserId"],
          isTypeOnly: true,
        },
      ];

      const code = resolver.generateImportCode(imports);

      expect(code).toBe(
        'import type { User, UserId } from "../../domain/user";\n'
      );
    });

    it("generates non-type import statement", () => {
      const imports = [
        {
          from: "./client",
          types: ["api"],
          isTypeOnly: false,
        },
      ];

      const code = resolver.generateImportCode(imports);

      expect(code).toBe('import { api } from "./client";\n');
    });

    it("returns empty string for no imports", () => {
      const code = resolver.generateImportCode([]);
      expect(code).toBe("");
    });

    it("generates multiple import statements", () => {
      const imports = [
        { from: "../../domain/tasks", types: ["Task"], isTypeOnly: true },
        { from: "../../domain/user", types: ["User"], isTypeOnly: true },
      ];

      const code = resolver.generateImportCode(imports);

      expect(code).toContain('import type { Task } from "../../domain/tasks";');
      expect(code).toContain('import type { User } from "../../domain/user";');
    });
  });

  describe("resolveAndGenerate", () => {
    it("combines resolve and generate", () => {
      resolver.registerType("domain.user.User", "domain.user");

      const refs: IRTypeRef[] = [{ kind: "simple", fqn: "domain.user.User" }];
      const code = resolver.resolveAndGenerate("api.users", refs);

      expect(code).toBe('import type { User } from "../../domain/user";\n');
    });
  });
});
