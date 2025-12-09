import {
  IFrameworkGenerator,
  FrameworkGeneratorMeta,
  GeneratorContext,
  GeneratorOutput,
} from "@tandem-lang/generator-core";
import { TypeScriptTypeMapper } from "../mappers";
import { TypeDeclarationEmitter } from "../emitters";

/**
 * Generator for shared TypeScript type definitions.
 * Generates types.ts with interfaces, type aliases, and intent input/output types.
 */
export class TypesGenerator implements IFrameworkGenerator {
  readonly meta: FrameworkGeneratorMeta = {
    id: "typescript:types",
    language: "typescript",
    framework: "types",
    target: "shared",
    description: "Generate TypeScript type definitions from Tandem IR",
    version: "0.1.0",
  };

  generate(context: GeneratorContext): GeneratorOutput {
    const mapper = new TypeScriptTypeMapper();
    const emitter = new TypeDeclarationEmitter(mapper, {
      includeIntentTypes: true,
    });

    const files = emitter.emit(context.ir);

    return {
      files: files.map((f) => ({
        path: f.filename,
        content: f.content,
      })),
    };
  }

  validate(context: GeneratorContext): string[] {
    const errors: string[] = [];

    if (context.ir.types.size === 0 && context.ir.intents.size === 0) {
      errors.push("No types or intents found in IR");
    }

    return errors;
  }
}
