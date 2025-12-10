# @tandem-lang/llm

LLM-powered code generation for the Tandem DSL. This package provides a unified interface for AI-powered code generation using multiple LLM providers (OpenAI, Anthropic, Gemini).

## Features

- **Multi-provider support**: OpenAI, Anthropic (Claude), and Google Gemini
- **Structured output**: Zod schemas ensure well-formed responses
- **Automatic validation**: TypeScript syntax checking with retry on failure
- **Context-aware prompts**: Builds rich context from Tandem IR
- **Configurable**: Environment variables, config files, or programmatic API

## Installation

```bash
pnpm add @tandem-lang/llm
```

## Quick Start

### Using with the CLI

Set up your LLM provider with the interactive wizard:

```bash
# Run the setup wizard
tandem setup

# Then generate code
tandem generate myapp.tdm -o ./output
```

Or use environment variables:

```bash
# Set your API key
export OPENAI_API_KEY=sk-...

# Generate code
tandem generate myapp.tdm -o ./output
```

### Programmatic Usage

```typescript
import {
  createProviderFromConfig,
  CodeGenerationPipeline,
  IRContextBuilder,
} from "@tandem-lang/llm";

// Create provider
const provider = createProviderFromConfig({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o",
});

// Create pipeline
const contextBuilder = new IRContextBuilder();
const pipeline = new CodeGenerationPipeline(provider, contextBuilder, {
  maxRetries: 3,
});

// Generate handler implementation
const result = await pipeline.generateHandler(ir, "api.users.GetUser");

if (result.success) {
  console.log(result.code);
} else {
  console.error(result.error);
}
```

## Configuration

### Environment Variables

```bash
# Provider selection (optional, defaults to openai)
TANDEM_LLM_PROVIDER=openai|anthropic|gemini|mock

# API keys (set based on provider)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...

# Optional settings
TANDEM_LLM_MODEL=gpt-4o
TANDEM_LLM_TEMPERATURE=0.2
TANDEM_LLM_MAX_RETRIES=3
TANDEM_LLM_TIMEOUT=60000
```

### Config File

Create `tandem.config.json` in your project root:

```json
{
  "llm": {
    "provider": "openai",
    "model": "gpt-4o",
    "temperature": 0.2,
    "maxRetries": 3
  }
}
```

The CLI will automatically detect and use this configuration.

### Priority Order

Configuration is loaded with the following priority (highest first):
1. CLI arguments (`--provider`, `--model`)
2. Environment variables
3. Config file
4. Default values

## Providers

### OpenAI

```typescript
const provider = createProviderFromConfig({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o", // or "gpt-4-turbo", "gpt-3.5-turbo"
});
```

### Anthropic (Claude)

```typescript
const provider = createProviderFromConfig({
  provider: "anthropic",
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-sonnet-4-20250514", // or "claude-3-opus-20240229"
});
```

### Google Gemini

```typescript
const provider = createProviderFromConfig({
  provider: "gemini",
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-2.0-flash", // or "gemini-1.5-pro"
});
```

### Mock Provider

For testing without API calls:

```typescript
const provider = createProviderFromConfig({
  provider: "mock",
});

// Returns deterministic placeholder implementations
```

## Architecture

### Context Building

The `IRContextBuilder` analyzes Tandem IR to build rich context for code generation:

```typescript
const contextBuilder = new IRContextBuilder();
const context = contextBuilder.buildHandlerContext(ir, "api.users.GetUser");

// Context includes:
// - Intent definition (HTTP method, path, request/response types)
// - Related type definitions
// - Module annotations
// - Semantic hints
```

### Prompt Templates

Built-in templates for common generation targets:

- **Handler Implementation**: Express route handlers with validation
- **Component JSX**: React components with hooks integration

Templates are registered in the `PromptRegistry` and can be extended:

```typescript
import { promptRegistry, IPromptTemplate } from "@tandem-lang/llm";

const customTemplate: IPromptTemplate = {
  name: "custom-handler",
  buildPrompt(context) {
    return `Generate a handler for ${context.intent.name}...`;
  },
};

promptRegistry.register(customTemplate);
```

### Validation

Generated code is automatically validated:

1. **Schema Validation**: Zod schemas ensure proper JSON structure
2. **TypeScript Syntax**: Code is parsed with TypeScript compiler API
3. **Retry Logic**: Invalid code triggers regeneration with error context

```typescript
const pipeline = new CodeGenerationPipeline(provider, contextBuilder, {
  maxRetries: 3, // Retry up to 3 times on validation failure
});
```

## API Reference

### Core Classes

#### `CodeGenerationPipeline`

Main orchestrator for code generation.

```typescript
class CodeGenerationPipeline {
  constructor(
    provider: ILLMProvider,
    contextBuilder: IContextBuilder,
    config?: PipelineConfig
  );

  generateHandler(ir: TandemIR, intentFqn: string): Promise<GenerationResult>;
  generateComponent(ir: TandemIR, componentFqn: string): Promise<GenerationResult>;
}
```

#### `IRContextBuilder`

Builds context from Tandem IR.

```typescript
class IRContextBuilder {
  buildHandlerContext(ir: TandemIR, intentFqn: string): HandlerContext;
  buildComponentContext(ir: TandemIR, componentFqn: string): ComponentContext;
}
```

### Provider Factory

```typescript
// Create from config object
const provider = createProviderFromConfig({
  provider: "openai",
  apiKey: "...",
  model: "gpt-4o",
});

// Or use loadConfig to get settings from env/file
import { loadConfig } from "@tandem-lang/llm";
const config = loadConfig();
const provider = createProviderFromConfig(config);
```

### Validation

```typescript
import { TypeScriptValidator, CodeValidator } from "@tandem-lang/llm";

// TypeScript syntax validation
const tsValidator = new TypeScriptValidator();
const syntaxResult = tsValidator.validate("const x: string = 123;");
// { valid: false, errors: [{ message: "Type 'number' is not assignable...", line: 1 }] }

// Full code validation (schema + syntax)
const codeValidator = new CodeValidator();
const result = await codeValidator.validate(code, HandlerOutputSchema);
```

## Progress Events

When using the pipeline, you can receive progress events:

```typescript
pipeline.onProgress = (event) => {
  console.log(`[${event.type}] ${event.target}: ${event.message}`);
  // generating | validating | retrying | success | error
};
```

## CLI Integration

The Tandem CLI provides commands for managing LLM configuration:

```bash
# Interactive setup wizard (recommended)
tandem setup

# Show current configuration
tandem config show

# List available providers
tandem config providers

# Remove stored credentials
tandem logout

# Generate code
tandem generate app.tdm -o ./output

# Override provider/model for a single run
tandem generate app.tdm --provider anthropic --model claude-sonnet-4-5-20250929
```

## License

MIT
