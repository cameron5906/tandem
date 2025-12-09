/**
 * Options for TypeScript code generators.
 */
export interface TypeScriptGeneratorOptions {
  /**
   * Generate project files (package.json, tsconfig.json, entry points).
   * @default true
   */
  includeProjectFiles?: boolean;

  /**
   * Project name for package.json.
   * @default derived from module name or "tandem-app"
   */
  projectName?: string;
}

/**
 * Default generator options.
 */
export const DEFAULT_GENERATOR_OPTIONS: Required<TypeScriptGeneratorOptions> = {
  includeProjectFiles: true,
  projectName: "tandem-app",
};
