import {
  IFrameworkGenerator,
  FrameworkGeneratorMeta,
  GeneratorContext,
  GeneratorOutput,
} from "@tandem-lang/generator-core";
import { TypeScriptTypeMapper } from "../mappers";
import { TypeDeclarationEmitter } from "../emitters/TypeDeclarationEmitter";
import {
  ExpressRouteEmitter,
  ExpressRouteEmitterConfig,
} from "../emitters/ExpressRouteEmitter";
import type { GeneratedCode } from "../interfaces/ICodeEmitter";
import {
  PackageJsonEmitter,
  EXPRESS_DEPENDENCIES,
  EXPRESS_DEV_DEPENDENCIES,
  EXPRESS_SCRIPTS,
} from "../emitters/project/PackageJsonEmitter";
import { TsConfigEmitter } from "../emitters/project/TsConfigEmitter";
import { ExpressAppEmitter } from "../emitters/project/ExpressAppEmitter";
import { TypeScriptGeneratorOptions, DEFAULT_GENERATOR_OPTIONS } from "./types";
import { createPipelineFromConfig } from "../utils/pipelineFactory";

/**
 * Generator for Express.js backend routes.
 * Generates route handlers, router setup, shared types, and optionally project files.
 */
export class ExpressGenerator implements IFrameworkGenerator {
  readonly meta: FrameworkGeneratorMeta = {
    id: "typescript:express",
    language: "typescript",
    framework: "express",
    target: "backend",
    description: "Generate Express.js route handlers from Tandem IR",
    version: "0.1.0",
  };

  private options: Required<TypeScriptGeneratorOptions>;

  constructor(options: TypeScriptGeneratorOptions = {}) {
    this.options = { ...DEFAULT_GENERATOR_OPTIONS, ...options };
  }

  async generate(context: GeneratorContext): Promise<GeneratorOutput> {
    const files = [];

    // Generate shared types (in src/ directory)
    const mapper = new TypeScriptTypeMapper();
    const typeEmitter = new TypeDeclarationEmitter(mapper, {
      includeIntentTypes: true,
    });
    const typeFiles = typeEmitter.emit(context.ir) as GeneratedCode[];
    files.push(
      ...typeFiles.map((f) => ({
        path: `src/${f.filename}`,
        content: f.content,
      }))
    );

    // Map progress callback for pipeline events
    const progressCallback = context.onProgress
      ? (event: import("@tandem-lang/llm").PipelineProgressEvent) => {
          const phaseMap: Record<string, "generating" | "validating" | "retrying" | "complete" | "error"> = {
            generating: "generating",
            validating: "validating",
            retrying: "retrying",
            success: "complete",
            error: "error",
          };
          context.onProgress!({
            phase: phaseMap[event.type] || "generating",
            target: event.target,
            message: event.message || `${event.type}: ${event.target}`,
            attempt: event.attempt,
            maxAttempts: event.maxAttempts,
          });
        }
      : undefined;

    // Build emitter config with LLM pipeline
    const emitterConfig: ExpressRouteEmitterConfig = {
      pipeline: createPipelineFromConfig(context.config.llm, { onProgress: progressCallback }),
    };

    // Generate Express routes (in src/ directory)
    const routeEmitter = new ExpressRouteEmitter(emitterConfig);
    const routeFiles = await routeEmitter.emit(context.ir);
    files.push(
      ...routeFiles.map((f) => ({
        path: `src/${f.filename}`,
        content: f.content,
      }))
    );

    // Collect all dependencies
    const dependencies = { ...EXPRESS_DEPENDENCIES };
    const devDependencies = { ...EXPRESS_DEV_DEPENDENCIES };

    // Generate project files if enabled
    if (this.options.includeProjectFiles) {
      const projectName = this.getProjectName(context);

      // Generate package.json
      const packageEmitter = new PackageJsonEmitter();
      const packageFiles = packageEmitter.emit({
        name: projectName,
        type: "module",
        scripts: EXPRESS_SCRIPTS,
        dependencies,
        devDependencies,
      });
      files.push(...packageFiles);

      // Generate tsconfig.json
      const tsconfigEmitter = new TsConfigEmitter();
      const tsconfigFiles = tsconfigEmitter.emit("node");
      files.push(...tsconfigFiles);

      // Generate entry point
      const appEmitter = new ExpressAppEmitter();
      const appFiles = appEmitter.emit({
        enableCors: true,
      });
      files.push(...appFiles);
    }

    return {
      files,
      dependencies,
      devDependencies,
    };
  }

  validate(context: GeneratorContext): string[] {
    const errors: string[] = [];

    if (context.ir.intents.size === 0) {
      errors.push("No intents found - Express generator requires at least one intent route");
    }

    // Check for @backend(express) annotation
    let hasExpressAnnotation = false;
    for (const [, module] of context.ir.modules) {
      const backendAnnotation = module.annotations.find((a) => a.name === "backend");
      if (backendAnnotation?.value === "express") {
        hasExpressAnnotation = true;
        break;
      }
    }

    if (!hasExpressAnnotation) {
      errors.push("No @backend(express) annotation found in modules");
    }

    return errors;
  }

  /**
   * Derive project name from context or use default.
   */
  private getProjectName(context: GeneratorContext): string {
    // Use custom project name if explicitly provided
    if (this.options.projectName && this.options.projectName !== DEFAULT_GENERATOR_OPTIONS.projectName) {
      return this.options.projectName;
    }

    // Try to derive from first module name
    const firstModule = context.ir.modules.values().next().value;
    if (firstModule) {
      const parts = firstModule.name.split(".");
      return `${parts[parts.length - 1]}-backend`;
    }

    return "tandem-backend";
  }
}
