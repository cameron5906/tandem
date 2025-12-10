import type { TandemIR } from "@tandem-lang/compiler";
import type {
  ILLMProvider,
  IContextBuilder,
  ICodeValidator,
  LLMMessage,
  HandlerGenerationContext,
  ComponentGenerationContext,
  AppLayoutGenerationContext,
  ValidationResult,
} from "../interfaces";
import { PromptRegistry, promptRegistry } from "../prompts";
import { CodeValidator, codeValidator } from "../validation";
import {
  HandlerOutputSchema,
  ComponentOutputSchema,
  AppLayoutOutputSchema,
  type HandlerOutput,
  type ComponentOutput,
  type AppLayoutOutput,
} from "../schemas";

/**
 * Configuration for the code generation pipeline.
 */
export interface PipelineConfig {
  /**
   * Maximum number of retry attempts for failed generations.
   * @default 3
   */
  maxRetries?: number;

  /**
   * Temperature for LLM completions.
   * @default 0.2
   */
  temperature?: number;

  /**
   * Maximum tokens for completions.
   * @default 4096
   */
  maxTokens?: number;

  /**
   * Whether to validate generated code.
   * @default true
   */
  validateCode?: boolean;

  /**
   * Callback for progress reporting.
   */
  onProgress?: (event: PipelineProgressEvent) => void;
}

/**
 * Default pipeline configuration.
 */
export const DEFAULT_PIPELINE_CONFIG: Required<
  Omit<PipelineConfig, "onProgress">
> = {
  maxRetries: 3,
  temperature: 0.2,
  maxTokens: 4096,
  validateCode: true,
};

/**
 * Progress event types.
 */
export type PipelineProgressEventType =
  | "generating"
  | "validating"
  | "retrying"
  | "success"
  | "error";

/**
 * Progress event for pipeline reporting.
 */
export interface PipelineProgressEvent {
  type: PipelineProgressEventType;
  target: string;
  attempt?: number;
  maxAttempts?: number;
  message?: string;
}

/**
 * Result of a code generation operation.
 */
export interface GenerationResult<T> {
  /**
   * Whether generation succeeded.
   */
  success: boolean;

  /**
   * Generated code if successful.
   */
  code?: T;

  /**
   * Error message if failed.
   */
  error?: string;

  /**
   * Validation result if code was validated.
   */
  validation?: ValidationResult;

  /**
   * Number of attempts made.
   */
  attempts: number;
}

/**
 * Generated handler code.
 */
export interface HandlerCode {
  /**
   * The complete handler implementation.
   */
  implementation: string;

  /**
   * Optional validation logic.
   */
  validation?: string;

  /**
   * Required imports.
   */
  imports?: string[];
}

/**
 * Generated component code.
 */
export interface ComponentCode {
  /**
   * The JSX content.
   */
  jsx: string;

  /**
   * React hooks used.
   */
  hooks?: string[];

  /**
   * Event handlers.
   */
  handlers?: Array<{ name: string; implementation: string }>;

  /**
   * Styles if any.
   */
  styles?: string;

  /**
   * Required imports.
   */
  imports?: string[];
}

/**
 * Generated App layout code.
 */
export interface AppLayoutCode {
  /**
   * The JSX content for the App component's return statement.
   */
  jsx: string;

  /**
   * React hooks used.
   */
  hooks?: string[];

  /**
   * Event handlers.
   */
  handlers?: Array<{ name: string; implementation: string }>;

  /**
   * State declarations (useState, etc.).
   */
  stateDeclarations?: string[];
}

/**
 * Main pipeline for LLM-powered code generation.
 *
 * This class orchestrates the process of:
 * 1. Building context from IR
 * 2. Constructing prompts from templates
 * 3. Calling the LLM for generation
 * 4. Validating generated code
 * 5. Retrying on failure with error feedback
 */
export class CodeGenerationPipeline {
  private readonly provider: ILLMProvider;
  private readonly contextBuilder: IContextBuilder;
  private readonly validator: ICodeValidator;
  private readonly registry: PromptRegistry;
  private readonly config: Required<Omit<PipelineConfig, "onProgress">> & {
    onProgress?: (event: PipelineProgressEvent) => void;
  };

  constructor(
    provider: ILLMProvider,
    contextBuilder: IContextBuilder,
    config: PipelineConfig = {},
    validator?: ICodeValidator,
    registry?: PromptRegistry,
  ) {
    this.provider = provider;
    this.contextBuilder = contextBuilder;
    this.validator = validator ?? codeValidator;
    this.registry = registry ?? promptRegistry;
    this.config = {
      ...DEFAULT_PIPELINE_CONFIG,
      ...config,
    };
  }

