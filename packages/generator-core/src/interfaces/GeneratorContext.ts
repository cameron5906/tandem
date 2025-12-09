import { TandemIR, IRModule } from "@tandem-lang/compiler";

/**
 * Configuration for a generation run
 */
export interface GeneratorConfig {
  /** Output directory root (e.g., "./generated") */
  outputDir: string;
  /** Whether to overwrite existing files (default: true) */
  overwrite?: boolean;
  /** Custom options passed to generators */
  options?: Record<string, unknown>;
}

/**
 * Context passed to all generators during code generation
 */
export interface GeneratorContext {
  /** The complete Tandem IR */
  ir: TandemIR;
  /** Generator configuration */
  config: GeneratorConfig;
  /** Modules filtered to this generator's target */
  targetModules: IRModule[];
}
