# @tandem-lang/compiler

Compiler front-end: CST → AST → IR pipeline with type resolution.

## Purpose

Transforms Lezer parse trees into a strongly-typed AST, then lowers to an Intermediate Representation (IR) suitable for code generation. Validates type references, resolves fully-qualified names, and emits diagnostics.

## Installation

```bash
pnpm add @tandem-lang/compiler
```

## Usage

```typescript
import { parseTandem, compileToIR } from "@tandem-lang/compiler";

const source = `
@backend(express)
module api.users

type UserId = UUID

type User {
  id: UserId
  name: String
  tags: List<String>
}

intent route GetUser {
  input: { id: UserId }
  output: User
  spec: "Fetch user by ID"
}
`;

// Parse source to AST
const { program, diagnostics: parseErrors } = parseTandem(source);

// Compile AST to IR
const { ir, diagnostics: compileErrors } = compileToIR(program);

// Access the IR
for (const [fqn, type] of ir.types) {
  console.log(`Type: ${fqn}`, type);
}

for (const [fqn, intent] of ir.intents) {
  console.log(`Intent: ${fqn}`, intent);
}

for (const [name, module] of ir.modules) {
  console.log(`Module: ${name}`, module.annotations);
}
```

## API Reference

### Parsing

| Export | Description |
|--------|-------------|
| `parseTandem(source): ParseResult` | Parse source string to AST |
| `ParseResult` | `{ program: ProgramNode, diagnostics: Diagnostic[] }` |

### Compilation

| Export | Description |
|--------|-------------|
| `compileToIR(program): CompileResult` | Lower AST to IR |
| `CompileResult` | `{ ir: TandemIR, diagnostics: Diagnostic[] }` |

### AST Types

| Type | Description |
|------|-------------|
| `ProgramNode` | Root node with modules, types, intents |
| `ModuleNode` | Module declaration with annotations |
| `AnnotationNode` | `@name(value)` annotation |
| `TypeDeclNode` | Type declaration (alias or record) |
| `IntentDeclNode` | Intent route declaration |
| `FieldNode` | Record or input field |
| `TypeRefNode` | Type reference (Simple, Generic, Optional, Array) |

### IR Types

| Type | Description |
|------|-------------|
| `TandemIR` | Root IR with modules, types, intents maps |
| `IRModule` | Module with name and annotations |
| `IRType` | Alias (`{ kind: "alias", target }`) or Record (`{ kind: "record", fields }`) |
| `IRIntent` | Route intent with input/output types and spec |
| `IRTypeRef` | Simple (`{ kind: "simple", fqn }`) or Generic (`{ kind: "generic", name, typeArgs }`) |
| `IRField` | Field with name and type reference |
| `IRAnnotation` | Annotation with name and optional value |

### Built-in Types

**Primitives** (13 types):
- `String`, `Int`, `Float`, `Bool`
- `UUID`, `DateTime`, `Date`, `Time`, `Duration`
- `Decimal`, `URL`, `Email`
- `JSON`

**Generics** (4 types):
- `Optional<T>` - Nullable type
- `List<T>` - Ordered collection
- `Map<K, V>` - Key-value mapping
- `Result<T, E>` - Success/error result

### Helper Functions

```typescript
import {
  isPrimitiveType,
  isGenericType,
  isBuiltinType,
  getExpectedTypeParams,
  simpleType,
  genericType,
  typeRefToString,
  createEmptyIR,
} from "@tandem-lang/compiler";

isPrimitiveType("String");     // true
isGenericType("List");         // true
getExpectedTypeParams("Map");  // 2

const ref = genericType("List", [simpleType("String")]);
typeRefToString(ref);          // "List<String>"
```

## What This Package Does NOT Do

- Generate code (that's generator packages)
- Resolve cross-file references (single-module assumption)
- Process spec content (stored as strings)
- Write files to disk

## Dependencies

- `@tandem-lang/grammar` - Lezer parser
