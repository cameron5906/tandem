import { TandemIR, IRModule } from "@tandem-lang/compiler";

/**
 * LLM provider configuration for AI-powered code generation.
 */
export interface LLMProviderConfig {
  /** Provider type: "openai", "anthropic", "gemini", or "mock" */
  provider: "openai" | "anthropic" | "gemini" | "mock";
  /** API key for the provider (required for non-mock providers) */
  apiKey?: string;
  /** Model to use (e.g., "gpt-4o", "claude-sonnet-4", "gemini-2.0-flash") */
  model?: string;
  /** Maximum retry attempts for failed generations */
  maxRetries?: number;
}

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
  /** LLM configuration for AI-powered code generation */
  llm: LLMProviderConfig;
}

/**
 * Progress callback for generation events.
 */
export type GeneratorProgressCallback = (event: {
  phase: "generating" | "validating" | "retrying" | "complete" | "error";
  target: string;
  message: string;
  attempt?: number;
  maxAttempts?: number;
}) => void;

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
  /** Progress callback for generation events */
  onProgress?: GeneratorProgressCallback;
}
