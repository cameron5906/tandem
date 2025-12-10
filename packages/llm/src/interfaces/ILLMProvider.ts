import { z } from "zod";

/**
 * Represents a message in an LLM conversation.
 */
export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Options for LLM completion requests.
 */
export interface LLMCompletionOptions {
  /** Temperature for response randomness (0.0 - 1.0) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Sequences that stop generation */
  stopSequences?: string[];
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * A chunk of streamed LLM output.
 */
export interface LLMStreamChunk {
  /** The content of this chunk */
  content: string;
  /** Whether this is the final chunk */
  isComplete: boolean;
}

/**
 * Configuration for an LLM provider.
 */
export interface LLMProviderConfig {
  /** API key for authentication */
  apiKey: string;
  /** Model identifier */
  model: string;
  /** Optional custom API base URL */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Abstract interface for LLM providers.
 * Implementations handle provider-specific API calls and structured output.
 */
export interface ILLMProvider {
  /** Provider name (e.g., "openai", "anthropic", "gemini") */
  readonly name: string;

  /** List of supported model identifiers */
  readonly supportedModels: string[];

  /**
   * Generate a completion with structured output.
   * Uses provider-specific structured output features (Zod schemas).
   *
   * @param messages - Conversation messages
   * @param schema - Zod schema for structured output
   * @param options - Optional completion settings
   * @returns Parsed response matching the schema
   */
  complete<T>(
    messages: LLMMessage[],
    schema: z.ZodSchema<T>,
    options?: LLMCompletionOptions,
  ): Promise<T>;

  /**
   * Generate a streaming completion.
   * Yields chunks as they arrive from the provider.
   *
   * @param messages - Conversation messages
   * @param options - Optional completion settings
   * @returns Async iterable of stream chunks
   */
  stream(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
  ): AsyncIterable<LLMStreamChunk>;

  /**
   * Estimate token count for messages.
   * Used for context window management.
   *
   * @param messages - Messages to estimate
   * @returns Estimated token count
   */
  estimateTokens(messages: LLMMessage[]): number;

  /**
   * Get the maximum context window for the configured model.
   *
   * @returns Maximum tokens allowed in context
   */
  getMaxContextTokens(): number;
}
