import { z } from "zod";
import { BaseProvider } from "./BaseProvider";
import type {
  LLMMessage,
  LLMCompletionOptions,
  LLMStreamChunk,
  LLMProviderConfig,
} from "../interfaces";

/**
 * Configuration for mock responses.
 */
export interface MockResponseConfig {
  /** Response to return for complete() calls */
  response?: unknown;
  /** Streaming chunks to return */
  streamChunks?: string[];
  /** Error to throw (if simulating failures) */
  error?: Error;
  /** Delay before responding (ms) */
  delay?: number;
  /** Number of times to fail before succeeding */
  failCount?: number;
}

/**
 * Dynamic response function type.
 * Called with schema description to determine which response to return.
 */
export type DynamicResponseFn = (schemaDescription: string | undefined) => unknown;

/**
 * Mock LLM provider for testing.
 * Returns predefined responses without making API calls.
 */
export class MockProvider extends BaseProvider {
  readonly name = "mock";
  readonly supportedModels = ["mock-model"];

  private mockResponse: unknown = {};
  private dynamicResponseFn: DynamicResponseFn | null = null;
  private mockStreamChunks: string[] = [];
  private mockError: Error | null = null;
  private mockDelay: number = 0;
  private failCount: number = 0;
  private callCount: number = 0;
  private lastMessages: LLMMessage[] = [];
  private lastSchema: z.ZodSchema<unknown> | null = null;
  private lastOptions: LLMCompletionOptions | undefined;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.validateConfig();
  }

  protected validateConfig(): void {
    // Mock provider doesn't need validation
  }

  /**
   * Configure the mock response.
   */
  setMockResponse(response: unknown): void {
    this.mockResponse = response;
    this.dynamicResponseFn = null;
  }

  /**
   * Configure a dynamic response function that returns different
   * responses based on the schema description.
   */
  setDynamicResponse(fn: DynamicResponseFn): void {
    this.dynamicResponseFn = fn;
  }

  /**
   * Configure mock streaming chunks.
   */
  setMockStreamChunks(chunks: string[]): void {
    this.mockStreamChunks = chunks;
  }

  /**
   * Configure the mock to throw an error.
   */
  setMockError(error: Error | null): void {
    this.mockError = error;
  }

  /**
   * Configure a delay before responding.
   */
  setMockDelay(delay: number): void {
    this.mockDelay = delay;
  }

  /**
   * Configure how many times to fail before succeeding.
   */
  setFailCount(count: number): void {
    this.failCount = count;
    this.callCount = 0;
  }

  /**
   * Configure all mock settings at once.
   */
  configure(config: MockResponseConfig): void {
    if (config.response !== undefined) this.mockResponse = config.response;
    if (config.streamChunks) this.mockStreamChunks = config.streamChunks;
    if (config.error !== undefined) this.mockError = config.error;
    if (config.delay !== undefined) this.mockDelay = config.delay;
    if (config.failCount !== undefined) {
      this.failCount = config.failCount;
      this.callCount = 0;
    }
  }

  /**
   * Get the last messages sent to complete().
   */
  getLastMessages(): LLMMessage[] {
    return this.lastMessages;
  }

  /**
   * Get the last schema used.
   */
  getLastSchema(): z.ZodSchema<unknown> | null {
    return this.lastSchema;
  }

  /**
   * Get the last options used.
   */
  getLastOptions(): LLMCompletionOptions | undefined {
    return this.lastOptions;
  }

  /**
   * Get the number of times complete() was called.
   */
  getCallCount(): number {
    return this.callCount;
  }

  /**
   * Reset the mock state.
   */
  reset(): void {
    this.mockResponse = {};
    this.mockStreamChunks = [];
    this.mockError = null;
    this.mockDelay = 0;
    this.failCount = 0;
    this.callCount = 0;
    this.lastMessages = [];
    this.lastSchema = null;
    this.lastOptions = undefined;
  }

  async complete<T>(
    messages: LLMMessage[],
    schema: z.ZodSchema<T>,
    options?: LLMCompletionOptions,
  ): Promise<T> {
    this.callCount++;
    this.lastMessages = messages;
    this.lastSchema = schema as z.ZodSchema<unknown>;
    this.lastOptions = options;

    // Simulate delay
    if (this.mockDelay > 0) {
      await this.delay(this.mockDelay);
    }

    // Simulate failures
    if (this.failCount > 0 && this.callCount <= this.failCount) {
      throw new Error(`Mock failure ${this.callCount}/${this.failCount}`);
    }

    // Throw configured error
    if (this.mockError) {
      throw this.mockError;
    }

    // Get response (dynamic or static)
    let response = this.mockResponse;
    if (this.dynamicResponseFn) {
      // Extract schema description from the schema if available
      const schemaDesc = (schema as unknown as { description?: string }).description;
      // Also check messages content for clues about what type of response is needed
      const messagesText = messages.map(m => m.content).join(" ").toLowerCase();
      const contextInfo = schemaDesc || messagesText;
      response = this.dynamicResponseFn(contextInfo);
    }

    // Parse and validate response against schema
    return schema.parse(response);
  }

  async *stream(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
  ): AsyncIterable<LLMStreamChunk> {
    this.lastMessages = messages;
    this.lastOptions = options;

    // Simulate delay
    if (this.mockDelay > 0) {
      await this.delay(this.mockDelay);
    }

    // Throw configured error
    if (this.mockError) {
      throw this.mockError;
    }

    // Yield chunks
    for (let i = 0; i < this.mockStreamChunks.length; i++) {
      yield {
        content: this.mockStreamChunks[i],
        isComplete: i === this.mockStreamChunks.length - 1,
      };
    }

    // If no chunks configured, yield the response as a single chunk
    if (this.mockStreamChunks.length === 0) {
      yield {
        content: JSON.stringify(this.mockResponse),
        isComplete: true,
      };
    }
  }

  estimateTokens(messages: LLMMessage[]): number {
    // Simple estimation: ~4 chars per token
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  getMaxContextTokens(): number {
    return 128000; // Mock a large context window
  }
}
