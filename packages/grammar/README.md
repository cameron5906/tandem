# @tandem-lang/grammar

Lezer grammar and parser for Tandem source files.

## Purpose

Provides lexical and syntactic parsing for `.tandem` files using the Lezer parser generator. Converts source text into a concrete syntax tree (CST) that can be walked to build an AST.

## Installation

```bash
pnpm add @tandem-lang/grammar
```

## Usage

```typescript
import { parser } from "@tandem-lang/grammar";

const source = `
module api.users

type UserId = UUID

type User {
  id: UserId
  name: String
}
`;

const tree = parser.parse(source);
const cursor = tree.cursor();

// Walk the CST...
while (cursor.next()) {
  console.log(cursor.name, cursor.from, cursor.to);
}
```

## Supported Syntax

### Modules
```tandem
module domain.user
```

### Type Aliases
```tandem
type UserId = UUID
type Tags = List<String>
```

### Record Types
```tandem
type User {
  id: UUID
  name: String
  email: Email
}
```

### Generic Types
```tandem
List<T>        // Ordered collection
Optional<T>    // Nullable type
Map<K, V>      // Key-value mapping
Result<T, E>   // Success/error result
```

### Shorthand Syntax
```tandem
String?        // Optional<String>
Int[]          // List<Int>
```

### Module Annotations
```tandem
@backend(express)
@frontend(react)
module api.users
```

### Intent Routes
```tandem
intent route GetUser {
  input: { id: UUID }
  output: User
  spec: "Fetch user by ID"
}
```

## What This Package Does NOT Do

- Build AST nodes (that's `@tandem-lang/compiler`)
- Validate semantics or type references
- Emit diagnostics or error messages
- Generate code

## Dependencies

- `@lezer/common` - Lezer common utilities
- `@lezer/lr` - LR parser runtime
