import { TandemIR } from "@tandem-lang/compiler";

/**
 * Represents a generated code file with its path and content.
 */
export interface GeneratedCode {
  /** The filename or relative path for the generated file */
  filename: string;
  /** The generated code content */
  content: string;
}

/**
 * Strategy interface for emitting code from the Tandem IR.
 * Implement this interface to generate different types of code
 * (type declarations, route handlers, client SDKs, etc.)
 */
export interface ICodeEmitter {
  /**
   * Emit generated code files from the Tandem IR.
   * @param ir - The complete Tandem IR
   * @returns Array of generated code files
   */
  emit(ir: TandemIR): GeneratedCode[];
}
