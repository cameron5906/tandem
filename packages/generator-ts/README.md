# @tandem-lang/generator-ts

TypeScript code generation from Tandem IR.

## Purpose

Generates TypeScript type definitions from Tandem IR. Maps Tandem's type system to TypeScript equivalents and emits interfaces and type aliases. Built with a modular architecture using strategy patterns for type mapping and code emission.

## Installation

```bash
pnpm add @tandem-lang/generator-ts
```

## Usage

```typescript
import { generateTypeScript } from "@tandem-lang/generator-ts";
import { parseTandem, compileToIR } from "@tandem-lang/compiler";

const source = `
module api.users

type UserId = UUID

type User {
  id: UserId
  name: String
  email: Email?
  tags: List<String>
  metadata: Map<String, JSON>
}
`;

const { program } = parseTandem(source);
const { ir } = compileToIR(program);
const tsCode = generateTypeScript(ir);

console.log(tsCode);
```

### Output

```typescript
export type UserId = string;

export interface User {
  id: UserId;
  name: string;
  email: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
}
```

## Type Mappings

| Tandem Type | TypeScript Type |
|-------------|-----------------|
| `String` | `string` |
| `Int` | `number` |
| `Float` | `number` |
| `Bool` | `boolean` |
| `UUID` | `string` |
| `DateTime` | `Date` |
| `Date` | `string` |
| `Time` | `string` |
| `Duration` | `string` |
| `Decimal` | `string` |
| `URL` | `string` |
| `Email` | `string` |
| `JSON` | `unknown` |
| `Optional<T>` | `T \| null` |
| `List<T>` | `T[]` |
| `Map<K, V>` | `Record<K, V>` |
| `Result<T, E>` | `{ ok: true; value: T } \| { ok: false; error: E }` |

### Shorthand Mappings

| Tandem Shorthand | Expands To | TypeScript |
|------------------|------------|------------|
| `String?` | `Optional<String>` | `string \| null` |
| `Int[]` | `List<Int>` | `number[]` |

## API Reference

### Main Entry Point

```typescript
import { generateTypeScript } from "@tandem-lang/generator-ts";

const tsCode = generateTypeScript(ir);
```

### Type Mapper

```typescript
import { TypeScriptTypeMapper } from "@tandem-lang/generator-ts";
import { simpleType, genericType } from "@tandem-lang/compiler";

const mapper = new TypeScriptTypeMapper();

mapper.mapType(simpleType("String"));           // "string"
mapper.mapType(simpleType("UUID"));             // "string"
mapper.mapType(simpleType("DateTime"));         // "Date"

mapper.mapType(genericType("List", [simpleType("String")]));  // "string[]"
mapper.mapType(genericType("Optional", [simpleType("Int")])); // "number | null"
mapper.mapType(genericType("Map", [simpleType("String"), simpleType("Int")]));
// "Record<string, number>"
```

### Code Emitter

```typescript
import { TypeDeclarationEmitter, TypeScriptTypeMapper } from "@tandem-lang/generator-ts";

const mapper = new TypeScriptTypeMapper();
const emitter = new TypeDeclarationEmitter(mapper);

const files = emitter.emit(ir);
// Returns: [{ filename: "types.ts", content: "..." }]
```

### Utilities

```typescript
import { shorten } from "@tandem-lang/generator-ts";

shorten("sample.project.User");  // "User"
shorten("domain.user.UserId");   // "UserId"
shorten("String");               // "String"
```

## Architecture

```
IR (TandemIR)
    │
    ▼
┌─────────────────────┐
│ TypeScriptTypeMapper │  ← Maps IRTypeRef → TS string
└─────────────────────┘
    │
    ▼
┌──────────────────────┐
│ TypeDeclarationEmitter│  ← Emits type declarations
└──────────────────────┘
    │
    ▼
GeneratedCode[]
```

### Interfaces

| Interface | Description |
|-----------|-------------|
| `ITypeMapper` | Strategy for mapping IR types to target language |
| `ICodeEmitter` | Strategy for emitting code from IR |
| `GeneratedCode` | Output file with filename and content |

## What This Package Does NOT Do

- Generate route handlers or backend code (future: Express generator)
- Generate React hooks or frontend code (future: React generator)
- Write files to disk (returns strings)
- Handle intents (types only, intent generation coming)

## Dependencies

- `@tandem-lang/compiler` - For IR types
