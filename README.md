# Tandem

Tandem is an experiment in building a **domain-specific language (DSL)** for describing applications at a higher level than today’s frameworks allow.

The long-term vision: you define **schemas, intents, and components** in Tandem, and a toolchain generates a real, type-safe backend + frontend stack. Generative AI is used as a *compiler phase*, not a fancy autocomplete.

This repository contains the **early infrastructure** for that language:

* A **Lezer grammar** to parse Tandem source files.
* A **compiler front-end** that will turn parse trees into a typed AST and IR.
* A **CLI** that drives parsing and (later) compilation and codegen.

Right now, this repo is about **foundations and scaffolding**, not a full language implementation.

---

## High-level concept

Tandem is a declarative language where you define:

* **Modules** – namespaces, e.g. `domain.user`, `api.users`.
* **Types** – records and aliases, e.g. `type User { ... }`.
* **Intents** – units of behavior, e.g. `intent route getUserById { ... }`.

Example (target v0 syntax):

```tandem
module domain.user

type UserId = UUID

type User {
  id: UserId
  email: String
  created_at: Instant
}

module api.users

intent route getUserById {
  input: { id: UUID }
  output: User
  spec: "Fetch user by ID. If not found, return an error."
}
```

Eventually, from this kind of source we want to generate:

* Backend route handlers + glue (Express/Fastify/.NET, etc.)
* Shared type definitions and validators
* Frontend client SDKs and hooks
* UI components driven by higher-level specs

Right now, the mission is **just to parse and model this language cleanly.**

---

## Repository structure

This repo is a small monorepo with three core packages:

```text
tandem/
  package.json
  pnpm-workspace.yaml (or yarn workspaces)
  tsconfig.base.json
  /packages
    /grammar   # Lezer grammar + generated parser
    /compiler  # AST, IR, compiler front-end
    /cli       # `tandem` command-line tool
```

### `packages/grammar`

Responsible for:

* The Lezer `.grammar` file describing Tandem’s syntax.
* Generating a `parser` that can ingest `.tandem` source.
* Exporting that parser for other packages.

Contains:

* `src/tandem.grammar` – the Lezer grammar definition.
* `src/tandem.parser.ts` – generated parser (build artifact).
* `src/index.ts` – exports `parser`.

The grammar currently targets a **minimal v0** of the language:

* `module` declarations
* `type` declarations (aliases + record types)
* `intent route` declarations with `input`, `output`, `spec` properties

### `packages/compiler`

Responsible for:

* Wrapping the Lezer parser.
* Building a strongly typed AST from the parse tree.
* Defining an initial IR (Intermediate Representation) for later codegen.
* Exposing `parseTandem` and `compileToIR` functions used by the CLI.

Key files:

* `ast.ts`
  TypeScript interfaces for:

  * `ProgramNode`
  * `ModuleNode`
  * `TypeDeclNode`, `TypeDefNode`, `FieldNode`
  * `TypeRefNode`
  * `IntentDeclNode`
  * `ObjectTypeNode`
  * `Span` (source positions)

* `parseTandem.ts`
  Will use the Lezer `parser` to produce a `ProgramNode` and a list of diagnostics. Right now, this is **scaffolded** – the structure exists, but the full AST construction is not implemented.

* `ir.ts`
  Defines the early IR types used by later codegen:

  * `IRType` (alias vs record)
  * `IRIntent` (for `intent route`)
  * `TandemIR` (maps of types and intents)

* `compileToIR.ts`
  Will lower `ProgramNode` → `TandemIR` with diagnostics and basic validation. Currently **stubbed** with TODOs.

The idea is to keep responsibilities clean:

* **Lezer** handles concrete syntax → parse tree.
* **AST layer** handles structure + positions, suitable for errors.
* **IR layer** handles semantic information, suitable for code generators.

### `packages/cli`

Responsible for:

* Providing a `tandem` CLI entrypoint.
* Basic commands to inspect parsing and IR.
* Acting as the main developer interface during early development.

