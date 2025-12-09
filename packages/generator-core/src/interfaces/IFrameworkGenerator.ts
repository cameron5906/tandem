import { GeneratorContext } from "./GeneratorContext";
import { GeneratorOutput } from "./GeneratorOutput";

/**
 * Metadata about a framework generator for registry and CLI
 */
export interface FrameworkGeneratorMeta {
  /** Unique identifier (e.g., "typescript:express") */
  id: string;
  /** Target language (e.g., "typescript", "python", "go") */
  language: string;
  /** Framework name (e.g., "express", "react", "fastapi") */
  framework: string;
  /** Target type: "backend", "frontend", or "shared" */
  target: "backend" | "frontend" | "shared";
  /** Human-readable description */
  description: string;
  /** Version of this generator */
  version?: string;
}

/**
 * Main interface for framework-specific code generators
 */
export interface IFrameworkGenerator {
  /** Generator metadata */
  readonly meta: FrameworkGeneratorMeta;

  /**
   * Generate code for the given context
   * @param context - Generation context with IR and config
   * @returns Generated files and configuration
   */
  generate(context: GeneratorContext): GeneratorOutput;

  /**
   * Validate that this generator can handle the given IR
   * @param context - Generation context to validate
   * @returns Array of validation errors (empty if valid)
   */
  validate?(context: GeneratorContext): string[];
}
