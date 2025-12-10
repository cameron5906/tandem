import Anthropic from "@anthropic-ai/sdk";
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
 * Anthropic Claude LLM provider implementation.
 * Uses Claude's tool use with structured outputs beta.
 */
export class AnthropicProvider extends BaseProvider {
  readonly name = "anthropic";
  readonly supportedModels = [
    "claude-sonnet-4-5-20250929",
    "claude-opus-4-5-20251101",
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-20250514",
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20240229",
    "claude-3-haiku-20240307",
  ];

  private client: Anthropic;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.validateConfig();
    this.client = new Anthropic({
      apiKey: config.apiKey,
      timeout: config.timeout ?? 60000,
    });
  }

  protected validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error("Anthropic API key is required");
    }
  }

  async complete<T>(
    messages: LLMMessage[],
    schema: z.ZodSchema<T>,
    options?: LLMCompletionOptions,
  ): Promise<T> {
    return this.withRetry(async () => {
      // Extract system message
      const systemMessage = messages.find((m) => m.role === "system");
      const conversationMessages = messages.filter((m) => m.role !== "system");

      // Convert Zod schema to JSON Schema for tool definition
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jsonSchema = zodToJsonSchema(schema as any, "generated_code");

      const response = await this.client.messages.create(
        {
          model: this.config.model,
          max_tokens: options?.maxTokens ?? 4096,
          system: systemMessage?.content,
          messages: conversationMessages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          tools: [
            {
              name: "generate_code",
              description: "Generate code according to the schema",
              input_schema: jsonSchema as Anthropic.Tool.InputSchema,
            },
          ],
          tool_choice: { type: "tool", name: "generate_code" },
        },
        {
          headers: {
            "anthropic-beta": "structured-outputs-2025-11-13",
          },
        },
      );

      // Extract tool use result
      const toolUse = response.content.find(
        (block) =>
          block.type === "tool_use" && block.name === "generate_code",
      );

      if (!toolUse || toolUse.type !== "tool_use") {
        throw new Error("No tool use in Claude response");
      }

      // Parse and validate against schema
      return schema.parse(toolUse.input);
    });
  }

  async *stream(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
  ): AsyncIterable<LLMStreamChunk> {
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    const stream = this.client.messages.stream({
      model: this.config.model,
      max_tokens: options?.maxTokens ?? 4096,
      system: systemMessage?.content,
      messages: conversationMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield {
          content: event.delta.text,
          isComplete: false,
        };
      }
      if (event.type === "message_stop") {
        yield { content: "", isComplete: true };
      }
    }
  }

  estimateTokens(messages: LLMMessage[]): number {
    // Claude uses similar tokenization to GPT
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  getMaxContextTokens(): number {
    // Claude models have 200k context window
    return 200000;
  }
}
