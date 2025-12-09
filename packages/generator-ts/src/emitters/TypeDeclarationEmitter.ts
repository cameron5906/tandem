import { TandemIR } from "@tandem-lang/compiler";
import { ICodeEmitter, GeneratedCode } from "../interfaces/ICodeEmitter";
import { ITypeMapper } from "../interfaces/ITypeMapper";
import { shorten } from "../utils/naming";

/**
 * Emits TypeScript type declarations (type aliases and interfaces) from Tandem IR.
 */
export class TypeDeclarationEmitter implements ICodeEmitter {
  constructor(private typeMapper: ITypeMapper) {}

  /**
   * Emit TypeScript type declarations from the IR.
   */
  emit(ir: TandemIR): GeneratedCode[] {
    let content = "";

    for (const [fqn, type] of ir.types) {
      const name = shorten(fqn);

      if (type.kind === "alias") {
        const targetType = this.typeMapper.mapType(type.target);
        content += `export type ${name} = ${targetType};\n`;
      } else {
        content += `export interface ${name} {\n`;
        for (const field of type.fields) {
          const fieldType = this.typeMapper.mapType(field.type);
          content += `  ${field.name}: ${fieldType};\n`;
        }
        content += `}\n`;
      }
      content += "\n";
    }

    return [{ filename: "types.ts", content }];
  }
}
