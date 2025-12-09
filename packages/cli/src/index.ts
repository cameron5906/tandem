#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { parseTandem, compileToIR, TandemIR } from "@tandem-lang/compiler";
import {
  generatorRegistry,
  GeneratorContext,
  GeneratorOutput,
} from "@tandem-lang/generator-core";
import {
  registerAllGenerators,
  generateTypeScript,
  ExpressGenerator,
  ReactGenerator,
  TypesGenerator,
  TypeScriptGeneratorOptions,
} from "@tandem-lang/generator-ts";

// Register all generators on startup
registerAllGenerators();

const program = new Command();

program
  .name("tandem")
  .description("Tandem language CLI")
  .version("0.1.0");

program
  .command("parse")
  .description("Parse a Tandem file and output the AST")
  .argument("<file>", "Tandem source file")
  .action((file) => {
    try {
      const source = readFileSync(file, "utf8");
      const result = parseTandem(source);
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.error(`Error processing file ${file}:`, e);
      process.exit(1);
    }
  });

program
  .command("ir")
  .description("Compile a Tandem file and output the IR")
  .argument("<file>", "Tandem source file")
  .action((file) => {
    try {
      const source = readFileSync(file, "utf8");
      const parseResult = parseTandem(source);
      const compileResult = compileToIR(parseResult.program);
      console.log(JSON.stringify({ ...parseResult, ...compileResult }, null, 2));
    } catch (e) {
      console.error(`Error processing file ${file}:`, e);
      process.exit(1);
    }
  });

program
  .command("generate")
  .description("Generate code from a Tandem file")
  .argument("<file>", "Tandem source file")
  .option("-o, --output <dir>", "Output directory", "./generated")
  .option("-t, --target <target>", "Target generator (types, express, react, all)", "all")
  .option("--dry-run", "Show what would be generated without writing files")
  .option("--no-project-files", "Generate only source code, no project config")
  .option("--project-name <name>", "Project name for package.json")
  .action((file, options) => {
    try {
      const source = readFileSync(file, "utf8");
      const parseResult = parseTandem(source);

      // Check for parse errors
      if (parseResult.diagnostics.length > 0) {
        console.error("Parse errors:");
        for (const diag of parseResult.diagnostics) {
          console.error(`  - ${diag.message}`);
        }
        process.exit(1);
      }

      const compileResult = compileToIR(parseResult.program);

      // Check for compile errors
      if (compileResult.diagnostics.length > 0) {
        console.error("Compile errors:");
        for (const diag of compileResult.diagnostics) {
          console.error(`  - ${diag.message}`);
        }
        process.exit(1);
      }

      const { ir } = compileResult;
      const outputs: GeneratorOutput[] = [];

      // Build generator options from CLI flags
      const generatorOptions: TypeScriptGeneratorOptions = {
        includeProjectFiles: options.projectFiles !== false,
        projectName: options.projectName,
      };

      if (options.target === "all") {
        // Run all generators based on module annotations
        outputs.push(...runAllGenerators(ir, options.output, generatorOptions));
      } else {
        // Run specific generator with options
        const context = createContext(ir, options.output);
        const output = runGenerator(options.target, context, generatorOptions);
        if (output) {
          outputs.push(output);
        } else {
          console.error(`Unknown generator: ${options.target}`);
          console.error("Available generators:", generatorRegistry.list().map((m) => m.id).join(", "));
          process.exit(1);
        }
      }

      // Write or display output
      for (const output of outputs) {
        for (const file of output.files) {
          const fullPath = join(options.output, file.path);

          if (options.dryRun) {
            console.log(`\n=== ${fullPath} ===\n`);
            console.log(file.content);
          } else {
            const dir = dirname(fullPath);
            if (!existsSync(dir)) {
              mkdirSync(dir, { recursive: true });
            }
            writeFileSync(fullPath, file.content, "utf8");
            console.log(`  Created: ${fullPath}`);
          }
        }

        // Only show dependencies if project files are not generated
        if (!generatorOptions.includeProjectFiles) {
          if (output.dependencies && Object.keys(output.dependencies).length > 0) {
            console.log("\nDependencies to install:");
            for (const [pkg, version] of Object.entries(output.dependencies)) {
              console.log(`  ${pkg}: ${version}`);
            }
          }

          if (output.devDependencies && Object.keys(output.devDependencies).length > 0) {
            console.log("\nDev dependencies to install:");
            for (const [pkg, version] of Object.entries(output.devDependencies)) {
              console.log(`  ${pkg}: ${version}`);
            }
          }
        }
      }

      if (!options.dryRun) {
        console.log("\nGeneration complete!");
      }
    } catch (e) {
      console.error(`Error processing file ${file}:`, e);
      process.exit(1);
    }
  });

