import {
  IFrameworkGenerator,
  FrameworkGeneratorMeta,
  GeneratorContext,
  GeneratorOutput,
} from "@tandem-lang/generator-core";
import { TypeScriptTypeMapper } from "../mappers";
import { TypeDeclarationEmitter } from "../emitters/TypeDeclarationEmitter";
import { ApiClientEmitter } from "../emitters/ApiClientEmitter";
import { ReactHooksEmitter } from "../emitters/ReactHooksEmitter";
import { ComponentEmitter, ComponentEmitterConfig } from "../emitters/ComponentEmitter";
import type { GeneratedCode } from "../interfaces/ICodeEmitter";
import {
  PackageJsonEmitter,
  REACT_DEPENDENCIES,
  REACT_DEV_DEPENDENCIES,
  REACT_SCRIPTS,
} from "../emitters/project/PackageJsonEmitter";
import { TsConfigEmitter } from "../emitters/project/TsConfigEmitter";
import { ReactAppEmitter } from "../emitters/project/ReactAppEmitter";
import { ViteConfigEmitter } from "../emitters/project/ViteConfigEmitter";
import { HtmlEntryEmitter } from "../emitters/project/HtmlEntryEmitter";
import { TypeScriptGeneratorOptions, DEFAULT_GENERATOR_OPTIONS } from "./types";
import { createPipelineFromConfig } from "../utils/pipelineFactory";

/**
 * Generator for React frontend with React Query hooks.
 * Generates typed API client, React Query hooks, shared types, and optionally project files.
 */
export class ReactGenerator implements IFrameworkGenerator {
  readonly meta: FrameworkGeneratorMeta = {
    id: "typescript:react",
    language: "typescript",
    framework: "react",
    target: "frontend",
    description: "Generate React Query hooks and typed API client from Tandem IR",
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

    // Generate API client (in src/ directory)
    const apiEmitter = new ApiClientEmitter({
      baseUrl: "/api",
    });
    const apiFiles = apiEmitter.emit(context.ir) as GeneratedCode[];
    files.push(
      ...apiFiles.map((f) => ({
        path: `src/${f.filename}`,
        content: f.content,
      }))
    );

    // Generate React Query hooks (in src/ directory)
    const hooksEmitter = new ReactHooksEmitter();
    const hookFiles = hooksEmitter.emit(context.ir) as GeneratedCode[];
    files.push(
      ...hookFiles.map((f) => ({
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

    // Create pipeline once for both component and App generation
    const pipeline = context.ir.components.size > 0
      ? createPipelineFromConfig(context.config.llm, { onProgress: progressCallback })
      : undefined;

    // Generate React components (in src/ directory) if there are any
    if (context.ir.components.size > 0 && pipeline) {
      // Build emitter config with LLM pipeline
      const componentConfig: ComponentEmitterConfig = {
        pipeline,
      };

      const componentEmitter = new ComponentEmitter(mapper, componentConfig);
      const componentFiles = await componentEmitter.emit(context.ir);
      files.push(
        ...componentFiles.map((f) => ({
          path: `src/${f.filename}`,
          content: f.content,
        }))
      );
    }

    // Collect all dependencies
    const dependencies = { ...REACT_DEPENDENCIES };
    const devDependencies = { ...REACT_DEV_DEPENDENCIES };

    // Generate project files if enabled
    if (this.options.includeProjectFiles) {
      const projectName = this.getProjectName(context);
      const appTitle = this.getAppTitle(context);

      // Generate package.json
      const packageEmitter = new PackageJsonEmitter();
      const packageFiles = packageEmitter.emit({
        name: projectName,
        type: "module",
        scripts: REACT_SCRIPTS,
        dependencies,
        devDependencies,
      });
      files.push(...packageFiles);

      // Generate tsconfig.json
      const tsconfigEmitter = new TsConfigEmitter();
      const tsconfigFiles = tsconfigEmitter.emit("browser");
      files.push(...tsconfigFiles);

      // Generate Vite config
      const viteEmitter = new ViteConfigEmitter();
      const viteFiles = viteEmitter.emit({
        apiProxyTarget: "http://localhost:3000",
        apiPath: "/api",
      });
      files.push(...viteFiles);

      // Generate index.html
      const htmlEmitter = new HtmlEntryEmitter();
      const htmlFiles = htmlEmitter.emit({
        title: appTitle,
      });
      files.push(...htmlFiles);

      // Generate React entry point and App component (with LLM-powered layout if available)
      const appEmitter = new ReactAppEmitter();
      const appFiles = await appEmitter.emit({
        appTitle,
        ir: context.ir,
        pipeline,
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
      errors.push("No intents found - React generator requires at least one intent route");
    }

    // Check for @frontend(react) annotation
    let hasReactAnnotation = false;
    for (const [, module] of context.ir.modules) {
      const frontendAnnotation = module.annotations.find((a) => a.name === "frontend");
      if (frontendAnnotation?.value === "react") {
        hasReactAnnotation = true;
        break;
      }
    }

    if (!hasReactAnnotation) {
      errors.push("No @frontend(react) annotation found in modules");
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
      return `${parts[parts.length - 1]}-frontend`;
    }

    return "tandem-frontend";
  }

  /**
   * Derive app title from context or use default.
   */
  private getAppTitle(context: GeneratorContext): string {
    const firstModule = context.ir.modules.values().next().value;
    if (firstModule) {
      const parts = firstModule.name.split(".");
      const name = parts[parts.length - 1];
      // Convert to title case
      return name.charAt(0).toUpperCase() + name.slice(1) + " App";
    }

    return "Tandem App";
  }
}
