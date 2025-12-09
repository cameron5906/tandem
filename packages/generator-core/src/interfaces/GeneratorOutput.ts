/**
 * Represents a single generated file
 */
export interface GeneratedFile {
  /** Relative path from output root (e.g., "backend/routes/users.ts") */
  path: string;
  /** File content */
  content: string;
  /** Whether this file should overwrite existing (default: true) */
  overwrite?: boolean;
}

/**
 * Complete output from a generator
 */
export interface GeneratorOutput {
  /** Generated source files */
  files: GeneratedFile[];
  /** Runtime dependencies to add to package.json */
  dependencies?: Record<string, string>;
  /** Development dependencies to add to package.json */
  devDependencies?: Record<string, string>;
}
