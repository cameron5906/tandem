import ts from "typescript";
import type {
  ICodeValidator,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CodeType,
} from "../interfaces";

/**
 * Validates TypeScript and TSX code using the TypeScript compiler API.
 */
export class TypeScriptValidator implements ICodeValidator {
  /**
   * Validate TypeScript/TSX code for syntax errors.
   *
   * @param code - The code string to validate
   * @param codeType - Type of code (typescript or tsx)
   * @returns Validation result with errors and warnings
   */
  async validate(code: string, codeType: CodeType): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Determine script kind based on code type
    const scriptKind =
      codeType === "tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const fileName = codeType === "tsx" ? "generated.tsx" : "generated.ts";

    // Parse the code into a source file
    const sourceFile = ts.createSourceFile(
      fileName,
      code,
      ts.ScriptTarget.ESNext,
      true, // setParentNodes
      scriptKind,
    );

    // Collect syntax diagnostics
    const syntaxDiagnostics = this.collectSyntaxDiagnostics(sourceFile);

    for (const diagnostic of syntaxDiagnostics) {
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n",
      );

      if (diagnostic.start !== undefined && sourceFile) {
        const { line, character } =
          sourceFile.getLineAndCharacterOfPosition(diagnostic.start);

        errors.push({
          type: "syntax",
          message,
          line: line + 1, // 1-indexed
          column: character + 1, // 1-indexed
          fixable: false,
        });
      } else {
        errors.push({
          type: "syntax",
          message,
          fixable: false,
        });
      }
    }

    // For more thorough type checking, create a program
    const typeErrors = this.collectTypeErrors(code, fileName, scriptKind);
    errors.push(...typeErrors);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Attempt to automatically fix validation errors.
   * Currently only fixes simple issues like trailing semicolons.
   *
   * @param code - The code string to fix
   * @param errors - Errors to attempt to fix
   * @returns Fixed code or null if unable to fix
   */
  async attemptFix(
    code: string,
    errors: ValidationError[],
  ): Promise<string | null> {
    // Check if any errors are fixable
    const fixableErrors = errors.filter((e) => e.fixable && e.suggestedFix);

    if (fixableErrors.length === 0) {
      return null;
    }

    let fixedCode = code;

    // Apply fixes (in reverse order to preserve line numbers)
    for (const error of fixableErrors.reverse()) {
      if (error.suggestedFix) {
        // Simple replacement - in production this would be more sophisticated
        fixedCode = error.suggestedFix;
      }
    }

    return fixedCode !== code ? fixedCode : null;
  }

  /**
   * Collect syntax diagnostics from a parsed source file.
   */
  private collectSyntaxDiagnostics(
    sourceFile: ts.SourceFile,
  ): ts.DiagnosticWithLocation[] {
    const diagnostics: ts.DiagnosticWithLocation[] = [];

    // Walk the AST to find syntax errors
    const visit = (node: ts.Node) => {
      // Check for parse errors in the node's flags
      if (node.flags & ts.NodeFlags.ThisNodeHasError) {
        // Get any attached diagnostics
        const nodeDiagnostics = (node as unknown as { parseDiagnostics?: ts.DiagnosticWithLocation[] }).parseDiagnostics;
        if (nodeDiagnostics) {
          diagnostics.push(...nodeDiagnostics);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Also check the source file's own diagnostics
    const parseErrors = (
      sourceFile as unknown as { parseDiagnostics?: ts.DiagnosticWithLocation[] }
    ).parseDiagnostics;
    if (parseErrors) {
      diagnostics.push(...parseErrors);
    }

    return diagnostics;
  }

  /**
   * Collect type errors using a full TypeScript program.
   */
  private collectTypeErrors(
    code: string,
    fileName: string,
    scriptKind: ts.ScriptKind,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Create compiler options
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: scriptKind === ts.ScriptKind.TSX ? ts.JsxEmit.ReactJSX : undefined,
      strict: false, // Don't be too strict on generated code
      noEmit: true,
      skipLibCheck: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
    };

    // Create a virtual file system
    const files = new Map<string, string>();
    files.set(fileName, code);

    // Add minimal type definitions for common patterns
    const libContent = this.getMinimalLibDefinitions();
    files.set("lib.d.ts", libContent);

    // Create compiler host
    const host: ts.CompilerHost = {
      getSourceFile: (name, languageVersion) => {
        const content = files.get(name);
        if (content !== undefined) {
          return ts.createSourceFile(
            name,
            content,
            languageVersion,
            true,
            name.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
          );
        }
        return undefined;
      },
      getDefaultLibFileName: () => "lib.d.ts",
      writeFile: () => {},
      getCurrentDirectory: () => "/",
      getCanonicalFileName: (name) => name,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => "\n",
      fileExists: (name) => files.has(name),
      readFile: (name) => files.get(name),
    };

    // Create program
    const program = ts.createProgram([fileName], compilerOptions, host);

    // Get diagnostics
    const diagnostics = [
      ...program.getSyntacticDiagnostics(),
      // Skip semantic diagnostics for now - they require full type information
      // ...program.getSemanticDiagnostics(),
    ];

    const sourceFile = program.getSourceFile(fileName);

    for (const diagnostic of diagnostics) {
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n",
      );

      if (diagnostic.start !== undefined && sourceFile) {
        const { line, character } =
          sourceFile.getLineAndCharacterOfPosition(diagnostic.start);

        errors.push({
          type: "syntax",
          message,
          line: line + 1,
          column: character + 1,
          fixable: false,
        });
      } else {
        errors.push({
          type: "syntax",
          message,
          fixable: false,
        });
      }
    }

    return errors;
  }

  /**
   * Get minimal type definitions for validation without full lib.
   */
  private getMinimalLibDefinitions(): string {
    return `
// Minimal type definitions for validation
declare const console: { log(...args: any[]): void; error(...args: any[]): void; };
declare const Promise: PromiseConstructor;
declare const JSON: JSON;
declare const Array: ArrayConstructor;
declare const Object: ObjectConstructor;
declare const String: StringConstructor;
declare const Number: NumberConstructor;
declare const Boolean: BooleanConstructor;
declare const Error: ErrorConstructor;
declare const Date: DateConstructor;
declare const Map: MapConstructor;
declare const Set: SetConstructor;

// Express types
declare namespace Express {
  interface Request {
    body: any;
    query: any;
    params: any;
    headers: any;
  }
  interface Response {
    json(body: any): Response;
    status(code: number): Response;
    send(body?: any): Response;
  }
}

// React types
declare namespace React {
  type FC<P = {}> = (props: P) => JSX.Element | null;
  type ReactNode = JSX.Element | string | number | null | undefined;
  function useState<T>(initial: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  function useMemo<T>(factory: () => T, deps: any[]): T;
}

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
`;
  }
}

/**
 * Singleton instance for convenience.
 */
export const typeScriptValidator = new TypeScriptValidator();
