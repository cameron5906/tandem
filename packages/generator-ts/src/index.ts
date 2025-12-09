import { TandemIR } from "@tandem-lang/compiler";
import { TypeScriptTypeMapper } from "./mappers";
import { TypeDeclarationEmitter } from "./emitters";

// Re-export interfaces for external use
export * from "./interfaces";

// Re-export implementations
export * from "./mappers";
export * from "./emitters";

// Re-export utilities
export { shorten } from "./utils/naming";

/**
 * Generate TypeScript code from Tandem IR.
 * This is the main entry point that preserves backward compatibility with the CLI.
 *
 * @param ir - The complete Tandem IR
 * @returns Generated TypeScript code as a string
 */
export function generateTypeScript(ir: TandemIR): string {
  const mapper = new TypeScriptTypeMapper();
  const emitter = new TypeDeclarationEmitter(mapper);
  const files = emitter.emit(ir);
  return files.map((f) => f.content).join("\n");
}
