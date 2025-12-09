import { describe, it, expect } from "vitest";
import {
  parseTandem,
  compileToIR,
  simpleType,
  genericType,
} from "@tandem-lang/compiler";
import {
  generateTypeScript,
  TypeScriptTypeMapper,
  TypeDeclarationEmitter,
  shorten,
} from "./src";
import * as fs from "fs";
import * as path from "path";

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

    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe("types.ts");
    expect(typeof files[0].content).toBe("string");
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
