import { describe, it, expect } from "vitest";
import { parseTandem, compileToIR } from "./src/index";
import * as fs from "fs";
import * as path from "path";

const sampleTdmPath = path.resolve(__dirname, "../../samples/sample.tdm");
const source = fs.readFileSync(sampleTdmPath, "utf-8");

describe("parseTandem", () => {
  it("parses the sample.tdm file into an AST", () => {
    const { program, diagnostics } = parseTandem(source);

    expect(diagnostics).toEqual([]);
    expect(program).toBeDefined();

    // Assert module
    expect(program.modules).toHaveLength(1);
    expect(program.modules[0].name).toBe("sample.project");

    // Assert type declarations
    expect(program.types).toHaveLength(2);

    const [userIdType, userType] = program.types;

    // Assert UserId type alias
    expect(userIdType.name).toBe("UserId");
    expect(userIdType.def.kind).toBe("alias");
    if (userIdType.def.kind === "alias") {
      expect(userIdType.def.target.kind).toBe("simple");
      if (userIdType.def.target.kind === "simple") {
        expect(userIdType.def.target.name).toBe("UUID");
      }
    }

    // Assert User type record
    expect(userType.name).toBe("User");
    expect(userType.def.kind).toBe("record");
    if (userType.def.kind === "record") {
      expect(userType.def.fields).toHaveLength(2);
      const [idField, nameField] = userType.def.fields;
      expect(idField.name).toBe("id");
      expect(idField.type.kind).toBe("simple");
      if (idField.type.kind === "simple") {
        expect(idField.type.name).toBe("UserId");
      }
      expect(nameField.name).toBe("name");
      expect(nameField.type.kind).toBe("simple");
      if (nameField.type.kind === "simple") {
        expect(nameField.type.name).toBe("String");
      }
    }

    // Assert intent declaration
    expect(program.intents).toHaveLength(1);
    const [getUserIntent] = program.intents;
    expect(getUserIntent.name).toBe("GetUser");
    expect(getUserIntent.kind).toBe("route");
    expect(getUserIntent.spec).toBe("Returns a user by ID.");

    // Assert intent input
    expect(getUserIntent.input.fields).toHaveLength(1);
    const [inputIdField] = getUserIntent.input.fields;
    expect(inputIdField.name).toBe("id");
    expect(inputIdField.type.kind).toBe("simple");
    if (inputIdField.type.kind === "simple") {
      expect(inputIdField.type.name).toBe("UserId");
    }

    // Assert intent output
    expect(getUserIntent.output.kind).toBe("simple");
    if (getUserIntent.output.kind === "simple") {
      expect(getUserIntent.output.name).toBe("User");
    }
  });

  it("parses generic types correctly", () => {
    const genericSource = `
module test.generics

type Tags = List<String>
type MaybeUser = Optional<User>
type UserMap = Map<String, User>
type UserResult = Result<User, String>

type User {
  id: UUID
  tags: List<String>
  bio: String?
  scores: Int[]
}
`;

    const { program, diagnostics } = parseTandem(genericSource);

    expect(diagnostics).toEqual([]);

    // Assert generic type aliases
    expect(program.types).toHaveLength(5);

    // List<String>
    const tagsType = program.types[0];
    expect(tagsType.name).toBe("Tags");
    expect(tagsType.def.kind).toBe("alias");
    if (tagsType.def.kind === "alias") {
      expect(tagsType.def.target.kind).toBe("generic");
      if (tagsType.def.target.kind === "generic") {
        expect(tagsType.def.target.name).toBe("List");
        expect(tagsType.def.target.typeArgs).toHaveLength(1);
        expect(tagsType.def.target.typeArgs[0].kind).toBe("simple");
      }
    }

    // Optional<User>
    const maybeUserType = program.types[1];
    expect(maybeUserType.def.kind).toBe("alias");
    if (maybeUserType.def.kind === "alias") {
      expect(maybeUserType.def.target.kind).toBe("generic");
      if (maybeUserType.def.target.kind === "generic") {
        expect(maybeUserType.def.target.name).toBe("Optional");
      }
    }

    // Map<String, User>
    const userMapType = program.types[2];
    expect(userMapType.def.kind).toBe("alias");
    if (userMapType.def.kind === "alias") {
      expect(userMapType.def.target.kind).toBe("generic");
      if (userMapType.def.target.kind === "generic") {
        expect(userMapType.def.target.name).toBe("Map");
        expect(userMapType.def.target.typeArgs).toHaveLength(2);
      }
    }

    // Result<User, String>
    const userResultType = program.types[3];
    expect(userResultType.def.kind).toBe("alias");
    if (userResultType.def.kind === "alias") {
      expect(userResultType.def.target.kind).toBe("generic");
      if (userResultType.def.target.kind === "generic") {
        expect(userResultType.def.target.name).toBe("Result");
        expect(userResultType.def.target.typeArgs).toHaveLength(2);
      }
    }

    // User record with generic fields and shorthand
    const userType = program.types[4];
    expect(userType.def.kind).toBe("record");
    if (userType.def.kind === "record") {
      expect(userType.def.fields).toHaveLength(4);

      // tags: List<String>
      const tagsField = userType.def.fields[1];
      expect(tagsField.type.kind).toBe("generic");
      if (tagsField.type.kind === "generic") {
        expect(tagsField.type.name).toBe("List");
      }

      // bio: String? (optional shorthand)
      const bioField = userType.def.fields[2];
      expect(bioField.type.kind).toBe("optional");
      if (bioField.type.kind === "optional") {
        expect(bioField.type.inner.kind).toBe("simple");
      }

      // scores: Int[] (array shorthand)
      const scoresField = userType.def.fields[3];
      expect(scoresField.type.kind).toBe("array");
      if (scoresField.type.kind === "array") {
        expect(scoresField.type.element.kind).toBe("simple");
      }
    }
  });
});

