# @tandem-lang/generator-core

Plugin architecture and registry for Tandem code generators.

## Purpose

Defines the interfaces and registry system that allow framework-specific generators to plug into the Tandem toolchain. This is a language-agnostic foundation for building TypeScript, Python, Go, or other target generators.

## Installation

```bash
pnpm add @tandem-lang/generator-core
```

## Usage

### Implementing a Generator

```typescript
import {
  IFrameworkGenerator,
  GeneratorContext,
  GeneratorOutput,
  FrameworkGeneratorMeta,
} from "@tandem-lang/generator-core";

export class MyFrameworkGenerator implements IFrameworkGenerator {
  readonly meta: FrameworkGeneratorMeta = {
    id: "typescript:myframework",
    language: "typescript",
    framework: "myframework",
    target: "backend",
    description: "Generate MyFramework backend code",
  };

  generate(context: GeneratorContext): GeneratorOutput {
    const files = [];

    // Generate code from IR
    for (const [fqn, type] of context.ir.types) {
      files.push({
        path: `types/${fqn}.ts`,
        content: `// Generated type: ${fqn}\n`,
      });
    }

    return {
      files,
      dependencies: {
        myframework: "^1.0.0",
      },
      devDependencies: {
        "@types/myframework": "^1.0.0",
      },
    };
  }

  validate(context: GeneratorContext): string[] {
    const errors = [];
    if (context.targetModules.length === 0) {
      errors.push("No modules to generate");
    }
    return errors;
  }
}
```

### Registering a Generator

```typescript
import { generatorRegistry } from "@tandem-lang/generator-core";
import { MyFrameworkGenerator } from "./MyFrameworkGenerator";

// Register the generator
generatorRegistry.register(new MyFrameworkGenerator());
```

### Finding Generators

```typescript
import { generatorRegistry } from "@tandem-lang/generator-core";

// Get by ID
const gen = generatorRegistry.get("typescript:express");

// Find by annotation (e.g., @backend(express))
const backendGen = generatorRegistry.findByAnnotation("backend", "express");

// Find by annotation with explicit language
const tsGen = generatorRegistry.findByAnnotation("backend", "express", "typescript");

// Find all backend generators
const allBackend = generatorRegistry.findAll({ target: "backend" });

// Find all TypeScript generators
const allTS = generatorRegistry.findAll({ language: "typescript" });

// List all registered generators
const allMeta = generatorRegistry.list();
for (const meta of allMeta) {
  console.log(`${meta.id}: ${meta.description}`);
}
```

## API Reference

### Interfaces

| Interface | Description |
|-----------|-------------|
| `IFrameworkGenerator` | Main generator contract with `meta` and `generate()` |
| `FrameworkGeneratorMeta` | Metadata: id, language, framework, target, description |
| `GeneratorContext` | Context passed to generators: ir, config, targetModules |
| `GeneratorConfig` | Configuration: outputDir, overwrite, options |
| `GeneratorOutput` | Output: files array, dependencies, devDependencies |
| `GeneratedFile` | Single file: path, content, overwrite flag |

### GeneratorRegistry Methods

| Method | Description |
|--------|-------------|
| `register(generator)` | Register a generator (throws if duplicate ID) |
| `unregister(id)` | Remove a generator by ID |
| `get(id)` | Get generator by ID |
| `has(id)` | Check if generator exists |
| `findByAnnotation(target, framework, language?)` | Find by annotation |
| `findAll(filter?)` | Filter by language/target/framework |
| `list()` | Get metadata for all generators |
| `clear()` | Remove all generators (for testing) |
| `size` | Number of registered generators |

### Global Registry

```typescript
import { generatorRegistry } from "@tandem-lang/generator-core";

// Singleton instance for registration
generatorRegistry.register(myGenerator);
```

## What This Package Does NOT Do

- Implement any actual code generation (generators do that)
- Write files to disk (returns structured output)
- Define language-specific type mappings
- Handle CLI commands

## Dependencies

- `@tandem-lang/compiler` - For IR types
