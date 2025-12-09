import { generatorRegistry } from "@tandem-lang/generator-core";
import { TypesGenerator } from "./generators/TypesGenerator";
import { ExpressGenerator } from "./generators/ExpressGenerator";
import { ReactGenerator } from "./generators/ReactGenerator";

/**
 * Register all TypeScript generators with the global registry.
 * Call this function at startup before using the registry.
 */
export function registerAllGenerators(): void {
  // Shared types generator
  if (!generatorRegistry.has("typescript:types")) {
    generatorRegistry.register(new TypesGenerator());
  }

  // Express backend generator
  if (!generatorRegistry.has("typescript:express")) {
    generatorRegistry.register(new ExpressGenerator());
  }

  // React frontend generator
  if (!generatorRegistry.has("typescript:react")) {
    generatorRegistry.register(new ReactGenerator());
  }
}

/**
 * Get the list of all available TypeScript generators.
 */
export function getTypeScriptGenerators() {
  return [
    { id: "typescript:types", Generator: TypesGenerator },
    { id: "typescript:express", Generator: ExpressGenerator },
    { id: "typescript:react", Generator: ReactGenerator },
  ] as const;
}
