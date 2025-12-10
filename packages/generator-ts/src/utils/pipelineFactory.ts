import type { LLMProviderConfig } from "@tandem-lang/generator-core";
import {
  CodeGenerationPipeline,
  createProviderFromConfig,
  IRContextBuilder,
  MockProvider,
  type PipelineProgressEvent,
} from "@tandem-lang/llm";

/**
 * Default mock responses for testing.
 */
const DEFAULT_HANDLER_MOCK_RESPONSE = {
  implementation: 'res.json({ message: "Mock implementation" });',
  validation: "",
  imports: [],
};

const DEFAULT_COMPONENT_MOCK_RESPONSE = {
  jsx: "<div>Mock component</div>",
  hooks: [],
  handlers: [],
  imports: [],
};

const DEFAULT_APP_LAYOUT_MOCK_RESPONSE = {
  jsx: `<div className="min-h-screen bg-gray-100">
  <header className="bg-white shadow">
    <div className="max-w-7xl mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold text-gray-900">App</h1>
    </div>
  </header>
  <main className="max-w-7xl mx-auto py-6 px-4">
    <p>Welcome to your Tandem-generated app!</p>
  </main>
</div>`,
  hooks: [],
  handlers: [],
  stateDeclarations: [],
};

/**
 * Options for pipeline creation.
 */
export interface PipelineFactoryOptions {
  /**
   * Progress callback for generation events.
   */
  onProgress?: (event: PipelineProgressEvent) => void;
}

/**
 * Creates a CodeGenerationPipeline from LLM configuration.
 */
export function createPipelineFromConfig(
  llmConfig: LLMProviderConfig,
  options?: PipelineFactoryOptions
): CodeGenerationPipeline {
  // Map generator-core config to llm config format
  const providerConfig = {
    provider: llmConfig.provider,
    apiKey: llmConfig.apiKey,
    model: llmConfig.model,
  };

  const provider = createProviderFromConfig(providerConfig);
  const contextBuilder = new IRContextBuilder();

  // Set up default mock responses for testing
  if (llmConfig.provider === "mock" && provider instanceof MockProvider) {
    // Smart dynamic response that inspects the schema to return appropriate mock
    provider.setDynamicResponse((schemaDesc) => {
      // Check if this is an App layout generation
      if (
        schemaDesc?.includes("App layout") ||
        schemaDesc?.includes("app-layout") ||
        schemaDesc?.includes("stateDeclarations")
      ) {
        return DEFAULT_APP_LAYOUT_MOCK_RESPONSE;
      }
      // Check if this is a component generation
      if (schemaDesc?.includes("component") || schemaDesc?.includes("jsx")) {
        return DEFAULT_COMPONENT_MOCK_RESPONSE;
      }
      // Default to handler mock
      return DEFAULT_HANDLER_MOCK_RESPONSE;
    });
  }

  return new CodeGenerationPipeline(provider, contextBuilder, {
    maxRetries: llmConfig.maxRetries ?? 3,
    onProgress: options?.onProgress,
  });
}