describe("compileToIR", () => {
  it("compiles the sample.tdm AST to a TandemIR object", () => {
    const { program } = parseTandem(source);
    const { ir, diagnostics } = compileToIR(program);

    expect(diagnostics).toEqual([]);
    expect(ir).toBeDefined();

    // Assert Types
    expect(ir.types.size).toBe(2);
    expect(ir.types.has("sample.project.UserId")).toBe(true);
    expect(ir.types.has("sample.project.User")).toBe(true);

    const userIdType = ir.types.get("sample.project.UserId");
    expect(userIdType?.kind).toBe("alias");
    if (userIdType?.kind === "alias") {
      expect(userIdType.target.kind).toBe("simple");
      if (userIdType.target.kind === "simple") {
        expect(userIdType.target.fqn).toBe("UUID");
      }
    }

    const userType = ir.types.get("sample.project.User");
    expect(userType?.kind).toBe("record");
    if (userType?.kind === "record") {
      expect(userType.fields).toHaveLength(2);
      expect(userType.fields[0].name).toBe("id");
      expect(userType.fields[0].type.kind).toBe("simple");
      if (userType.fields[0].type.kind === "simple") {
        expect(userType.fields[0].type.fqn).toBe("sample.project.UserId");
      }
      expect(userType.fields[1].name).toBe("name");
      expect(userType.fields[1].type.kind).toBe("simple");
      if (userType.fields[1].type.kind === "simple") {
        expect(userType.fields[1].type.fqn).toBe("String");
      }
    }

    // Assert Intents
    expect(ir.intents.size).toBe(1);
    expect(ir.intents.has("sample.project.GetUser")).toBe(true);

    const getUserIntent = ir.intents.get("sample.project.GetUser");
    expect(getUserIntent?.kind).toBe("route");
    expect(getUserIntent?.spec).toBe("Returns a user by ID.");

    // Assert Intent Input
    expect(getUserIntent?.inputType.fields).toHaveLength(1);
    expect(getUserIntent?.inputType.fields[0].name).toBe("id");
    expect(getUserIntent?.inputType.fields[0].type.kind).toBe("simple");

    // Assert Intent Output
    expect(getUserIntent?.outputType.kind).toBe("simple");
    if (getUserIntent?.outputType.kind === "simple") {
      expect(getUserIntent.outputType.fqn).toBe("sample.project.User");
    }
  });

  it("compiles generic types to IR correctly", () => {
    const genericSource = `
module test.generics

type Tags = List<String>
type UserResult = Result<String, String>

type User {
  tags: List<String>
  bio: String?
  scores: Int[]
}
`;

    const { program } = parseTandem(genericSource);
    const { ir, diagnostics } = compileToIR(program);

    expect(diagnostics).toEqual([]);

    // List<String> alias
    const tagsType = ir.types.get("test.generics.Tags");
    expect(tagsType?.kind).toBe("alias");
    if (tagsType?.kind === "alias") {
      expect(tagsType.target.kind).toBe("generic");
      if (tagsType.target.kind === "generic") {
        expect(tagsType.target.name).toBe("List");
        expect(tagsType.target.typeArgs).toHaveLength(1);
        expect(tagsType.target.typeArgs[0].kind).toBe("simple");
        if (tagsType.target.typeArgs[0].kind === "simple") {
          expect(tagsType.target.typeArgs[0].fqn).toBe("String");
        }
      }
    }

    // User record with generic fields
    const userType = ir.types.get("test.generics.User");
    expect(userType?.kind).toBe("record");
    if (userType?.kind === "record") {
      // tags: List<String>
      expect(userType.fields[0].type.kind).toBe("generic");
      if (userType.fields[0].type.kind === "generic") {
        expect(userType.fields[0].type.name).toBe("List");
      }

      // bio: String? -> Optional<String>
      expect(userType.fields[1].type.kind).toBe("generic");
      if (userType.fields[1].type.kind === "generic") {
        expect(userType.fields[1].type.name).toBe("Optional");
      }

      // scores: Int[] -> List<Int>
      expect(userType.fields[2].type.kind).toBe("generic");
      if (userType.fields[2].type.kind === "generic") {
        expect(userType.fields[2].type.name).toBe("List");
        if (userType.fields[2].type.typeArgs[0].kind === "simple") {
          expect(userType.fields[2].type.typeArgs[0].fqn).toBe("Int");
        }
      }
    }
  });

  it("reports errors for invalid generic type usage", () => {
    const invalidSource = `
module test.invalid

type BadList = List
type WrongArgs = Map<String>
`;

    const { program } = parseTandem(invalidSource);
    const { diagnostics } = compileToIR(program);

    // Should have diagnostics for missing type args and wrong arg count
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some((d) => d.message.includes("List"))).toBe(true);
    expect(diagnostics.some((d) => d.message.includes("Map"))).toBe(true);
  });
});

