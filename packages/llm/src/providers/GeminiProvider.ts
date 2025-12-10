import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { BaseProvider } from "./BaseProvider";
import type {
  LLMMessage,
  LLMCompletionOptions,
  LLMStreamChunk,
  LLMProviderConfig,
} from "../interfaces";

/**
 * Google Gemini LLM provider implementation.
 * Uses Gemini's structured output with JSON Schema.
 */
export class GeminiProvider extends BaseProvider {
  readonly name = "gemini";
  readonly supportedModels = [
    "gemini-3-pro-preview",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
  ];

  private client: GoogleGenAI;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.validateConfig();
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
  }

  protected validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error("Gemini API key is required");
    }
  }

  async complete<T>(
    messages: LLMMessage[],
    schema: z.ZodSchema<T>,
    options?: LLMCompletionOptions,
  ): Promise<T> {
    return this.withRetry(async () => {
      // Convert messages to Gemini format
      const systemMessage = messages.find((m) => m.role === "system");
      const conversationMessages = messages.filter((m) => m.role !== "system");

      // Build the prompt from messages
      const prompt = conversationMessages
        .map((m) => {
          const prefix = m.role === "user" ? "User: " : "Assistant: ";
          return prefix + m.content;
        })
        .join("\n\n");

      // Convert Zod schema to JSON Schema
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jsonSchema = zodToJsonSchema(schema as any, "generated_code");

      const response = await this.client.models.generateContent({
        model: this.config.model,
        contents: prompt,
        config: {
          systemInstruction: systemMessage?.content,
          temperature: options?.temperature ?? 0.2,
          maxOutputTokens: options?.maxTokens ?? 4096,
          responseMimeType: "application/json",
          responseSchema: this.convertToGeminiSchema(jsonSchema),
        },
      });

      // Parse response
      const text = response.text;
      if (!text) {
        throw new Error("Empty response from Gemini");
      }

      const parsed = JSON.parse(text);
      return schema.parse(parsed);
    });
  }

  async *stream(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
  ): AsyncIterable<LLMStreamChunk> {
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    const prompt = conversationMessages
      .map((m) => {
        const prefix = m.role === "user" ? "User: " : "Assistant: ";
        return prefix + m.content;
      })
      .join("\n\n");

    const stream = await this.client.models.generateContentStream({
      model: this.config.model,
      contents: prompt,
      config: {
        systemInstruction: systemMessage?.content,
        temperature: options?.temperature ?? 0.2,
        maxOutputTokens: options?.maxTokens ?? 4096,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        yield {
          content: text,
          isComplete: false,
        };
      }
    }

    yield { content: "", isComplete: true };
  }

  estimateTokens(messages: LLMMessage[]): number {
    // Similar tokenization to GPT
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  getMaxContextTokens(): number {
    const contextLimits: Record<string, number> = {
      "gemini-3-pro-preview": 2097152,
      "gemini-2.5-flash": 1048576,
      "gemini-2.5-pro": 2097152,
      "gemini-2.5-flash-lite": 1048576,
      "gemini-2.0-flash": 1048576,
      "gemini-2.0-flash-lite": 1048576,
      "gemini-1.5-pro": 2097152,
      "gemini-1.5-flash": 1048576,
    };
    return contextLimits[this.config.model] ?? 32768;
  }

  /**
   * Convert JSON Schema to Gemini's schema format.
   */
  private convertToGeminiSchema(
    jsonSchema: ReturnType<typeof zodToJsonSchema>,
  ): Record<string, unknown> {
    // Gemini uses a subset of JSON Schema
    // This is a simplified conversion
    const schema = jsonSchema as Record<string, unknown>;

    // Remove unsupported fields
    const cleaned = { ...schema };
    delete cleaned.$schema;
    delete cleaned.definitions;
    delete cleaned.$ref;

    return cleaned;
  }
}
