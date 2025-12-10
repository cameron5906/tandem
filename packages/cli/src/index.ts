#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { homedir } from "os";
import { select, input, password, confirm } from "@inquirer/prompts";
import { parseTandem, compileToIR, TandemIR } from "@tandem-lang/compiler";
import {
  generatorRegistry,
  GeneratorContext,
  GeneratorOutput,
  LLMProviderConfig,
  GeneratorProgressCallback,
} from "@tandem-lang/generator-core";
import {
  registerAllGenerators,
  generateTypeScript,
  ExpressGenerator,
  ReactGenerator,
  TypesGenerator,
  TypeScriptGeneratorOptions,
} from "@tandem-lang/generator-ts";
import {
  loadConfig,
  loadConfigFromFile,
  validateConfig,
  DEFAULT_LLM_CONFIG,
  DEFAULT_MODELS,
  LLMConfig,
  ProviderType,
} from "@tandem-lang/llm";

// ============================================================================
// Credentials Storage
// ============================================================================

interface StoredCredentials {
  provider: ProviderType;
  model: string;
  apiKey: string;
}

const TANDEM_CONFIG_DIR = join(homedir(), ".tandem");
const CREDENTIALS_FILE = join(TANDEM_CONFIG_DIR, "credentials.json");

/**
 * Load stored credentials from ~/.tandem/credentials.json
 */
function loadStoredCredentials(): StoredCredentials | null {
  try {
    if (existsSync(CREDENTIALS_FILE)) {
      const content = readFileSync(CREDENTIALS_FILE, "utf-8");
      return JSON.parse(content) as StoredCredentials;
    }
  } catch {
    // Ignore errors, return null
  }
  return null;
}

/**
 * Save credentials to ~/.tandem/credentials.json
 */
function saveCredentials(credentials: StoredCredentials): void {
  if (!existsSync(TANDEM_CONFIG_DIR)) {
    mkdirSync(TANDEM_CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), "utf-8");
}

/**
 * Delete stored credentials
 */
function deleteCredentials(): boolean {
  try {
    if (existsSync(CREDENTIALS_FILE)) {
      const fs = require("fs");
      fs.unlinkSync(CREDENTIALS_FILE);
      return true;
    }
  } catch {
    // Ignore errors
  }
  return false;
}

// ============================================================================
// Model Definitions
// ============================================================================

