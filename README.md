# Tandem

A domain-specific language (DSL) for generating type-safe applications.

Define **modules**, **types**, and **intents** in Tandem, and generate real, type-safe backend + frontend code. The long-term vision: generative AI as a compiler phase, not just autocomplete.

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Generate TypeScript from a Tandem file
pnpm tandem generate samples/sample.tdm
```

## Language Features

### Modules with Annotations

```tandem
@backend(express)
@frontend(react)
module api.users
```

Annotations configure code generation targets per module.

### Type Aliases

```tandem
type UserId = UUID
type Tags = List<String>
type MaybeEmail = Optional<Email>
```

### Record Types

```tandem
type User {
  id: UserId
  name: String
  email: Email
  createdAt: DateTime
}
```

### Generic Types

| Type | Description | Example |
|------|-------------|---------|
| `Optional<T>` | Nullable | `Optional<String>` or `String?` |
| `List<T>` | Array | `List<Int>` or `Int[]` |
| `Map<K, V>` | Key-value | `Map<String, User>` |
| `Result<T, E>` | Success/error | `Result<User, String>` |

### Built-in Primitives

`String`, `Int`, `Float`, `Bool`, `UUID`, `DateTime`, `Date`, `Time`, `Duration`, `Decimal`, `URL`, `Email`, `JSON`

### Intent Routes

```tandem
intent route GetUser {
  input: { id: UserId }
  output: User
  spec: "Fetch user by ID. Returns 404 if not found."
}
```

Intents define API contracts that generate typed handlers and client code.

## Example

```tandem
@backend(express)
@frontend(react)
module api.users

type UserId = UUID

type User {
  id: UserId
  name: String
  email: Email
  tags: List<String>
  bio: String?
}

intent route GetUser {
  input: { id: UserId }
  output: User
  spec: "Fetch user by ID"
}

intent route UpdateUser {
  input: { id: UserId, name: String?, tags: List<String> }
  output: User
  spec: "Update user fields"
}
```

**Generated TypeScript:**

```typescript
export type UserId = string;

export interface User {
  id: UserId;
  name: string;
  email: string;
  tags: string[];
  bio: string | null;
}
```

## Repository Structure

```
tandem/
  packages/
    grammar/        # Lezer parser for Tandem syntax
    compiler/       # AST + IR pipeline with type resolution
    generator-core/ # Plugin interfaces and registry
    generator-ts/   # TypeScript code generation
    cli/            # Command-line interface
  samples/          # Example .tdm files
```

### Package Dependencies

```
grammar → compiler → generator-core
                  ↘ generator-ts → cli
```

## CLI Commands

```bash
# Parse file to AST (JSON output)
pnpm tandem parse <file>

# Compile to IR (JSON output)
pnpm tandem ir <file>

# Generate TypeScript
pnpm tandem generate <file>
```

## Architecture

```
Source (.tdm)
    │
    ▼
┌─────────┐
│ Grammar │  Lezer parser → Concrete Syntax Tree
└─────────┘
    │
    ▼
┌──────────┐
│ Compiler │  CST → AST → IR (with type resolution)
└──────────┘
    │
    ▼
┌───────────────┐
│ Generator-TS  │  IR → TypeScript code
└───────────────┘
    │
    ▼
Output (.ts)
```

### Key Concepts

| Layer | Responsibility |
|-------|----------------|
| **Grammar** | Syntax only - tokenization and parsing |
| **Compiler** | Semantics - AST construction, type resolution, IR generation |
| **Generator** | Output - target-specific code emission |

### Intermediate Representation (IR)

The IR uses fully-qualified names and resolved type references:

```typescript
interface TandemIR {
  modules: Map<string, IRModule>;   // Modules with annotations
  types: Map<string, IRType>;       // FQN → type definition
  intents: Map<string, IRIntent>;   // FQN → intent declaration
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Build grammar only
cd packages/grammar && pnpm build
```

## Roadmap

### Current (v0.1)
- [x] Lezer grammar with full syntax support
- [x] AST construction from parse trees
- [x] IR with type resolution
- [x] Generic types: Optional, List, Map, Result
- [x] Module annotations
- [x] TypeScript type generation
- [x] Generator plugin architecture

### Next
- [ ] Express route generation from intents
- [ ] React hooks generation
- [ ] Multi-file/multi-module support
- [ ] CLI file output (not just stdout)

### Future
- [ ] AI-powered implementation generation
- [ ] Validation and constraints
- [ ] Additional language targets (Python, Go)

## Design Principles

1. **Separation of concerns** - Grammar handles syntax, compiler handles semantics, generators handle output
2. **Types first** - Explicit interfaces before implementation
3. **Incremental complexity** - Start minimal, extend when needed
4. **Good error messages** - Track source positions, emit helpful diagnostics
5. **Future-proofing for AI** - Specs and constraints as first-class data

## Contributing

See individual package READMEs for detailed API documentation:

- [grammar](packages/grammar/README.md) - Parser and syntax
- [compiler](packages/compiler/README.md) - AST and IR
- [generator-core](packages/generator-core/README.md) - Plugin architecture
- [generator-ts](packages/generator-ts/README.md) - TypeScript generation
- [cli](packages/cli/README.md) - Command-line interface

## License

MIT