// Legacy command for backward compatibility
program
  .command("types")
  .description("Generate TypeScript types only (legacy, use generate -t types)")
  .argument("<file>", "Tandem source file")
  .action((file) => {
    try {
      const source = readFileSync(file, "utf8");
      const parseResult = parseTandem(source);
      const compileResult = compileToIR(parseResult.program);
      const generatedCode = generateTypeScript(compileResult.ir);
      console.log(generatedCode);
    } catch (e) {
      console.error(`Error processing file ${file}:`, e);
      process.exit(1);
    }
  });

program
  .command("list-generators")
  .description("List all available generators")
  .action(() => {
    console.log("Available generators:\n");
    for (const meta of generatorRegistry.list()) {
      console.log(`  ${meta.id}`);
      console.log(`    Language: ${meta.language}`);
      console.log(`    Framework: ${meta.framework}`);
      console.log(`    Target: ${meta.target}`);
      console.log(`    Description: ${meta.description}`);
      console.log();
    }
  });

/**
 * Create a generator context from IR.
 */
function createContext(ir: TandemIR, outputDir: string): GeneratorContext {
  return {
    ir,
    config: {
      outputDir,
      overwrite: true,
    },
    targetModules: Array.from(ir.modules.values()),
  };
}

/**
 * Run a specific generator with options.
 */
function runGenerator(
  target: string,
  context: GeneratorContext,
  options: TypeScriptGeneratorOptions
): GeneratorOutput | null {
  switch (target) {
    case "types":
      return new TypesGenerator().generate(context);
    case "express":
      return new ExpressGenerator(options).generate(context);
    case "react":
      return new ReactGenerator(options).generate(context);
    default:
      return null;
  }
}

/**
 * Run all appropriate generators based on module annotations.
 */
function runAllGenerators(
  ir: TandemIR,
  outputDir: string,
  options: TypeScriptGeneratorOptions
): GeneratorOutput[] {
  const outputs: GeneratorOutput[] = [];
  const context = createContext(ir, outputDir);

  // Always generate shared types (types generator doesn't have project files)
  const typesGenerator = new TypesGenerator();
  const typesOutput = typesGenerator.generate(context);
  // Put types in shared folder
  typesOutput.files = typesOutput.files.map((f) => ({
    ...f,
    path: `shared/${f.path}`,
  }));
  outputs.push(typesOutput);

  // Check for backend annotation
  for (const [, module] of ir.modules) {
    const backendAnnotation = module.annotations.find((a) => a.name === "backend");
    if (backendAnnotation?.value === "express") {
      const expressGenerator = new ExpressGenerator(options);
      const output = expressGenerator.generate(context);
      // Put backend files in backend folder
      output.files = output.files.map((f) => ({
        ...f,
        path: `backend/${f.path}`,
      }));
      outputs.push(output);
      break;
    }
  }

  // Check for frontend annotation
  for (const [, module] of ir.modules) {
    const frontendAnnotation = module.annotations.find((a) => a.name === "frontend");
    if (frontendAnnotation?.value === "react") {
      const reactGenerator = new ReactGenerator(options);
      const output = reactGenerator.generate(context);
      // Put frontend files in frontend folder
      output.files = output.files.map((f) => ({
        ...f,
        path: `frontend/${f.path}`,
      }));
      outputs.push(output);
      break;
    }
  }

  return outputs;
}

program.parse();