Planned commands:

* `tandem parse <file>` – parse a `.tandem` file and print the `ProgramNode` + diagnostics.
* `tandem ir <file>` – parse, then lower to IR, and print the IR + diagnostics as JSON.

The CLI currently wires up the function signatures and I/O, while the core logic in the compiler remains to be implemented.

---

## Current state vs. future state

### What’s in place now (scaffolding phase)

* Monorepo structure with workspaces.
* TypeScript project configs.
* Package boundaries (`grammar`, `compiler`, `cli`).
* Lezer grammar file stub + generation script.
* AST and IR TypeScript types.
* CLI commands with correct signatures and basic wiring.

A lot of the functions are **intentionally stubbed**:

*   `parseTandem` now actively walks the Lezer tree and builds a `ProgramNode` and its children (modules, types, intents, fields). It includes basic diagnostic reporting.
*   `compileToIR` now processes the `ProgramNode` to build the `TandemIR`. It includes logic for registering types and intents, compiling type definitions (aliases and records), and resolving type references within the current module. Basic diagnostics for duplicate declarations and unresolved types are also included.

This is on purpose: the priority is having a clear skeleton that new contributors can understand and extend.

### Where this is going (roadmap hint)

After this scaffolding phase, work will focus on:

1. **Further AST construction**
   * While initial AST construction is in place, continue to use Lezer’s `TreeCursor` to walk the parse tree and refine the `ProgramNode` and children.
   * Ensure robust handling of `ERROR` nodes and emit useful diagnostics.

2. **Refining IR lowering**

   * While initial IR lowering is functional, focus on resolving fully qualified names for types and intents across multiple modules.
   * Improve validation of references (e.g. output types must exist).
   * Continue to build `TandemIR` from `ProgramNode`.

3. **Deterministic codegen**

   * Generate TypeScript types and Express/Fastify route stubs from IR.
   * No AI yet – just deterministic code generation.

4. **AI integration (later)**

   * Add higher-level constructs (`spec`, examples, constraints).
   * Introduce a generation phase that asks a model to fill handler bodies and UI implementations, with tests and constraints.

---

## Getting started as a contributor

### Prerequisites

* Node.js (LTS)
* pnpm or yarn (depending on what the repo uses)
* Basic familiarity with:

  * TypeScript
  * Lezer / parser generators (helpful but not required)

### Install & build

From the repo root:

```bash
# install dependencies
pnpm install
# or: yarn install

# build all packages
pnpm run build
# or: yarn build
```

### Running the CLI (early stage)

Create a simple `example.tandem` file:

```tandem
module domain.user

type UserId = UUID

type User {
  id: UserId
  email: String
  created_at: Instant
}

module api.users

intent route getUserById {
  input: { id: UUID }
  output: User
  spec: "Fetch user by ID."
}
```

Then run:

```bash
# parse
pnpm tandem parse example.tandem

# ir
pnpm tandem ir example.tandem
```

Right now, the output will mostly show stub diagnostics and empty structures. That’s expected until AST/IR implementations are filled in.

---

## Design principles

A few principles that should guide changes:

1. **Separation of concerns**

   * Grammar/parse table lives in `grammar`.
   * AST/IR and semantics live in `compiler`.
   * UX and process live in `cli`.

2. **Types first**

   * Make interfaces and data shapes explicit.
   * Add function signatures before filling them in.
   * Don’t bury structure inside untyped blobs.

3. **Incremental complexity**

   * Start with minimal syntax and semantics.
   * Extend the grammar and IR only when needed.
   * Keep features orthogonal and modular.

4. **Good error messages**

   * Track `Span` data everywhere.
   * Design diagnostics with users in mind: “what went wrong, where, and how to fix it.”

5. **Future-proofing for AI**

   * Treat specs, examples, and constraints as **first-class data** that the compiler can see.
   * Keep the IR clean enough that a separate “AI generation” phase can work with it safely.