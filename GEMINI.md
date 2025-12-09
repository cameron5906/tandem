# Gemini Project Context: Tandem Language Monorepo

## Project Overview

This is a monorepo for the **Tandem** language, a new language focused on generating real apps from a high-level DSL. The project is set up as a TypeScript-based pnpm workspace.

The monorepo is structured into three main packages:

1.  `@tandem-lang/grammar`: Contains the Lezer grammar definition for the Tandem language and the necessary scripts to generate the parser.
2.  `@tandem-lang/compiler`: Consumes the parser from the grammar package. It is responsible for converting the source code into an Abstract Syntax Tree (AST) and then into an Intermediate Representation (IR). This package exports several stub functions for parsing and compilation.
3.  `@tandem-lang/cli`: A command-line interface for the Tandem language, built with `commander`. It provides commands to `parse` a `.tandem` file and compile it to `ir`.

The project uses `vitest` for unit testing, `eslint` for linting, and `prettier` for code formatting.

## Building and Running

### Installation

To install all dependencies and link the workspace packages, run:

```bash
pnpm install
```

### Building

To build all packages in the monorepo, run:

```bash
pnpm build
```

This will trigger the `build` script in each package's `package.json`. For the `@tandem-lang/grammar` package, this includes generating the parser from the grammar file.

### Testing

To run the tests for all packages, use:

```bash
pnpm test
```

This command first builds the entire project and then runs the `vitest` test runner.

### Linting and Formatting

To check the code for linting errors:

```bash
pnpm lint
```

To automatically format the code:

```bash
pnpm format
```

### Using the CLI

The CLI package provides a `tandem` executable. After building the project, you can use it to parse a `.tandem` file or compile it to the Intermediate Representation (IR).

**Example:**

1. Create a file named `example.tandem`:
   ```tandem
   module domain.user

   type UserId = UUID

   type User {
     id: UserId
     email: String
   }
   ```

2. Run the `parse` command:
   ```bash
   node packages/cli/dist/index.js parse example.tandem
   ```

3. Run the `ir` command:
   ```bash
   node packages/cli/dist/index.js ir example.tandem
   ```
   (Note: The parsing and compilation logic is currently stubbed and will not produce a full AST or IR).

## Development Conventions

*   **Monorepo:** The project is a `pnpm` monorepo. All packages are located in the `packages` directory.
*   **Language:** The entire codebase is written in TypeScript. The base configuration is in `tsconfig.base.json`.
*   **Code Style:** Code formatting is enforced by Prettier, and linting is done with ESLint. Configuration can be found in `.prettierrc` and `.eslintrc.cjs`.
*   **Parsing:** The language parser is generated using Lezer from the `packages/grammar/src/tandem.grammar` file.
*   **Testing:** Unit tests are written with `vitest`. Test files are co-located with the source code in each package and have a `.test.ts` extension.