  /**
   * Generate a handler implementation for an intent.
   *
   * @param ir - The Tandem IR
   * @param intentFqn - Fully qualified name of the intent
   * @returns Generation result with handler code
   */
  async generateHandler(
    ir: TandemIR,
    intentFqn: string,
  ): Promise<GenerationResult<HandlerCode>> {
    this.emitProgress({ type: "generating", target: intentFqn });

    // Build context
    const context = this.contextBuilder.buildHandlerContext(ir, intentFqn);

    // Get template
    const template = this.registry.get<HandlerGenerationContext>(
      "handler-implementation",
    );
    if (!template) {
      return {
        success: false,
        error: "Handler implementation template not registered",
        attempts: 0,
      };
    }

    // Generate with retry
    return this.generateWithRetry<HandlerOutput, HandlerCode>(
      intentFqn,
      () => template.buildMessages(context),
      HandlerOutputSchema,
      "typescript",
      (output) => ({
        implementation: output.implementation,
        validation: output.validation ?? undefined,
        imports: output.imports ?? undefined,
      }),
    );
  }

  /**
   * Generate a component implementation.
   *
   * @param ir - The Tandem IR
   * @param componentFqn - Fully qualified name of the component
   * @returns Generation result with component code
   */
  async generateComponent(
    ir: TandemIR,
    componentFqn: string,
  ): Promise<GenerationResult<ComponentCode>> {
    this.emitProgress({ type: "generating", target: componentFqn });

    // Build context
    const context = this.contextBuilder.buildComponentContext(ir, componentFqn);

    // Get template
    const template = this.registry.get<ComponentGenerationContext>(
      "component-jsx",
    );
    if (!template) {
      return {
        success: false,
        error: "Component JSX template not registered",
        attempts: 0,
      };
    }

    // Generate with retry
    return this.generateWithRetry<ComponentOutput, ComponentCode>(
      componentFqn,
      () => template.buildMessages(context),
      ComponentOutputSchema,
      "tsx",
      (output) => ({
        jsx: output.jsx,
        hooks: output.hooks ?? undefined,
        handlers: output.handlers ?? undefined,
        styles: output.styles ?? undefined,
        imports: output.imports ?? undefined,
      }),
    );
  }

  /**
   * Generate an App layout that composes all components.
   *
   * @param ir - The Tandem IR
   * @param appTitle - Application title
   * @returns Generation result with App layout code
   */
  async generateAppLayout(
    ir: TandemIR,
    appTitle: string,
  ): Promise<GenerationResult<AppLayoutCode>> {
    this.emitProgress({ type: "generating", target: "App" });

    // Build context
    const context = this.contextBuilder.buildAppLayoutContext(ir, appTitle);

    // Get template
    const template = this.registry.get<AppLayoutGenerationContext>(
      "app-layout",
    );
    if (!template) {
      return {
        success: false,
        error: "App layout template not registered",
        attempts: 0,
      };
    }

    // Generate with retry
    return this.generateWithRetry<AppLayoutOutput, AppLayoutCode>(
      "App",
      () => template.buildMessages(context),
      AppLayoutOutputSchema,
      "tsx",
      (output) => ({
        jsx: output.jsx,
        hooks: output.hooks ?? undefined,
        handlers: output.handlers ?? undefined,
        stateDeclarations: output.stateDeclarations ?? undefined,
      }),
    );
  }

