import type {
  ICodeValidator,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CodeType,
} from "../interfaces";
import { TypeScriptValidator } from "./TypeScriptValidator";

/**
 * Configuration for the code validator.
 */
export interface CodeValidatorConfig {
  /**
   * Whether to perform type checking (slower but more thorough).
   */
  typeCheck?: boolean;

  /**
   * Whether to enable strict mode.
   */
  strict?: boolean;

  /**
   * Custom validators to run in addition to built-in ones.
   */
  customValidators?: ICodeValidator[];
}

/**
 * Default configuration for the code validator.
 */
export const DEFAULT_VALIDATOR_CONFIG: CodeValidatorConfig = {
  typeCheck: false,
  strict: false,
  customValidators: [],
};

/**
 * Orchestrates code validation using multiple validators.
 *
 * This class combines TypeScript syntax validation with optional
 * custom validators to provide comprehensive code validation.
 */
export class CodeValidator implements ICodeValidator {
  private readonly tsValidator: TypeScriptValidator;
  private readonly config: CodeValidatorConfig;

  constructor(config: Partial<CodeValidatorConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATOR_CONFIG, ...config };
    this.tsValidator = new TypeScriptValidator();
  }

  /**
   * Validate code using all configured validators.
   *
   * @param code - The code string to validate
   * @param codeType - Type of code (typescript or tsx)
   * @returns Aggregated validation result
   */
  async validate(code: string, codeType: CodeType): Promise<ValidationResult> {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];

    // Run TypeScript validation first
    const tsResult = await this.tsValidator.validate(code, codeType);
    allErrors.push(...tsResult.errors);
    allWarnings.push(...tsResult.warnings);

    // Run custom validators if configured
    if (this.config.customValidators) {
      for (const validator of this.config.customValidators) {
        try {
          const result = await validator.validate(code, codeType);
          allErrors.push(...result.errors);
          allWarnings.push(...result.warnings);
        } catch (error) {
          // Log but don't fail on custom validator errors
          console.error("Custom validator error:", error);
        }
      }
    }

    // Add pattern-based checks
    const patternWarnings = this.checkPatterns(code, codeType);
    allWarnings.push(...patternWarnings);

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  /**
   * Attempt to fix validation errors.
   *
   * @param code - The code string to fix
   * @param errors - Errors to attempt to fix
   * @returns Fixed code or null if unable to fix
   */
  async attemptFix(
    code: string,
    errors: ValidationError[],
  ): Promise<string | null> {
    // Try TypeScript validator's fix first
    const tsFixed = await this.tsValidator.attemptFix(code, errors);
    if (tsFixed) {
      return tsFixed;
    }

    // Try custom validators
    for (const validator of this.config.customValidators ?? []) {
      const fixed = await validator.attemptFix(code, errors);
      if (fixed) {
        return fixed;
      }
    }

    return null;
  }

  /**
   * Check for common patterns that might indicate issues.
   */
  private checkPatterns(
    code: string,
    codeType: CodeType,
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check for TODO/FIXME comments
    const todoPattern = /\/\/\s*(TODO|FIXME|XXX|HACK):/gi;
    let match;
    while ((match = todoPattern.exec(code)) !== null) {
      const lineNumber = code.substring(0, match.index).split("\n").length;
      warnings.push({
        type: "style",
        message: `Found ${match[1]} comment`,
        line: lineNumber,
      });
    }

    // Check for console.log in production code (handlers)
    if (codeType === "typescript") {
      const consolePattern = /console\.(log|debug)\s*\(/g;
      while ((match = consolePattern.exec(code)) !== null) {
        const lineNumber = code.substring(0, match.index).split("\n").length;
        warnings.push({
          type: "performance",
          message: "console.log/debug found - consider removing for production",
          line: lineNumber,
        });
      }
    }

    // Check for empty catch blocks
    const emptyCatchPattern = /catch\s*\([^)]*\)\s*\{\s*\}/g;
    while ((match = emptyCatchPattern.exec(code)) !== null) {
      const lineNumber = code.substring(0, match.index).split("\n").length;
      warnings.push({
        type: "security",
        message: "Empty catch block - errors may be silently ignored",
        line: lineNumber,
      });
    }

    // Check for any type usage
    const anyPattern = /:\s*any\b/g;
    while ((match = anyPattern.exec(code)) !== null) {
      const lineNumber = code.substring(0, match.index).split("\n").length;
      warnings.push({
        type: "style",
        message: "Using 'any' type - consider using a more specific type",
        line: lineNumber,
      });
    }

    return warnings;
  }

  /**
   * Quick validation for syntax only.
   * Faster than full validation for quick checks.
   */
  async validateSyntaxOnly(
    code: string,
    codeType: CodeType,
  ): Promise<ValidationResult> {
    return this.tsValidator.validate(code, codeType);
  }

  /**
   * Format validation errors for display or LLM retry.
   */
  formatErrors(result: ValidationResult): string {
    if (result.valid) {
      return "Code validated successfully.";
    }

    const lines: string[] = [];
    lines.push("Validation failed with the following errors:\n");

    for (const error of result.errors) {
      const location =
        error.line !== undefined
          ? `Line ${error.line}${error.column !== undefined ? `, Column ${error.column}` : ""}: `
          : "";
      lines.push(`  - [${error.type.toUpperCase()}] ${location}${error.message}`);
    }

    if (result.warnings.length > 0) {
      lines.push("\nWarnings:");
      for (const warning of result.warnings) {
        const location =
          warning.line !== undefined ? `Line ${warning.line}: ` : "";
        lines.push(`  - [${warning.type.toUpperCase()}] ${location}${warning.message}`);
      }
    }

    return lines.join("\n");
  }
}

/**
 * Singleton instance with default configuration.
 */
export const codeValidator = new CodeValidator();