describe("Module Annotations", () => {
  it("parses module without annotations", () => {
    const source = `
module api.users

type UserId = UUID
`;
    const { program, diagnostics } = parseTandem(source);

    expect(diagnostics).toEqual([]);
    expect(program.modules).toHaveLength(1);
    expect(program.modules[0].name).toBe("api.users");
    expect(program.modules[0].annotations).toEqual([]);
  });

  it("parses single annotation without value", () => {
    const source = `
@backend
module api.users

type UserId = UUID
`;
    const { program, diagnostics } = parseTandem(source);

    expect(diagnostics).toEqual([]);
    expect(program.modules).toHaveLength(1);
    expect(program.modules[0].annotations).toHaveLength(1);
    expect(program.modules[0].annotations[0].name).toBe("backend");
    expect(program.modules[0].annotations[0].value).toBeUndefined();
  });

  it("parses single annotation with identifier value", () => {
    const source = `
@backend(express)
module api.users

type UserId = UUID
`;
    const { program, diagnostics } = parseTandem(source);

    expect(diagnostics).toEqual([]);
    expect(program.modules[0].annotations).toHaveLength(1);
    expect(program.modules[0].annotations[0].name).toBe("backend");
    expect(program.modules[0].annotations[0].value).toBe("express");
  });

  it("parses single annotation with string value", () => {
    const source = `
@version("1.0.0")
module api.users

type UserId = UUID
`;
    const { program, diagnostics } = parseTandem(source);

    expect(diagnostics).toEqual([]);
    expect(program.modules[0].annotations).toHaveLength(1);
    expect(program.modules[0].annotations[0].name).toBe("version");
    expect(program.modules[0].annotations[0].value).toBe("1.0.0");
  });

  it("parses multiple annotations", () => {
    const source = `
@backend(express)
@frontend(react)
@version("2.0")
module api.users

type UserId = UUID
`;
    const { program, diagnostics } = parseTandem(source);

    expect(diagnostics).toEqual([]);
    expect(program.modules[0].annotations).toHaveLength(3);

    expect(program.modules[0].annotations[0].name).toBe("backend");
    expect(program.modules[0].annotations[0].value).toBe("express");

    expect(program.modules[0].annotations[1].name).toBe("frontend");
    expect(program.modules[0].annotations[1].value).toBe("react");

    expect(program.modules[0].annotations[2].name).toBe("version");
    expect(program.modules[0].annotations[2].value).toBe("2.0");
  });

  it("preserves annotations in IR", () => {
    const source = `
@backend(express)
@frontend(react)
module api.users

type UserId = UUID
`;
    const { program } = parseTandem(source);
    const { ir, diagnostics } = compileToIR(program);

    expect(diagnostics).toEqual([]);
    expect(ir.modules.size).toBe(1);

    const module = ir.modules.get("api.users");
    expect(module).toBeDefined();
    expect(module?.name).toBe("api.users");
    expect(module?.annotations).toHaveLength(2);

    expect(module?.annotations[0].name).toBe("backend");
    expect(module?.annotations[0].value).toBe("express");

    expect(module?.annotations[1].name).toBe("frontend");
    expect(module?.annotations[1].value).toBe("react");
  });
});
