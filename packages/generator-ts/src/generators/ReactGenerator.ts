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
import { ComponentEmitter } from "../emitters/ComponentEmitter";
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

  generate(context: GeneratorContext): GeneratorOutput {
    const files = [];

    // Generate shared types (in src/ directory)
    const mapper = new TypeScriptTypeMapper();
    const typeEmitter = new TypeDeclarationEmitter(mapper, {
      includeIntentTypes: true,
    });
    const typeFiles = typeEmitter.emit(context.ir);
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
    const apiFiles = apiEmitter.emit(context.ir);
    files.push(
      ...apiFiles.map((f) => ({
        path: `src/${f.filename}`,
        content: f.content,
      }))
    );

    // Generate React Query hooks (in src/ directory)
    const hooksEmitter = new ReactHooksEmitter();
    const hookFiles = hooksEmitter.emit(context.ir);
    files.push(
      ...hookFiles.map((f) => ({
        path: `src/${f.filename}`,
        content: f.content,
      }))
    );

    // Generate React components (in src/ directory) if there are any
    if (context.ir.components.size > 0) {
      const componentEmitter = new ComponentEmitter(mapper);
      const componentFiles = componentEmitter.emit(context.ir);
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

      // Generate React entry point and App component
      const appEmitter = new ReactAppEmitter();
      const appFiles = appEmitter.emit({
        appTitle,
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
