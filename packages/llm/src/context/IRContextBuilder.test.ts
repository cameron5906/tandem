import { describe, it, expect, beforeEach } from "vitest";
import { createEmptyIR, simpleType, genericType } from "@tandem-lang/compiler";
import type { TandemIR, IRIntent, IRComponent } from "@tandem-lang/compiler";
import { IRContextBuilder } from "./IRContextBuilder";

describe("IRContextBuilder", () => {
  let builder: IRContextBuilder;
  let ir: TandemIR;

  beforeEach(() => {
    builder = new IRContextBuilder();
    ir = createEmptyIR();

    // Set up test IR
    ir.modules.set("api.users", {
      name: "api.users",
      annotations: [{ name: "backend", value: "express" }],
    });

    ir.types.set("api.users.UserId", {
      kind: "alias",
      target: simpleType("UUID"),
    });

    ir.types.set("api.users.User", {
      kind: "record",
      fields: [
        { name: "id", type: simpleType("api.users.UserId") },
        { name: "name", type: simpleType("String") },
        { name: "email", type: simpleType("Email") },
        { name: "age", type: genericType("Optional", [simpleType("Int")]) },
      ],
    });

    ir.intents.set("api.users.GetUser", {
      kind: "route",
      name: "api.users.GetUser",
      inputType: {
        fields: [{ name: "id", type: simpleType("api.users.UserId") }],
      },
      outputType: simpleType("api.users.User"),
      spec: "Fetch a user by their unique ID",
    });

    ir.intents.set("api.users.CreateUser", {
      kind: "route",
      name: "api.users.CreateUser",
      inputType: {
        fields: [
          { name: "name", type: simpleType("String") },
          { name: "email", type: simpleType("Email") },
        ],
      },
      outputType: simpleType("api.users.User"),
      spec: "Create a new user account",
    });

    ir.components.set("app.users.UserCard", {
      name: "app.users.UserCard",
      element: "card",
      displays: simpleType("api.users.User"),
      actions: ["api.users.GetUser"],
      spec: "Display user information in a card",
    });

    ir.components.set("app.users.UserForm", {
      name: "app.users.UserForm",
      element: "form",
      binds: "api.users.CreateUser",
      spec: "Form to create a new user",
    });
  });

  describe("buildHandlerContext", () => {
    it("builds context for a GET intent", () => {
      const context = builder.buildHandlerContext(ir, "api.users.GetUser");

      expect(context.intent.name).toBe("api.users.GetUser");
      expect(context.httpMethod).toBe("GET");
      expect(context.routePath).toBe("/getUser");
      expect(context.moduleName).toBe("api.users");
      expect(context.spec).toBe("Fetch a user by their unique ID");
    });

    it("builds context for a POST intent", () => {
      const context = builder.buildHandlerContext(ir, "api.users.CreateUser");

      expect(context.intent.name).toBe("api.users.CreateUser");
      expect(context.httpMethod).toBe("POST");
      expect(context.routePath).toBe("/createUser");
    });

    it("resolves input type with fields", () => {
      const context = builder.buildHandlerContext(ir, "api.users.GetUser");

      expect(context.inputType.fqn).toBe("GetUserInput");
      expect(context.inputType.kind).toBe("record");
      expect(context.inputType.fields).toHaveLength(1);
      expect(context.inputType.fields![0].name).toBe("id");
    });

    it("resolves output type", () => {
      const context = builder.buildHandlerContext(ir, "api.users.GetUser");

      expect(context.outputType.fqn).toBe("api.users.User");
      expect(context.outputType.kind).toBe("record");
      expect(context.outputType.fields).toHaveLength(4);
    });

    it("collects related types", () => {
      const context = builder.buildHandlerContext(ir, "api.users.GetUser");

      // Should include UserId and User
      expect(context.relatedTypes.length).toBeGreaterThan(0);
      const fqns = context.relatedTypes.map((t) => t.fqn);
      expect(fqns).toContain("api.users.User");
    });

    it("throws for unknown intent", () => {
      expect(() =>
        builder.buildHandlerContext(ir, "unknown.Intent"),
      ).toThrow("Intent not found");
    });
  });

  describe("buildComponentContext", () => {
    it("builds context for a card component", () => {
      const context = builder.buildComponentContext(ir, "app.users.UserCard");

      expect(context.component.name).toBe("app.users.UserCard");
      expect(context.component.element).toBe("card");
      expect(context.moduleName).toBe("app.users");
      expect(context.spec).toBe("Display user information in a card");
    });

    it("resolves display type for card", () => {
      const context = builder.buildComponentContext(ir, "app.users.UserCard");

      expect(context.displayType).toBeDefined();
      expect(context.displayType!.fqn).toBe("api.users.User");
      expect(context.displayType!.kind).toBe("record");
    });

    it("collects action intents", () => {
      const context = builder.buildComponentContext(ir, "app.users.UserCard");

      expect(context.actionIntents).toHaveLength(1);
      expect(context.actionIntents[0].name).toBe("api.users.GetUser");
    });

    it("builds context for a form component", () => {
      const context = builder.buildComponentContext(ir, "app.users.UserForm");

      expect(context.component.element).toBe("form");
      expect(context.boundIntent).toBeDefined();
      expect(context.boundIntent!.name).toBe("api.users.CreateUser");
    });

    it("includes element semantics", () => {
      const context = builder.buildComponentContext(ir, "app.users.UserCard");

      expect(context.elementSemantics).toBeDefined();
      expect(context.elementSemantics.element).toBe("card");
      expect(context.elementSemantics.purpose).toContain("Display data");
      expect(context.elementSemantics.expectedBehaviors.length).toBeGreaterThan(
        0,
      );
    });

    it("throws for unknown component", () => {
      expect(() =>
        builder.buildComponentContext(ir, "unknown.Component"),
      ).toThrow("Component not found");
    });
  });

  describe("resolveType", () => {
    it("resolves primitive types", () => {
      const resolved = builder.resolveType(ir, simpleType("String"));

      expect(resolved.fqn).toBe("String");
      expect(resolved.kind).toBe("builtin");
      expect(resolved.tsType).toBe("string");
    });

    it("resolves user-defined record types", () => {
      const resolved = builder.resolveType(ir, simpleType("api.users.User"));

      expect(resolved.fqn).toBe("api.users.User");
      expect(resolved.kind).toBe("record");
      expect(resolved.fields).toHaveLength(4);
    });

    it("resolves alias types", () => {
      const resolved = builder.resolveType(ir, simpleType("api.users.UserId"));

      expect(resolved.fqn).toBe("api.users.UserId");
      expect(resolved.kind).toBe("alias");
      expect(resolved.tsType).toBe("UUID");
    });

    it("resolves Optional generic types", () => {
      const resolved = builder.resolveType(
        ir,
        genericType("Optional", [simpleType("String")]),
      );

      expect(resolved.tsType).toBe("string | null");
    });

    it("resolves List generic types", () => {
      const resolved = builder.resolveType(
        ir,
        genericType("List", [simpleType("api.users.User")]),
      );

      expect(resolved.tsType).toBe("User[]");
    });

    it("resolves Map generic types", () => {
      const resolved = builder.resolveType(
        ir,
        genericType("Map", [simpleType("String"), simpleType("Int")]),
      );

      expect(resolved.tsType).toBe("Record<string, number>");
    });
  });
});
