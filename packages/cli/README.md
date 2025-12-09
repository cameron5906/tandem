# @tandem-lang/cli

Command-line interface for Tandem.

## Purpose

Developer-facing CLI for parsing, compiling, and generating code from Tandem source files. Provides commands for inspecting the AST, IR, and generating TypeScript output.

## Installation

```bash
# Install globally
pnpm add -g @tandem-lang/cli

# Or run via pnpm in the monorepo
pnpm tandem <command>
```

## Commands

### parse

Parse a Tandem file and output the AST as JSON.

```bash
tandem parse <file>
```

**Example:**
```bash
tandem parse api.tandem
```

**Output:** JSON representation of `ProgramNode` with modules, types, and intents.

### ir

Compile a Tandem file to IR and output as JSON.

```bash
tandem ir <file>
```

**Example:**
```bash
tandem ir api.tandem
```

**Output:** JSON with:
- `program` - The parsed AST
- `ir` - The compiled IR (modules, types, intents maps)
- `diagnostics` - Any compilation errors or warnings

### generate

Generate TypeScript code from a Tandem file.

```bash
tandem generate <file>
```

**Example:**
```bash
tandem generate api.tandem
```

**Output:** TypeScript type declarations printed to stdout.

## Examples

### Create a Tandem file

```tandem
// api.tandem
@backend(express)
module api.users

type UserId = UUID

type User {
  id: UserId
  name: String
  email: Email
  tags: List<String>
}

intent route GetUser {
  input: { id: UserId }
  output: User
  spec: "Fetch user by ID"
}
```

### Parse and inspect

```bash
# View the AST structure
tandem parse api.tandem | jq '.modules'

# View type declarations
tandem parse api.tandem | jq '.types'
```

### Compile and inspect IR

```bash
# View compiled types with fully-qualified names
tandem ir api.tandem | jq '.ir.types'

# View module annotations
tandem ir api.tandem | jq '.ir.modules'

# Check for compilation errors
tandem ir api.tandem | jq '.diagnostics'
```

### Generate TypeScript

```bash
# Print to console
tandem generate api.tandem

# Save to file
tandem generate api.tandem > types.ts

# Preview output
tandem generate api.tandem | head -20
```

### Sample Output

```typescript
export type UserId = string;

export interface User {
  id: UserId;
  name: string;
  email: string;
  tags: string[];
}
```

## What This Package Does NOT Do

- Write to files directly (outputs to stdout, use shell redirection)
- Process multiple files in one command
- Support configuration files (yet)
- Provide interactive/watch mode
- Generate backend routes or frontend hooks (types only)

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (parse failure, file not found, etc.) |

## Dependencies

- `@tandem-lang/compiler` - Parsing and compilation
- `@tandem-lang/generator-ts` - TypeScript generation
- `commander` - CLI framework
