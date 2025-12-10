import type {
  TandemIR,
  IRTypeRef,
  IRType,
  IRField,
} from "@tandem-lang/compiler";
import { isPrimitiveType, isGenericType } from "@tandem-lang/compiler";
import type { ResolvedTypeInfo } from "../interfaces";

/**
 * Resolves IR type references to fully detailed type information
 * for consumption by LLM prompts.
 */
export class TypeResolver {
  /**
   * Resolve a type reference to full type information.
   *
   * @param ir - The complete Tandem IR
   * @param typeRef - Type reference to resolve
   * @returns Resolved type information
   */
  resolveType(ir: TandemIR, typeRef: IRTypeRef): ResolvedTypeInfo {
    if (typeRef.kind === "simple") {
      return this.resolveSimpleType(ir, typeRef.fqn);
    } else {
      return this.resolveGenericType(ir, typeRef);
    }
  }

  /**
   * Resolve a simple (non-generic) type reference.
   */
  private resolveSimpleType(ir: TandemIR, fqn: string): ResolvedTypeInfo {
    // Check if it's a primitive type
    if (isPrimitiveType(fqn)) {
      return {
        fqn,
        kind: "builtin",
        tsType: this.mapPrimitiveToTS(fqn),
      };
    }

    // Look up user-defined type
    const irType = ir.types.get(fqn);
    if (!irType) {
      // Unknown type - return as-is
      return {
        fqn,
        kind: "builtin",
        tsType: this.shortName(fqn),
      };
    }

    if (irType.kind === "alias") {
      return {
        fqn,
        kind: "alias",
        tsType: this.typeRefToString(irType.target),
      };
    } else {
      // Record type
      return {
        fqn,
        kind: "record",
        fields: irType.fields.map((field) => ({
          name: field.name,
          type: this.typeRefToString(field.type),
          isOptional: this.isOptionalType(field.type),
        })),
        tsType: this.shortName(fqn),
      };
    }
  }

  /**
   * Resolve a generic type reference.
   */
  private resolveGenericType(
    ir: TandemIR,
    typeRef: IRTypeRef & { kind: "generic" },
  ): ResolvedTypeInfo {
    // Generic types are resolved based on name

    return {
      fqn: this.typeRefToString(typeRef),
      kind: "builtin",
      tsType: this.genericToTS(typeRef),
    };
  }

  /**
   * Convert a type reference to a human-readable string.
   */
  typeRefToString(typeRef: IRTypeRef): string {
    if (typeRef.kind === "simple") {
      return typeRef.fqn;
    }

    const args = typeRef.typeArgs.map((arg) => this.typeRefToString(arg));
    return `${typeRef.name}<${args.join(", ")}>`;
  }

  /**
   * Map a primitive type to TypeScript type.
   */
  private mapPrimitiveToTS(name: string): string {
    const mapping: Record<string, string> = {
      String: "string",
      Int: "number",
      Float: "number",
      Bool: "boolean",
      Boolean: "boolean",
      UUID: "string",
      DateTime: "string",
      Date: "string",
      Time: "string",
      Duration: "string",
      Decimal: "string",
      URL: "string",
      Email: "string",
      JSON: "unknown",
    };
    return mapping[name] ?? name;
  }

  /**
   * Convert a generic type to TypeScript representation.
   */
  private genericToTS(typeRef: IRTypeRef & { kind: "generic" }): string {
    const name = typeRef.name;
    const args = typeRef.typeArgs.map((arg) => this.typeRefToTS(arg));

    switch (name) {
      case "Optional":
        return `${args[0]} | null`;
      case "List":
        return `${args[0]}[]`;
      case "Map":
        return `Record<${args[0]}, ${args[1]}>`;
      case "Result":
        return `{ ok: true; value: ${args[0]} } | { ok: false; error: ${args[1]} }`;
      default:
        return `${name}<${args.join(", ")}>`;
    }
  }

  /**
   * Convert a type reference to TypeScript type string.
   */
  typeRefToTS(typeRef: IRTypeRef): string {
    if (typeRef.kind === "simple") {
      if (isPrimitiveType(typeRef.fqn)) {
        return this.mapPrimitiveToTS(typeRef.fqn);
      }
      return this.shortName(typeRef.fqn);
    }
    return this.genericToTS(typeRef);
  }

  /**
   * Check if a type is optional (Optional<T>).
   */
  private isOptionalType(typeRef: IRTypeRef): boolean {
    return typeRef.kind === "generic" && typeRef.name === "Optional";
  }

  /**
   * Extract short name from FQN.
   */
  shortName(fqn: string): string {
    const parts = fqn.split(".");
    return parts[parts.length - 1];
  }

  /**
   * Collect all type references from a type reference (including nested).
   */
  collectTypeRefs(typeRef: IRTypeRef): IRTypeRef[] {
    const refs: IRTypeRef[] = [typeRef];

    if (typeRef.kind === "generic") {
      for (const arg of typeRef.typeArgs) {
        refs.push(...this.collectTypeRefs(arg));
      }
    }

    return refs;
  }

  /**
   * Collect all related types for a given type (transitively).
   */
  collectRelatedTypes(ir: TandemIR, typeRef: IRTypeRef): ResolvedTypeInfo[] {
    const visited = new Set<string>();
    const result: ResolvedTypeInfo[] = [];

    const collect = (ref: IRTypeRef) => {
      const fqn =
        ref.kind === "simple" ? ref.fqn : this.typeRefToString(ref);

      if (visited.has(fqn) || isPrimitiveType(fqn)) {
        return;
      }
      visited.add(fqn);

      if (ref.kind === "simple") {
        const irType = ir.types.get(ref.fqn);
        if (irType) {
          result.push(this.resolveType(ir, ref));

          // Recurse into fields for record types
          if (irType.kind === "record") {
            for (const field of irType.fields) {
              collect(field.type);
            }
          } else if (irType.kind === "alias") {
            collect(irType.target);
          }
        }
      } else {
        // Generic type - recurse into type arguments
        for (const arg of ref.typeArgs) {
          collect(arg);
        }
      }
    };

    collect(typeRef);
    return result;
  }
}

/**
 * Singleton instance for convenience.
 */
export const typeResolver = new TypeResolver();
