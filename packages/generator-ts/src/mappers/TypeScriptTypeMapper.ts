import { IRTypeRef, PRIMITIVE_TYPES } from "@tandem-lang/compiler";
import { ITypeMapper } from "../interfaces";
import { shorten } from "../utils/naming";

/**
 * TypeScript implementation of ITypeMapper.
 * Maps Tandem IR type references to TypeScript type strings.
 */
export class TypeScriptTypeMapper implements ITypeMapper {
  /**
   * Map an IR type reference to a TypeScript type string.
   */
  mapType(typeRef: IRTypeRef): string {
    if (typeRef.kind === "simple") {
      return this.mapSimpleType(typeRef.fqn);
    } else {
      return this.mapGenericType(typeRef.name, typeRef.typeArgs);
    }
  }

  /**
   * Map a simple type (FQN) to TypeScript.
   */
  private mapSimpleType(fqn: string): string {
    // Check if it's a built-in primitive type
    const builtin = PRIMITIVE_TYPES[fqn];
    if (builtin) {
      return builtin.tsType;
    }

    // User-defined type: use the short name (without module prefix)
    return shorten(fqn);
  }

  /**
   * Map a generic type to TypeScript.
   */
  private mapGenericType(name: string, typeArgs: IRTypeRef[]): string {
    const args = typeArgs.map((arg) => this.mapType(arg));

    switch (name) {
      case "Optional":
        // Optional<T> -> T | null
        return `${args[0]} | null`;

      case "List":
        // List<T> -> T[]
        // Use parentheses for complex types (unions, intersections)
        const elementType = args[0];
        if (elementType.includes("|") || elementType.includes("&")) {
          return `(${elementType})[]`;
        }
        return `${elementType}[]`;

      case "Map":
        // Map<K, V> -> Record<K, V>
        return `Record<${args[0]}, ${args[1]}>`;

      case "Result":
        // Result<T, E> -> { ok: true; value: T } | { ok: false; error: E }
        return `{ ok: true; value: ${args[0]} } | { ok: false; error: ${args[1]} }`;

      default:
        // Unknown generic type - pass through with TypeScript generic syntax
        return `${name}<${args.join(", ")}>`;
    }
  }
}
