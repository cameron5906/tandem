/**
 * Types of validation errors.
 */
export type ValidationErrorType = "syntax" | "type" | "lint" | "schema";

/**
 * Types of validation warnings.
 */
export type ValidationWarningType = "style" | "performance" | "security";

/**
 * A validation error found in generated code.
 */
export interface ValidationError {
  /** Type of error */
  type: ValidationErrorType;
  /** Error message */
  message: string;
  /** Line number (1-indexed) if available */
  line?: number;
  /** Column number (1-indexed) if available */
  column?: number;
  /** Whether this error can be auto-fixed */
  fixable: boolean;
  /** Suggested fix if available */
  suggestedFix?: string;
}

/**
 * A validation warning found in generated code.
 */
export interface ValidationWarning {
  /** Type of warning */
  type: ValidationWarningType;
  /** Warning message */
  message: string;
  /** Line number (1-indexed) if available */
  line?: number;
}

/**
 * Result of code validation.
 */
export interface ValidationResult {
  /** Whether the code passed validation */
  valid: boolean;
  /** Validation errors found */
  errors: ValidationError[];
  /** Validation warnings found */
  warnings: ValidationWarning[];
}

/**
 * Code type for validation.
 */
export type CodeType = "typescript" | "tsx";

/**
 * Interface for validating generated code.
 */
export interface ICodeValidator {
  /**
   * Validate generated code.
   *
   * @param code - The code string to validate
   * @param codeType - Type of code (typescript or tsx)
   * @returns Validation result with errors and warnings
   */
  validate(code: string, codeType: CodeType): Promise<ValidationResult>;

  /**
   * Attempt to automatically fix validation errors.
   *
   * @param code - The code string to fix
   * @param errors - Errors to attempt to fix
   * @returns Fixed code or null if unable to fix
   */
  attemptFix(code: string, errors: ValidationError[]): Promise<string | null>;
}