  /**
   * Core generation loop with retry logic.
   */
  private async generateWithRetry<TOutput, TCode>(
    target: string,
    buildMessages: () => LLMMessage[],
    schema: import("zod").ZodSchema<TOutput>,
    codeType: "typescript" | "tsx",
    transformOutput: (output: TOutput) => TCode,
  ): Promise<GenerationResult<TCode>> {
    let messages = buildMessages();
    let lastValidation: ValidationResult | undefined;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Call LLM
        const output = await this.provider.complete<TOutput>(messages, schema, {
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        });

        const code = transformOutput(output);

        // Validate if enabled
        if (this.config.validateCode) {
          this.emitProgress({ type: "validating", target });

          // Extract code to validate (implementation for handlers, jsx for components)
          const codeToValidate = this.extractCodeForValidation(code, codeType);
          lastValidation = await this.validator.validate(
            codeToValidate,
            codeType,
          );

          if (!lastValidation.valid) {
            // If this isn't the last attempt, retry with error feedback
            if (attempt < this.config.maxRetries) {
              this.emitProgress({
                type: "retrying",
                target,
                attempt: attempt + 1,
                maxAttempts: this.config.maxRetries,
                message: `Validation failed: ${lastValidation.errors.length} errors`,
              });

              // Append error feedback to messages for next attempt
              messages = [
                ...messages,
                {
                  role: "assistant",
                  content: JSON.stringify(output),
                },
                {
                  role: "user",
                  content: this.formatValidationFeedback(lastValidation),
                },
              ];
              continue;
            }

            // Last attempt failed
            this.emitProgress({
              type: "error",
              target,
              message: "Validation failed after all retry attempts",
            });

            return {
              success: false,
              code,
              error: `Validation failed: ${lastValidation.errors.map((e) => e.message).join("; ")}`,
              validation: lastValidation,
              attempts: attempt,
            };
          }
        }

        // Success
        this.emitProgress({ type: "success", target });

        return {
          success: true,
          code,
          validation: lastValidation,
          attempts: attempt,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // If this isn't the last attempt, retry
        if (attempt < this.config.maxRetries) {
          this.emitProgress({
            type: "retrying",
            target,
            attempt: attempt + 1,
            maxAttempts: this.config.maxRetries,
            message: errorMessage,
          });

          // Append error to messages for context
          messages = [
            ...messages,
            {
              role: "user",
              content: `The previous generation attempt failed with error: ${errorMessage}. Please try again.`,
            },
          ];
          continue;
        }

        // All attempts exhausted
        this.emitProgress({
          type: "error",
          target,
          message: errorMessage,
        });

        return {
          success: false,
          error: errorMessage,
          attempts: attempt,
        };
      }
    }

    // Should not reach here
    return {
      success: false,
      error: "Unexpected end of retry loop",
      attempts: this.config.maxRetries,
    };
  }

  /**
   * Extract the code string to validate from the generated output.
   */
  private extractCodeForValidation(
    code: unknown,
    codeType: "typescript" | "tsx",
  ): string {
    if (codeType === "tsx") {
      const componentCode = code as ComponentCode;
      // Build a complete component for validation
      const parts: string[] = [];

      if (componentCode.imports?.length) {
        parts.push(componentCode.imports.join("\n"));
      }

      if (componentCode.hooks?.length) {
        parts.push(componentCode.hooks.join("\n"));
      }

      if (componentCode.handlers?.length) {
        parts.push(
          componentCode.handlers.map((h) => h.implementation).join("\n"),
        );
      }

      // Wrap JSX in a function component for validation
      parts.push(`function Component() { return (${componentCode.jsx}); }`);

      return parts.join("\n\n");
    } else {
      const handlerCode = code as HandlerCode;
      // Build a complete handler for validation
      const parts: string[] = [];

      if (handlerCode.imports?.length) {
        parts.push(handlerCode.imports.join("\n"));
      }

      if (handlerCode.validation) {
        parts.push(handlerCode.validation);
      }

      // Wrap in async function for validation
      parts.push(
        `async function handler(req: any, res: any) { ${handlerCode.implementation} }`,
      );

      return parts.join("\n\n");
    }
  }

  /**
   * Format validation errors for LLM retry feedback.
   */
  private formatValidationFeedback(validation: ValidationResult): string {
    const lines: string[] = [
      "The generated code has validation errors. Please fix these issues and try again:\n",
    ];

    for (const error of validation.errors) {
      const location =
        error.line !== undefined
          ? `Line ${error.line}${error.column !== undefined ? `:${error.column}` : ""}: `
          : "";
      lines.push(`- [${error.type.toUpperCase()}] ${location}${error.message}`);
    }

    lines.push(
      "\nPlease regenerate the code addressing all the above errors. Ensure the code is syntactically valid TypeScript/TSX.",
    );

    return lines.join("\n");
  }

  /**
   * Emit a progress event if a handler is configured.
   */
  private emitProgress(event: PipelineProgressEvent): void {
    this.config.onProgress?.(event);
  }
}

/**
 * Create a pipeline with default configuration.
 */
export function createPipeline(
  provider: ILLMProvider,
  contextBuilder: IContextBuilder,
  config?: PipelineConfig,
): CodeGenerationPipeline {
  return new CodeGenerationPipeline(provider, contextBuilder, config);
}
