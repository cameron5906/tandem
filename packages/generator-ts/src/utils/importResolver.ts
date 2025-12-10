/**
 * Import resolver for managing cross-module type references.
 */

import { IRTypeRef } from "@tandem-lang/compiler";
import { extractModulePath, getRelativeImportPath, moduleToDirectory } from "./modulePath";
import { shorten } from "./naming";

/**
 * Represents an import statement to be generated.
 */
export interface ImportStatement {
  /** Relative path to import from */
  from: string;
  /** Type names to import */
  types: string[];
  /** Whether these are type-only imports */
  isTypeOnly: boolean;
}

/**
 * Built-in primitive types that don't require imports.
 */
const PRIMITIVE_TYPES = new Set([
  "String",
  "Int",
  "Float",
  "Boolean",
  "UUID",
  "DateTime",
  "Email",
  "URL",
  "Date",
  "Time",
  "Timestamp",
  "JSON",
  "Void",
]);

/**
 * Tracks type locations and resolves cross-module imports.
 */
export class ImportResolver {
  /** Map of FQN to module path where the type is defined */
  private typeLocations = new Map<string, string>();

  /**
   * Register where a type is defined.
   * @param fqn - Fully qualified type name
   * @param modulePath - Module path where the type is defined
   */
  registerType(fqn: string, modulePath: string): void {
    this.typeLocations.set(fqn, modulePath);
  }

  /**
   * Register all types from an IR types map.
   * @param types - Map of FQN to IRType
   */
  registerTypes(types: Map<string, unknown>): void {
    for (const fqn of types.keys()) {
      const modulePath = extractModulePath(fqn);
      this.registerType(fqn, modulePath);
    }
  }

  /**
   * Get the module where a type is defined.
   * @param fqn - Fully qualified type name
   * @returns Module path or undefined if not found
   */
  getTypeModule(fqn: string): string | undefined {
    return this.typeLocations.get(fqn);
  }

  /**
   * Check if a type reference is a primitive (no import needed).
   * @param fqn - Type name to check
   */
  isPrimitive(fqn: string): boolean {
    return PRIMITIVE_TYPES.has(fqn);
  }

  /**
   * Collect all type references from an IRTypeRef (including nested generics).
   * @param typeRef - The type reference to analyze
   * @returns Array of FQNs referenced
   */
  collectTypeRefs(typeRef: IRTypeRef): string[] {
    const refs: string[] = [];

    if (typeRef.kind === "simple") {
      if (!this.isPrimitive(typeRef.fqn)) {
        refs.push(typeRef.fqn);
      }
    } else if (typeRef.kind === "generic") {
      // Recursively collect from type arguments
      for (const arg of typeRef.typeArgs) {
        refs.push(...this.collectTypeRefs(arg));
      }
    }

    return refs;
  }

  /**
   * Resolve imports needed for a module referencing external types.
   * @param currentModule - Module path of the file being generated
   * @param typeRefs - Type references used in this file
   * @returns Array of import statements grouped by source module
   */
  resolveImports(
    currentModule: string,
    typeRefs: IRTypeRef[]
  ): ImportStatement[] {
    // Collect all referenced FQNs
    const allRefs = new Set<string>();
    for (const ref of typeRefs) {
      for (const fqn of this.collectTypeRefs(ref)) {
        allRefs.add(fqn);
      }
    }

    // Group by source module
    const importsByModule = new Map<string, Set<string>>();

    for (const fqn of allRefs) {
      const sourceModule = this.getTypeModule(fqn);
      if (!sourceModule) {
        // Type not found - might be a built-in or error
        continue;
      }

      // Skip if in the same module
      if (sourceModule === currentModule) {
        continue;
      }

      if (!importsByModule.has(sourceModule)) {
        importsByModule.set(sourceModule, new Set());
      }
      importsByModule.get(sourceModule)!.add(shorten(fqn));
    }

    // Convert to ImportStatement array
    const imports: ImportStatement[] = [];
    const currentDir = moduleToDirectory(currentModule);

    for (const [sourceModule, types] of importsByModule) {
      const sourceDir = moduleToDirectory(sourceModule);
      const relativePath = getRelativeImportPath(currentDir, sourceDir);

      imports.push({
        from: relativePath,
        types: Array.from(types).sort(),
        isTypeOnly: true,
      });
    }

    // Sort imports by path for consistent output
    imports.sort((a, b) => a.from.localeCompare(b.from));

    return imports;
  }

  /**
   * Generate TypeScript import statement code.
   * @param imports - Import statements to generate
   * @returns TypeScript import code
   */
  generateImportCode(imports: ImportStatement[]): string {
    if (imports.length === 0) {
      return "";
    }

    let code = "";
    for (const imp of imports) {
      const typeKeyword = imp.isTypeOnly ? "type " : "";
      const typeList = imp.types.join(", ");
      code += `import ${typeKeyword}{ ${typeList} } from "${imp.from}";\n`;
    }

    return code;
  }

  /**
   * Resolve and generate import code in one step.
   * @param currentModule - Module path of the file being generated
   * @param typeRefs - Type references used in this file
   * @returns TypeScript import code
   */
  resolveAndGenerate(currentModule: string, typeRefs: IRTypeRef[]): string {
    const imports = this.resolveImports(currentModule, typeRefs);
    return this.generateImportCode(imports);
  }
}
