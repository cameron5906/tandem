import { IRTypeRef } from "@tandem-lang/compiler";

/**
 * Strategy interface for mapping IR type references to target language types.
 * Implement this interface to support different target languages (TypeScript, Python, Go, etc.)
 */
export interface ITypeMapper {
  /**
   * Map an IR type reference to a target language type string.
   * @param typeRef - The IR type reference to map
   * @returns The target language type representation
   */
  mapType(typeRef: IRTypeRef): string;
}
