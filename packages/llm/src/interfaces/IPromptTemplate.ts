import type { LLMMessage } from "./ILLMProvider";
import type {
  HandlerGenerationContext,
  ComponentGenerationContext,
  AppLayoutGenerationContext,
} from "./IGenerationContext";

/**
 * Target types for code generation.
 */
export type GenerationTarget =
  | "handler-implementation"
  | "component-jsx"
  | "app-layout"
  | "form-fields"
  | "validation-logic"
  | "test-cases";

/**
 * Configuration metadata for a prompt template.
 */
export interface PromptTemplateConfig {
  /** Unique identifier for this template */
  id: string;
  /** Generation target type */
  target: GenerationTarget;
  /** Version string for tracking changes */
  version: string;
  /** Human-readable description */
  description: string;
}

/**
 * Base interface for prompt templates.
 *
 * @template TContext - The context type this template expects
 */
export interface IPromptTemplate<TContext> {
  /** Template configuration */
  readonly config: PromptTemplateConfig;

  /**
   * Build the full message array for the LLM.
   *
   * @param context - Generation context
   * @returns Array of messages for LLM conversation
   */
  buildMessages(context: TContext): LLMMessage[];

  /**
   * Estimate token count for this prompt with given context.
   *
   * @param context - Generation context
   * @returns Estimated token count
   */
  estimateTokens(context: TContext): number;
}

/**
 * Prompt template for handler implementation generation.
 */
export type IHandlerPromptTemplate = IPromptTemplate<HandlerGenerationContext>;

/**
 * Prompt template for component JSX generation.
 */
export type IComponentPromptTemplate =
  IPromptTemplate<ComponentGenerationContext>;

/**
 * Prompt template for App layout generation.
 */
export type IAppLayoutPromptTemplate =
  IPromptTemplate<AppLayoutGenerationContext>;
