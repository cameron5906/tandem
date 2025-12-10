import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat, zodTextFormat } from "openai/helpers/zod";
import { BaseProvider } from "./BaseProvider";
import type {
  LLMMessage,
  LLMCompletionOptions,
  LLMStreamChunk,
  LLMProviderConfig,
} from "../interfaces";

/**
 * OpenAI LLM provider implementation.
 * Uses OpenAI's structured outputs with Zod schemas.
 * Supports both Chat Completions API (GPT-4o) and Responses API (GPT-5+).
 */
export class OpenAIProvider extends BaseProvider {
  readonly name = "openai";
  readonly supportedModels = [
    "gpt-5.1-codex",
    "gpt-5.1-codex-mini",
    "gpt-5.1",
    "gpt-5",
    "gpt-5-codex",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
  ];

  /**
   * Models that require the Responses API instead of Chat Completions.
   * GPT-5+ models only work with /v1/responses endpoint.
   */
  private readonly responsesApiModels = [
    "gpt-5.1",
    "gpt-5",
  ];

  private client: OpenAI;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.validateConfig();
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeout ?? 60000,
    });
  }

  protected validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error("OpenAI API key is required");
    }
    if (!this.supportedModels.includes(this.config.model)) {
      console.warn(
        `Model ${this.config.model} may not support structured outputs. ` +
          `Supported models: ${this.supportedModels.join(", ")}`,
      );
    }
  }

  /**
   * Check if the current model requires the Responses API.
   * GPT-5+ models only work with /v1/responses, not /v1/chat/completions.
   */
  private usesResponsesApi(): boolean {
    return this.responsesApiModels.some((prefix) =>
      this.config.model.startsWith(prefix),
    );
  }

  async complete<T>(
    messages: LLMMessage[],
    schema: z.ZodSchema<T>,
    options?: LLMCompletionOptions,
  ): Promise<T> {
    if (this.usesResponsesApi()) {
      return this.completeWithResponsesApi(messages, schema, options);
    }
    return this.completeWithChatCompletions(messages, schema, options);
  }

  /**
   * Complete using the Responses API (/v1/responses).
   * Required for GPT-5+ models.
   * Note: GPT-5+ models don't support temperature or max_output_tokens.
   */
  private async completeWithResponsesApi<T>(
    messages: LLMMessage[],
    schema: z.ZodSchema<T>,
    _options?: LLMCompletionOptions,
  ): Promise<T> {
    return this.withRetry(async () => {
      const response = await this.client.responses.parse({
        model: this.config.model,
        input: messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system" | "developer",
          content: m.content,
        })),
        text: {
          format: zodTextFormat(schema, "generated_code"),
        },
      });

      const parsed = response.output_parsed;
      if (!parsed) {
        throw new Error("Failed to parse structured response from OpenAI Responses API");
      }

      return parsed;
    });
  }

  /**
   * Complete using the Chat Completions API (/v1/chat/completions).
   * Used for GPT-4o and older models.
   */
  private async completeWithChatCompletions<T>(
    messages: LLMMessage[],
    schema: z.ZodSchema<T>,
    options?: LLMCompletionOptions,
  ): Promise<T> {
    return this.withRetry(async () => {
      const response = await this.client.beta.chat.completions.parse({
        model: this.config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        response_format: zodResponseFormat(schema, "generated_code"),
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 4096,
      });

      const parsed = response.choices[0]?.message?.parsed;
      if (!parsed) {
        // Check for refusal
        const refusal = response.choices[0]?.message?.refusal;
        if (refusal) {
          throw new Error(`Model refused request: ${refusal}`);
        }
        throw new Error("Failed to parse structured response from OpenAI");
      }

      return parsed;
    });
  }

  async *stream(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
  ): AsyncIterable<LLMStreamChunk> {
    if (this.usesResponsesApi()) {
      yield* this.streamWithResponsesApi(messages);
    } else {
      yield* this.streamWithChatCompletions(messages, options);
    }
  }

  /**
   * Stream using the Responses API.
   * Note: GPT-5+ models don't support temperature or max_output_tokens.
   */
  private async *streamWithResponsesApi(
    messages: LLMMessage[],
  ): AsyncIterable<LLMStreamChunk> {
    const stream = this.client.responses.stream({
      model: this.config.model,
      input: messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system" | "developer",
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        yield { content: event.delta, isComplete: false };
      } else if (event.type === "response.completed") {
        yield { content: "", isComplete: true };
      }
    }
  }

  /**
   * Stream using the Chat Completions API.
   */
  private async *streamWithChatCompletions(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
  ): AsyncIterable<LLMStreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content ?? "";
      const isComplete = chunk.choices[0]?.finish_reason !== null;
      yield { content, isComplete };
    }
  }

  estimateTokens(messages: LLMMessage[]): number {
    // Rough estimation: ~4 chars per token for English text
    // This is a simplified estimate; for production use tiktoken
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    // Add overhead for message formatting (~4 tokens per message)
    const overhead = messages.length * 4;
    return Math.ceil(totalChars / 4) + overhead;
  }

  getMaxContextTokens(): number {
    const contextLimits: Record<string, number> = {
      "gpt-5.1-codex": 128000,
      "gpt-5.1-codex-mini": 128000,
      "gpt-5.1": 128000,
      "gpt-5": 128000,
      "gpt-5-codex": 128000,
      "gpt-5-mini": 128000,
      "gpt-5-nano": 128000,
      "gpt-4o": 128000,
      "gpt-4o-mini": 128000,
      "gpt-4-turbo": 128000,
    };
    return contextLimits[this.config.model] ?? 8192;
  }
}
