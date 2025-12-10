import { describe, it, expect } from "vitest";
import type { IRIntent } from "@tandem-lang/compiler";
import { simpleType } from "@tandem-lang/compiler";
import { IntentAnalyzer } from "./IntentAnalyzer";

describe("IntentAnalyzer", () => {
  const analyzer = new IntentAnalyzer();

  function createIntent(name: string): IRIntent {
    return {
      kind: "route",
      name,
      inputType: { fields: [] },
      outputType: simpleType("String"),
    };
  }

  describe("classify", () => {
    it("classifies Get* as query with GET method", () => {
      const result = analyzer.classify(createIntent("api.users.GetUser"));

      expect(result.isQuery).toBe(true);
      expect(result.isMutation).toBe(false);
      expect(result.httpMethod).toBe("GET");
      expect(result.category).toBe("read");
    });

    it("classifies List* as query with GET method", () => {
      const result = analyzer.classify(createIntent("api.users.ListUsers"));

      expect(result.isQuery).toBe(true);
      expect(result.httpMethod).toBe("GET");
    });

    it("classifies Search* as query with GET method", () => {
      const result = analyzer.classify(createIntent("api.users.SearchUsers"));

      expect(result.isQuery).toBe(true);
      expect(result.httpMethod).toBe("GET");
    });

    it("classifies Create* as mutation with POST method", () => {
      const result = analyzer.classify(createIntent("api.users.CreateUser"));

      expect(result.isQuery).toBe(false);
      expect(result.isMutation).toBe(true);
      expect(result.httpMethod).toBe("POST");
      expect(result.category).toBe("create");
    });

    it("classifies Add* as mutation with POST method", () => {
      const result = analyzer.classify(createIntent("api.users.AddUser"));

      expect(result.isMutation).toBe(true);
      expect(result.httpMethod).toBe("POST");
      expect(result.category).toBe("create");
    });

    it("classifies Update* as mutation with PUT method", () => {
      const result = analyzer.classify(createIntent("api.users.UpdateUser"));

      expect(result.isMutation).toBe(true);
      expect(result.httpMethod).toBe("PUT");
      expect(result.category).toBe("update");
    });

    it("classifies Edit* as mutation with PUT method", () => {
      const result = analyzer.classify(createIntent("api.users.EditUser"));

      expect(result.httpMethod).toBe("PUT");
      expect(result.category).toBe("update");
    });

    it("classifies Delete* as mutation with DELETE method", () => {
      const result = analyzer.classify(createIntent("api.users.DeleteUser"));

      expect(result.isMutation).toBe(true);
      expect(result.httpMethod).toBe("DELETE");
      expect(result.category).toBe("delete");
    });

    it("classifies Remove* as mutation with DELETE method", () => {
      const result = analyzer.classify(createIntent("api.users.RemoveUser"));

      expect(result.httpMethod).toBe("DELETE");
      expect(result.category).toBe("delete");
    });

    it("defaults unknown intents to POST mutation", () => {
      const result = analyzer.classify(createIntent("api.users.DoSomething"));

      expect(result.isMutation).toBe(true);
      expect(result.httpMethod).toBe("POST");
      expect(result.category).toBe("create");
    });
  });

  describe("getHttpMethod", () => {
    it("returns GET for query intents", () => {
      expect(analyzer.getHttpMethod(createIntent("api.GetItem"))).toBe("GET");
    });

    it("returns POST for create intents", () => {
      expect(analyzer.getHttpMethod(createIntent("api.CreateItem"))).toBe(
        "POST",
      );
    });

    it("returns PUT for update intents", () => {
      expect(analyzer.getHttpMethod(createIntent("api.UpdateItem"))).toBe(
        "PUT",
      );
    });

    it("returns DELETE for delete intents", () => {
      expect(analyzer.getHttpMethod(createIntent("api.DeleteItem"))).toBe(
        "DELETE",
      );
    });
  });

  describe("isQuery", () => {
    it("returns true for Get* intents", () => {
      expect(analyzer.isQuery(createIntent("api.GetUser"))).toBe(true);
    });

    it("returns false for Create* intents", () => {
      expect(analyzer.isQuery(createIntent("api.CreateUser"))).toBe(false);
    });
  });

  describe("isMutation", () => {
    it("returns false for Get* intents", () => {
      expect(analyzer.isMutation(createIntent("api.GetUser"))).toBe(false);
    });

    it("returns true for Create* intents", () => {
      expect(analyzer.isMutation(createIntent("api.CreateUser"))).toBe(true);
    });
  });

  describe("generateRoutePath", () => {
    it("generates camelCase route from intent name", () => {
      expect(analyzer.generateRoutePath("api.users.GetUser")).toBe("/getUser");
    });

    it("handles deeply nested modules", () => {
      expect(analyzer.generateRoutePath("api.v1.users.CreateUser")).toBe(
        "/createUser",
      );
    });

    it("preserves case after first character", () => {
      expect(analyzer.generateRoutePath("api.GetUserById")).toBe("/getUserById");
    });
  });

  describe("extractModulePath", () => {
    it("extracts module path from FQN", () => {
      expect(analyzer.extractModulePath("api.users.GetUser")).toBe("api.users");
    });

    it("handles single segment module", () => {
      expect(analyzer.extractModulePath("api.GetUser")).toBe("api");
    });
  });
});
