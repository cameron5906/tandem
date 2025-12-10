/**
 * @tandem-lang/llm - LLM-powered code generation for Tandem DSL
 *
 * This package provides a unified interface for AI-powered code generation
 * using multiple LLM providers (OpenAI, Anthropic, Gemini).
 */

// Interfaces
export type {
  // LLM Provider
  LLMMessage,
  LLMCompletionOptions,
  LLMStreamChunk,
  LLMProviderConfig,
  ILLMProvider,
  // Generation Context
  ResolvedTypeInfo,
  HttpMethod,
  HandlerGenerationContext,
  ComponentElementSemantics,
  ComponentGenerationContext,
  ComponentSummary,
  AppLayoutGenerationContext,
  IContextBuilder,
  // Prompt Templates
  GenerationTarget,
  PromptTemplateConfig,
  IPromptTemplate,
  IHandlerPromptTemplate,
  IComponentPromptTemplate,
  IAppLayoutPromptTemplate,
  // Code Validation
  ValidationErrorType,
  ValidationWarningType,
  ValidationError,
  ValidationWarning,
  ValidationResult,
  CodeType,
  ICodeValidator,
} from "./interfaces";

// Configuration
export {
  loadConfig,
  loadConfigFromEnv,
  loadConfigFromFile,
  validateConfig,
  getApiKeyForProvider,
  DEFAULT_MODELS,
  DEFAULT_LLM_CONFIG,
} from "./config";
export type { ProviderType, LLMConfig, TandemConfig } from "./config";

// Providers
export {
  BaseProvider,
  OpenAIProvider,
  AnthropicProvider,
  GeminiProvider,
  MockProvider,
  createProvider,
  createProviderFromConfig,
  getAvailableProviders,
} from "./providers";
export type {
  MockResponseConfig,
  ProviderFactoryConfig,
  ProviderInfo,
} from "./providers";

// Context Building
export {
  IRContextBuilder,
  contextBuilder,
  TypeResolver,
  typeResolver,
  IntentAnalyzer,
  intentAnalyzer,
  getElementSemantics,
  getAllElementSemantics,
} from "./context";
export type { IntentClassification } from "./context";

// Prompt Templates
export {
  PromptRegistry,
  promptRegistry,
  HandlerImplementationTemplate,
  ComponentJSXTemplate,
  AppLayoutTemplate,
} from "./prompts";

// Register default templates on import
import { promptRegistry as registry } from "./prompts";
import { HandlerImplementationTemplate as HandlerTemplate } from "./prompts";
import { ComponentJSXTemplate as ComponentTemplate } from "./prompts";
import { AppLayoutTemplate } from "./prompts";

registry.register(new HandlerTemplate());
registry.register(new ComponentTemplate());
registry.register(new AppLayoutTemplate());

// Validation
export {
  TypeScriptValidator,
  typeScriptValidator,
  CodeValidator,
  codeValidator,
  DEFAULT_VALIDATOR_CONFIG,
} from "./validation";
export type { CodeValidatorConfig } from "./validation";

// Output Schemas
export {
  HandlerOutputSchema,
  HandlerFileSchema,
  ComponentOutputSchema,
  ComponentFileSchema,
  FormComponentOutputSchema,
  AppLayoutOutputSchema,
} from "./schemas";
export type {
  HandlerOutput,
  HandlerFile,
  ComponentOutput,
  ComponentFile,
  FormComponentOutput,
  AppLayoutOutput,
} from "./schemas";

// Code Generation Pipeline
export {
  CodeGenerationPipeline,
  createPipeline,
  DEFAULT_PIPELINE_CONFIG,
} from "./generation";
export type {
  PipelineConfig,
  PipelineProgressEvent,
  PipelineProgressEventType,
  GenerationResult,
  HandlerCode,
  ComponentCode,
  AppLayoutCode,
} from "./generation";
