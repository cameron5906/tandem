import type {
  IHandlerPromptTemplate,
  PromptTemplateConfig,
  LLMMessage,
  HandlerGenerationContext,
  ResolvedTypeInfo,
} from "../../interfaces";

/**
 * Prompt template for generating Express handler implementations.
 */
export class HandlerImplementationTemplate implements IHandlerPromptTemplate {
  readonly config: PromptTemplateConfig = {
    id: "handler-implementation-v1",
    target: "handler-implementation",
    version: "1.0.0",
    description: "Generates Express route handler implementation code",
  };

  /**
   * Build the full message array for the LLM.
   */
  buildMessages(context: HandlerGenerationContext): LLMMessage[] {
    return [
      {
        role: "system",
        content: this.buildSystemPrompt(),
      },
      {
        role: "user",
        content: this.buildUserPrompt(context),
      },
    ];
  }

  /**
   * Estimate token count for this prompt.
   */
  estimateTokens(context: HandlerGenerationContext): number {
    const messages = this.buildMessages(context);
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * Build the system prompt establishing the AI's role and guidelines.
   */
  private buildSystemPrompt(): string {
    return `You are an expert TypeScript developer generating Express.js route handler implementations.

Your task is to generate the implementation body for route handlers based on the provided specification.

## Guidelines

### Code Quality
- Generate clean, production-ready TypeScript code
- Follow Express.js best practices
- Use async/await for asynchronous operations
- Include proper error handling with try/catch
- Add meaningful comments for complex logic

### Error Handling
- Validate input at the start of the handler
- Use appropriate HTTP status codes (400 for bad input, 404 for not found, 500 for server errors)
- Return structured error responses

### Database Operations
- Assume a database layer exists (use TODO comments for actual DB calls)
- Use descriptive variable names
- Keep database logic simple and focused

### Type Safety
- Use the provided input and output types
- Ensure return values match the output type
- Handle null/undefined appropriately

## Output Format

Return a JSON object with this structure:
{
  "implementation": "// The handler implementation code",
  "validation": "// Optional: Input validation code to run before main logic",
  "comments": ["Any important implementation notes"]
}

The implementation should be the code that goes INSIDE the handler function body.
Do NOT include the function signature, imports, or exports.
Use 2-space indentation.`;
  }

  /**
   * Build the user prompt with specific context.
   */
  private buildUserPrompt(context: HandlerGenerationContext): string {
    const {
      intent,
      inputType,
      outputType,
      httpMethod,
      routePath,
      relatedTypes,
      moduleName,
      spec,
    } = context;

    const parts: string[] = [
      "Generate the implementation for this Express route handler:",
      "",
      `## Intent: ${intent.name}`,
      `## HTTP Method: ${httpMethod}`,
      `## Route Path: ${routePath}`,
      `## Module: ${moduleName}`,
      "",
    ];

    // Specification
    if (spec) {
      parts.push("## Specification");
      parts.push(spec);
      parts.push("");
    }

    // Input type
    parts.push("## Input Type");
    parts.push("```typescript");
    parts.push(this.formatTypeInfo(inputType));
    parts.push("```");
    parts.push("");

    // Output type
    parts.push("## Output Type");
    parts.push("```typescript");
    parts.push(this.formatTypeInfo(outputType));
    parts.push("```");
    parts.push("");

    // Related types
    if (relatedTypes.length > 0) {
      parts.push("## Related Types");
      for (const type of relatedTypes) {
        parts.push("```typescript");
        parts.push(this.formatTypeInfo(type));
        parts.push("```");
      }
      parts.push("");
    }

    // Instructions based on HTTP method
    parts.push("## Instructions");
    if (httpMethod === "GET" || httpMethod === "DELETE") {
      parts.push(
        `1. Extract input from \`req.query\` (input is passed as query parameters)`,
      );
    } else {
      parts.push(`1. Extract input from \`req.body\` (input is passed as JSON body)`);
    }
    parts.push("2. Validate the input fields");
    parts.push("3. Implement the business logic described in the specification");
    parts.push(
      `4. Return a response using \`res.json()\` with the output type`,
    );
    parts.push("5. Handle errors with appropriate HTTP status codes");

    return parts.join("\n");
  }

  /**
   * Format type information for display in the prompt.
   */
  private formatTypeInfo(info: ResolvedTypeInfo): string {
    const shortName = info.fqn.split(".").pop() ?? info.fqn;

    if (info.kind === "record" && info.fields) {
      const fields = info.fields
        .map((f) => `  ${f.name}${f.isOptional ? "?" : ""}: ${f.type};`)
        .join("\n");
      return `interface ${shortName} {\n${fields}\n}`;
    }

    if (info.kind === "alias") {
      return `type ${shortName} = ${info.tsType};`;
    }

    return `type ${shortName} = ${info.tsType};`;
  }
}
