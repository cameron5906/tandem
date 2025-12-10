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
@version("2.0")
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
    expect(module?.annotations).toHaveLength(3);

    expect(module?.annotations[0].name).toBe("backend");
    expect(module?.annotations[0].value).toBe("express");

    expect(module?.annotations[1].name).toBe("frontend");
    expect(module?.annotations[1].value).toBe("react");

    expect(module?.annotations[2].name).toBe("version");
    expect(module?.annotations[2].value).toBe("2.0");
  });

  it("reports invalid backend annotation values", () => {
    const source = `
@backend(rails)
module api.users
`;
    const { program } = parseTandem(source);
    const { diagnostics } = compileToIR(program);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(
      diagnostics.some((d) =>
        d.message.includes("Invalid backend annotation value 'rails'")
      )
    ).toBe(true);
  });

  it("reports invalid frontend annotation values", () => {
    const source = `
@frontend(angular)
module app.ui
`;
    const { program } = parseTandem(source);
    const { diagnostics } = compileToIR(program);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(
      diagnostics.some((d) =>
        d.message.includes("Invalid frontend annotation value 'angular'")
      )
    ).toBe(true);
  });
});

describe("Component Declarations", () => {
  describe("Parsing", () => {
    it("parses a simple card component", () => {
      const source = `
@frontend(react)
module app.users

type User {
  id: UUID
  name: String
}

component UserCard {
  element: card
  displays: User
  spec: "Displays user information"
}
`;
      const { program, diagnostics } = parseTandem(source);

      expect(diagnostics).toEqual([]);
      expect(program.components).toHaveLength(1);

      const component = program.components[0];
      expect(component.name).toBe("UserCard");
      expect(component.element).toBe("card");
      expect(component.displays?.kind).toBe("simple");
      if (component.displays?.kind === "simple") {
        expect(component.displays.name).toBe("User");
      }
      expect(component.spec).toBe("Displays user information");
    });

    it("parses a form component with binds", () => {
      const source = `
@frontend(react)
module app.users

intent route CreateUser {
  input: { name: String }
  output: Bool
  spec: "Create user"
}

component CreateUserForm {
  element: form
  binds: CreateUser
  spec: "Form to create a new user"
}
`;
      const { program, diagnostics } = parseTandem(source);

      expect(diagnostics).toEqual([]);
      expect(program.components).toHaveLength(1);

      const component = program.components[0];
      expect(component.name).toBe("CreateUserForm");
      expect(component.element).toBe("form");
      expect(component.binds).toBe("CreateUser");
      expect(component.spec).toBe("Form to create a new user");
    });

    it("parses a list component with itemComponent and emptyState", () => {
      const source = `
@frontend(react)
module app.users

type User {
  id: UUID
  name: String
}

component UserCard {
  element: card
  displays: User
}

component UserList {
  element: list
  displays: List<User>
  itemComponent: UserCard
  emptyState: "No users found"
  spec: "List of all users"
}
`;
      const { program, diagnostics } = parseTandem(source);

      expect(diagnostics).toEqual([]);
      expect(program.components).toHaveLength(2);

      const listComponent = program.components[1];
      expect(listComponent.name).toBe("UserList");
      expect(listComponent.element).toBe("list");
      expect(listComponent.displays?.kind).toBe("generic");
      if (listComponent.displays?.kind === "generic") {
        expect(listComponent.displays.name).toBe("List");
      }
      expect(listComponent.itemComponent).toBe("UserCard");
      expect(listComponent.emptyState).toBe("No users found");
    });

    it("parses a component with actions array", () => {
      const source = `
@frontend(react)
module app.users

type User {
  id: UUID
  name: String
}

intent route EditUser {
  input: { id: UUID }
  output: User
}

intent route DeleteUser {
  input: { id: UUID }
  output: Bool
}

component UserCard {
  element: card
  displays: User
  actions: [EditUser, DeleteUser]
}
`;
      const { program, diagnostics } = parseTandem(source);

      expect(diagnostics).toEqual([]);
      expect(program.components).toHaveLength(1);

      const component = program.components[0];
      expect(component.actions).toEqual(["EditUser", "DeleteUser"]);
    });

    it("parses all component element types", () => {
      const source = `
@frontend(react)
module app.ui

type Data { id: UUID }

component CardComp { element: card displays: Data }
component FormComp { element: form binds: SomeIntent }
component ListComp { element: list displays: List<Data> }
component TableComp { element: table displays: List<Data> }
component ModalComp { element: modal displays: Data }
component ButtonComp { element: button }
component DetailComp { element: detail displays: Data }
component DashboardComp { element: dashboard }

intent route SomeIntent {
  input: { id: UUID }
  output: Bool
}
`;
      const { program, diagnostics } = parseTandem(source);

      expect(diagnostics).toEqual([]);
      expect(program.components).toHaveLength(8);

      const elements = program.components.map((c) => c.element);
      expect(elements).toContain("card");
      expect(elements).toContain("form");
      expect(elements).toContain("list");
      expect(elements).toContain("table");
      expect(elements).toContain("modal");
      expect(elements).toContain("button");
      expect(elements).toContain("detail");
      expect(elements).toContain("dashboard");
    });
  });

  describe("Compilation to IR", () => {
    it("compiles components to IR with fully qualified names", () => {
      const source = `
@frontend(react)
module app.users

type User {
  id: UUID
  name: String
}

intent route GetUser {
  input: { id: UUID }
  output: User
}

component UserCard {
  element: card
  displays: User
  actions: [GetUser]
  spec: "User card component"
}
`;
      const { program } = parseTandem(source);
      const { ir, diagnostics } = compileToIR(program);

      expect(diagnostics).toEqual([]);
      expect(ir.components.size).toBe(1);
      expect(ir.components.has("app.users.UserCard")).toBe(true);

      const component = ir.components.get("app.users.UserCard");
      expect(component?.name).toBe("app.users.UserCard");
      expect(component?.element).toBe("card");
      expect(component?.spec).toBe("User card component");

      // Check resolved displays type
      expect(component?.displays?.kind).toBe("simple");
      if (component?.displays?.kind === "simple") {
        expect(component.displays.fqn).toBe("app.users.User");
      }

      // Check resolved actions
      expect(component?.actions).toEqual(["app.users.GetUser"]);
    });

    it("resolves generic types in displays", () => {
      const source = `
@frontend(react)
module app.users

type User {
  id: UUID
}

component UserList {
  element: list
  displays: List<User>
}
`;
      const { program } = parseTandem(source);
      const { ir, diagnostics } = compileToIR(program);

      expect(diagnostics).toEqual([]);

      const component = ir.components.get("app.users.UserList");
      expect(component?.displays?.kind).toBe("generic");
      if (component?.displays?.kind === "generic") {
        expect(component.displays.name).toBe("List");
        expect(component.displays.typeArgs[0].kind).toBe("simple");
        if (component.displays.typeArgs[0].kind === "simple") {
          expect(component.displays.typeArgs[0].fqn).toBe("app.users.User");
        }
      }
    });

    it("resolves binds to intent FQN", () => {
      const source = `
@frontend(react)
module app.users

intent route CreateUser {
  input: { name: String }
  output: Bool
}

component CreateForm {
  element: form
  binds: CreateUser
}
`;
      const { program } = parseTandem(source);
      const { ir, diagnostics } = compileToIR(program);

      expect(diagnostics).toEqual([]);

      const component = ir.components.get("app.users.CreateForm");
      expect(component?.binds).toBe("app.users.CreateUser");
    });

    it("resolves itemComponent to FQN", () => {
      const source = `
@frontend(react)
module app.users

type User { id: UUID }

component UserCard {
  element: card
  displays: User
}

component UserList {
  element: list
  displays: List<User>
  itemComponent: UserCard
}
`;
      const { program } = parseTandem(source);
      const { ir, diagnostics } = compileToIR(program);

      expect(diagnostics).toEqual([]);

      const listComponent = ir.components.get("app.users.UserList");
      expect(listComponent?.itemComponent).toBe("app.users.UserCard");
    });
  });

  describe("Validation", () => {
    it("rejects components in non-frontend modules", () => {
      const source = `
@backend(express)
module api.users

type User { id: UUID }

component UserCard {
  element: card
  displays: User
}
`;
      const { program } = parseTandem(source);
      const { diagnostics } = compileToIR(program);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(
        diagnostics.some((d) =>
          d.message.includes("can only be declared in @frontend modules")
        )
      ).toBe(true);
    });

    it("rejects components in modules without annotations", () => {
      const source = `
module api.users

type User { id: UUID }

component UserCard {
  element: card
  displays: User
}
`;
      const { program } = parseTandem(source);
      const { diagnostics } = compileToIR(program);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(
        diagnostics.some((d) =>
          d.message.includes("can only be declared in @frontend modules")
        )
      ).toBe(true);
    });

    it("reports error for form component without binds", () => {
      const source = `
@frontend(react)
module app.users

component CreateForm {
  element: form
  spec: "Missing binds property"
}
`;
      const { program } = parseTandem(source);
      const { diagnostics } = compileToIR(program);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(
        diagnostics.some((d) => d.message.includes("must have a 'binds' property"))
      ).toBe(true);
    });

    it("reports error for list component without displays", () => {
      const source = `
@frontend(react)
module app.users

component UserList {
  element: list
  emptyState: "No users"
}
`;
      const { program } = parseTandem(source);
      const { diagnostics } = compileToIR(program);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(
        diagnostics.some((d) => d.message.includes("must have a 'displays' property"))
      ).toBe(true);
    });

    it("reports error for card component without displays", () => {
      const source = `
@frontend(react)
module app.users

component UserCard {
  element: card
  spec: "Missing displays"
}
`;
      const { program } = parseTandem(source);
      const { diagnostics } = compileToIR(program);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(
        diagnostics.some((d) => d.message.includes("must have a 'displays' property"))
      ).toBe(true);
    });

    it("reports error for unresolved intent in binds", () => {
      const source = `
@frontend(react)
module app.users

component CreateForm {
  element: form
  binds: NonExistentIntent
}
`;
      const { program } = parseTandem(source);
      const { diagnostics } = compileToIR(program);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(
        diagnostics.some((d) => d.message.includes("Cannot resolve intent reference"))
      ).toBe(true);
    });

    it("reports error for unresolved intent in actions", () => {
      const source = `
@frontend(react)
module app.users

type User { id: UUID }

component UserCard {
  element: card
  displays: User
  actions: [NonExistentAction]
}
`;
      const { program } = parseTandem(source);
      const { diagnostics } = compileToIR(program);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(
        diagnostics.some((d) => d.message.includes("Cannot resolve intent reference"))
      ).toBe(true);
    });

    it("reports error for duplicate component declarations", () => {
      const source = `
@frontend(react)
module app.users

type User { id: UUID }

component UserCard {
  element: card
  displays: User
}

component UserCard {
  element: detail
  displays: User
}
`;
      const { program } = parseTandem(source);
      const { diagnostics } = compileToIR(program);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(
        diagnostics.some((d) => d.message.includes("Duplicate component declaration"))
      ).toBe(true);
    });
  });
});
