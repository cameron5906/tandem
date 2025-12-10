import { z } from "zod";
import type {
  ILLMProvider,
  LLMMessage,
  LLMCompletionOptions,
  LLMStreamChunk,
  LLMProviderConfig,
} from "../interfaces";

/**
 * Abstract base class for LLM providers.
 * Provides common functionality like retry logic and error handling.
 */
export abstract class BaseProvider implements ILLMProvider {
  abstract readonly name: string;
  abstract readonly supportedModels: string[];

  protected config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
    // Note: validateConfig() must be called by subclasses after their properties are initialized
    // JavaScript class initialization order means subclass properties aren't ready during super()
  }

  /**
   * Validate provider configuration.
   * Override in subclasses for provider-specific validation.
   */
  protected abstract validateConfig(): void;

  /**
   * Generate a completion with structured output.
   */
  abstract complete<T>(
    messages: LLMMessage[],
    schema: z.ZodSchema<T>,
    options?: LLMCompletionOptions,
  ): Promise<T>;

  /**
   * Generate a streaming completion.
   */
  abstract stream(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
  ): AsyncIterable<LLMStreamChunk>;

  /**
   * Estimate token count for messages.
   */
  abstract estimateTokens(messages: LLMMessage[]): number;

  /**
   * Get the maximum context window for the configured model.
   */
  abstract getMaxContextTokens(): number;

  /**
   * Execute an operation with retry logic.
   *
   * @param operation - Async operation to execute
   * @param maxRetries - Maximum number of retry attempts
   * @returns Result of the operation
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (!this.isRetryable(error)) {
          throw error;
        }
        // Exponential backoff: 1s, 2s, 4s
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    throw lastError;
  }

  /**
   * Check if an error is retryable.
   *
   * @param error - Error to check
   * @returns True if the error is transient and worth retrying
   */
  protected isRetryable(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("rate") ||
        message.includes("timeout") ||
        message.includes("503") ||
        message.includes("502") ||
        message.includes("429") ||
        message.includes("connection") ||
        message.includes("network")
      );
    }
    return false;
  }

  /**
   * Delay execution for a specified duration.
   *
   * @param ms - Milliseconds to delay
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get the configured model or a default.
   */
  protected getModel(): string {
    return this.config.model;
  }

  /**
   * Get timeout from config or default.
   */
  protected getTimeout(): number {
    return this.config.timeout ?? 60000;
  }
}