const PROVIDER_MODELS: Record<ProviderType, { value: string; name: string; description: string }[]> = {
  openai: [
    { value: "gpt-5-codex", name: "GPT-5 Codex", description: "Optimized for code generation" },
    { value: "gpt-5", name: "GPT-5", description: "Most capable flagship model" },
    { value: "gpt-5-mini", name: "GPT-5 Mini", description: "Fast and affordable" },
    { value: "gpt-5-nano", name: "GPT-5 Nano", description: "Fastest, most efficient" },
  ],
  anthropic: [
    { value: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", description: "Best for coding and agents" },
    { value: "claude-opus-4-5-20251101", name: "Claude Opus 4.5", description: "Most intelligent" },
    { value: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", description: "Fastest, near-frontier intelligence" },
    { value: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", description: "Previous version" },
  ],
  gemini: [
    { value: "gemini-3-pro-preview", name: "Gemini 3 Pro", description: "Latest, most powerful" },
    { value: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Fast and intelligent" },
    { value: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Advanced reasoning" },
    { value: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", description: "Ultra fast, cost-efficient" },
  ],
  mock: [
    { value: "mock-model", name: "Mock Model", description: "For testing (no API calls)" },
  ],
};

const PROVIDER_INFO: Record<ProviderType, { name: string; description: string; keyUrl: string }> = {
  openai: {
    name: "OpenAI",
    description: "GPT-4o and GPT-4 models",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    name: "Anthropic",
    description: "Claude models, excellent for code",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  gemini: {
    name: "Google Gemini",
    description: "Gemini 2.0 and 1.5 models",
    keyUrl: "https://aistudio.google.com/apikey",
  },
  mock: {
    name: "Mock (Testing)",
    description: "No API calls, returns placeholders",
    keyUrl: "",
  },
};

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
  .option("--provider <provider>", "LLM provider (openai, anthropic, gemini, mock)")
  .option("--model <model>", "LLM model to use")
  .option("-q, --quiet", "Suppress progress output")
  .action(async (file, options) => {
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

      // Load LLM config from multiple sources (priority: CLI > env > stored credentials > config file)
      const storedCreds = loadStoredCredentials();
      const config = loadConfig();

      // Use stored credentials as base if available
      if (storedCreds) {
        config.provider = storedCreds.provider;
        config.model = storedCreds.model;
        config.apiKey = storedCreds.apiKey;
      }

      // Override with CLI options
      if (options.provider) {
        config.provider = options.provider;
      }
      if (options.model) {
        config.model = options.model;
      }

      // Validate config
      try {
        validateConfig(config);
      } catch (e) {
        console.error(`Configuration Error: ${(e as Error).message}`);
        console.log("\nTo set up your LLM provider, run:");
        console.log("  tandem setup\n");
        console.log("Or set environment variables:");
        console.log("  - OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY");
        process.exit(1);
      }

      const llmConfig: LLMProviderConfig = {
        provider: config.provider,
        apiKey: config.apiKey,
        model: config.model,
        maxRetries: config.maxRetries,
      };

      if (!options.quiet) {
        console.log(`Using ${config.provider} (${config.model})\n`);
      }

      // Create progress callback
      const onProgress: GeneratorProgressCallback | undefined = options.quiet
        ? undefined
        : (event) => {
            const statusIcons: Record<string, string> = {
              generating: "[...]",
              validating: "[?]",
              retrying: "[!]",
              complete: "[+]",
              error: "[x]",
            };
            const icon = statusIcons[event.phase] || "[-]";
            const attemptInfo = event.attempt && event.maxAttempts
              ? ` (attempt ${event.attempt}/${event.maxAttempts})`
              : "";
            console.log(`  ${icon} ${event.message}${attemptInfo}`);
          };

      if (options.target === "all") {
        // Run all generators based on module annotations
        outputs.push(...await runAllGenerators(ir, options.output, generatorOptions, llmConfig, onProgress));
      } else {
        // Run specific generator with options
        const context = createContext(ir, options.output, llmConfig, onProgress);
        const output = await runGenerator(options.target, context, generatorOptions);
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

// Config command group
const configCmd = program
  .command("config")
  .description("Manage Tandem configuration");

configCmd
  .command("show")
  .description("Show current configuration")
  .action(() => {
    const storedCreds = loadStoredCredentials();
    const config = loadConfig();
    const fileConfig = loadConfigFromFile();

    // Apply stored credentials for display
    if (storedCreds) {
      config.provider = storedCreds.provider;
      config.model = storedCreds.model;
      config.apiKey = storedCreds.apiKey;
    }

    console.log("Current Configuration:\n");

    console.log("Active Settings:");
    console.log(`  Provider: ${config.provider}`);
    console.log(`  Model: ${config.model || DEFAULT_MODELS[config.provider]}`);
    console.log(`  Temperature: ${config.temperature ?? DEFAULT_LLM_CONFIG.temperature}`);
    console.log(`  Max Retries: ${config.maxRetries ?? DEFAULT_LLM_CONFIG.maxRetries}`);
    console.log(`  API Key: ${config.apiKey ? "[set]" : "[not set]"}`);

    console.log("\nConfiguration Sources (priority order):");

    // Stored credentials (from tandem setup)
    if (storedCreds) {
      console.log("  Stored credentials: Found (from 'tandem setup')");
      console.log(`    - Provider: ${storedCreds.provider}`);
      console.log(`    - Model: ${storedCreds.model}`);
      console.log(`    - API Key: ${"*".repeat(8)}...${storedCreds.apiKey.slice(-4)}`);
    } else {
      console.log("  Stored credentials: Not found");
      console.log("    Run 'tandem setup' to configure");
    }

    // Environment variables
    const envProvider = process.env.TANDEM_LLM_PROVIDER;
    const envModel = process.env.TANDEM_LLM_MODEL;
    const hasEnvApiKey = !!(
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GEMINI_API_KEY
    );

    console.log("  Environment variables:");
    console.log(`    - TANDEM_LLM_PROVIDER: ${envProvider || "(not set)"}`);
    console.log(`    - TANDEM_LLM_MODEL: ${envModel || "(not set)"}`);
    console.log(`    - API Key env vars: ${hasEnvApiKey ? "[set]" : "[not set]"}`);

    // Config file
    if (fileConfig) {
      console.log("  Config file: Found");
      if (fileConfig.llm) {
        console.log(`    - Provider: ${fileConfig.llm.provider || "(not set)"}`);
        console.log(`    - Model: ${fileConfig.llm.model || "(not set)"}`);
      }
    } else {
      console.log("  Config file: Not found");
    }
  });

configCmd
  .command("init")
  .description("Create a template configuration file")
  .option("-f, --force", "Overwrite existing config file")
  .action((options) => {
    const configPath = join(process.cwd(), "tandem.config.json");

    if (existsSync(configPath) && !options.force) {
      console.error("Config file already exists. Use --force to overwrite.");
      process.exit(1);
    }

    const templateConfig = {
      llm: {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.2,
        maxRetries: 3,
      },
    };

    writeFileSync(configPath, JSON.stringify(templateConfig, null, 2), "utf8");
    console.log(`Created ${configPath}`);
    console.log("\nNote: Set your API key via environment variable:");
    console.log("  - OpenAI: OPENAI_API_KEY");
    console.log("  - Anthropic: ANTHROPIC_API_KEY");
    console.log("  - Gemini: GEMINI_API_KEY");
  });

configCmd
  .command("providers")
  .description("List available LLM providers")
  .action(() => {
    console.log("Available LLM Providers:\n");

    console.log("  openai");
    console.log("    Default model: " + DEFAULT_MODELS.openai);
    console.log("    Env var: OPENAI_API_KEY");
    console.log();

    console.log("  anthropic");
    console.log("    Default model: " + DEFAULT_MODELS.anthropic);
    console.log("    Env var: ANTHROPIC_API_KEY");
    console.log();

    console.log("  gemini");
    console.log("    Default model: " + DEFAULT_MODELS.gemini);
    console.log("    Env var: GEMINI_API_KEY");
    console.log();

    console.log("  mock");
    console.log("    For testing (no API key required)");
    console.log("    Generates placeholder implementations");
  });

// ============================================================================
// Setup Command (Interactive Wizard)
// ============================================================================

program
  .command("setup")
  .description("Interactive wizard to configure LLM provider and API key")
  .action(async () => {
    console.log("\n🔧 Tandem LLM Setup Wizard\n");

    // Check for existing credentials
    const existingCreds = loadStoredCredentials();
    if (existingCreds) {
      console.log("Existing configuration found:");
      console.log(`  Provider: ${PROVIDER_INFO[existingCreds.provider].name}`);
      console.log(`  Model: ${existingCreds.model}`);
      console.log(`  API Key: ${"*".repeat(8)}...${existingCreds.apiKey.slice(-4)}`);
      console.log();

      const shouldReconfigure = await confirm({
        message: "Do you want to reconfigure?",
        default: false,
      });

      if (!shouldReconfigure) {
        console.log("\nKeeping existing configuration.");
        return;
      }
      console.log();
    }

    // Step 1: Choose provider
    const provider = await select<ProviderType>({
      message: "Select your LLM provider:",
      choices: [
        {
          value: "openai" as ProviderType,
          name: "OpenAI",
          description: PROVIDER_INFO.openai.description,
        },
        {
          value: "anthropic" as ProviderType,
          name: "Anthropic",
          description: PROVIDER_INFO.anthropic.description,
        },
        {
          value: "gemini" as ProviderType,
          name: "Google Gemini",
          description: PROVIDER_INFO.gemini.description,
        },
        {
          value: "mock" as ProviderType,
          name: "Mock (Testing)",
          description: PROVIDER_INFO.mock.description,
        },
      ],
    });

    // Step 2: Choose model
    const modelChoices = PROVIDER_MODELS[provider].map((m) => ({
      value: m.value,
      name: m.name,
      description: m.description,
    }));

    const model = await select({
      message: "Select a model:",
      choices: modelChoices,
    });

    // Step 3: Enter API key (skip for mock)
    let apiKey = "";
    if (provider !== "mock") {
      console.log(`\nGet your API key from: ${PROVIDER_INFO[provider].keyUrl}\n`);

      apiKey = await password({
        message: "Enter your API key:",
        mask: "*",
        validate: (value) => {
          if (!value || value.trim().length === 0) {
            return "API key is required";
          }
          if (value.trim().length < 10) {
            return "API key seems too short";
          }
          return true;
        },
      });
    }

    // Save credentials
    const credentials: StoredCredentials = {
      provider,
      model,
      apiKey: apiKey.trim(),
    };

    saveCredentials(credentials);

    console.log("\n✅ Configuration saved!\n");
    console.log("Your settings have been stored in:");
    console.log(`  ${CREDENTIALS_FILE}\n`);
    console.log("You can now run 'tandem generate <file>' to generate code.");

    if (provider !== "mock") {
      console.log("\nTip: Keep your API key secure. The credentials file");
      console.log("     is stored locally and not shared with version control.");
    }
  });

program
  .command("logout")
  .description("Remove stored LLM credentials")
  .action(async () => {
    const existingCreds = loadStoredCredentials();

    if (!existingCreds) {
      console.log("No stored credentials found.");
      return;
    }

    const shouldDelete = await confirm({
      message: "Are you sure you want to remove your stored credentials?",
      default: false,
    });

    if (shouldDelete) {
      deleteCredentials();
      console.log("\n✅ Credentials removed.");
    } else {
      console.log("\nCredentials kept.");
    }
  });

/**
 * Create a generator context from IR.
 */
function createContext(
  ir: TandemIR,
  outputDir: string,
  llmConfig: LLMProviderConfig,
  onProgress?: GeneratorProgressCallback
): GeneratorContext {
  return {
    ir,
    config: {
      outputDir,
      overwrite: true,
      llm: llmConfig,
    },
    targetModules: Array.from(ir.modules.values()),
    onProgress,
  };
}

/**
 * Run a specific generator with options.
 */
async function runGenerator(
  target: string,
  context: GeneratorContext,
  options: TypeScriptGeneratorOptions
): Promise<GeneratorOutput | null> {
  switch (target) {
    case "types":
      return new TypesGenerator().generate(context);
    case "express":
      return await new ExpressGenerator(options).generate(context);
    case "react":
      return await new ReactGenerator(options).generate(context);
    default:
      return null;
  }
}

/**
 * Run all appropriate generators based on module annotations.
 */
async function runAllGenerators(
  ir: TandemIR,
  outputDir: string,
  options: TypeScriptGeneratorOptions,
  llmConfig: LLMProviderConfig,
  onProgress?: GeneratorProgressCallback
): Promise<GeneratorOutput[]> {
  const outputs: GeneratorOutput[] = [];
  const context = createContext(ir, outputDir, llmConfig, onProgress);

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
      const output = await expressGenerator.generate(context);
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
      const output = await reactGenerator.generate(context);
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
