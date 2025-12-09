import { IFrameworkGenerator, FrameworkGeneratorMeta } from "../interfaces";

/**
 * Central registry for framework generators.
 * Supports dynamic registration and discovery of generators.
 */
export class GeneratorRegistry {
  private generators = new Map<string, IFrameworkGenerator>();

  /**
   * Register a framework generator
   * @throws Error if a generator with the same ID is already registered
   */
  register(generator: IFrameworkGenerator): void {
    const id = generator.meta.id;
    if (this.generators.has(id)) {
      throw new Error(`Generator already registered: ${id}`);
    }
    this.generators.set(id, generator);
  }

  /**
   * Unregister a generator by ID
   * @returns true if the generator was removed, false if not found
   */
  unregister(id: string): boolean {
    return this.generators.delete(id);
  }

  /**
   * Get generator by ID (e.g., "typescript:express")
   */
  get(id: string): IFrameworkGenerator | undefined {
    return this.generators.get(id);
  }

  /**
   * Check if a generator is registered
   */
  has(id: string): boolean {
    return this.generators.has(id);
  }

  /**
   * Find a generator by annotation target and framework.
   * Maps annotation like @backend(express) to the appropriate generator.
   *
   * @param target - The annotation name: "backend" or "frontend"
   * @param framework - The annotation value: "express", "react", etc.
   * @param language - Target language (default: "typescript")
   */
  findByAnnotation(
    target: "backend" | "frontend",
    framework: string,
    language: string = "typescript"
  ): IFrameworkGenerator | undefined {
    // Try exact match first: "typescript:express"
    const id = `${language}:${framework}`;
    const generator = this.generators.get(id);

    if (generator && generator.meta.target === target) {
      return generator;
    }

    // Fall back to searching all generators
    for (const gen of this.generators.values()) {
      if (
        gen.meta.language === language &&
        gen.meta.framework === framework &&
        gen.meta.target === target
      ) {
        return gen;
      }
    }

    return undefined;
  }

  /**
   * Get all registered generators matching optional criteria
   */
  findAll(filter?: {
    language?: string;
    target?: "backend" | "frontend" | "shared";
    framework?: string;
  }): IFrameworkGenerator[] {
    return Array.from(this.generators.values()).filter((g) => {
      if (filter?.language && g.meta.language !== filter.language) return false;
      if (filter?.target && g.meta.target !== filter.target) return false;
      if (filter?.framework && g.meta.framework !== filter.framework)
        return false;
      return true;
    });
  }

  /**
   * List metadata for all registered generators
   */
  list(): FrameworkGeneratorMeta[] {
    return Array.from(this.generators.values()).map((g) => g.meta);
  }

  /**
   * Clear all registered generators (useful for testing)
   */
  clear(): void {
    this.generators.clear();
  }

  /**
   * Get the number of registered generators
   */
  get size(): number {
    return this.generators.size;
  }
}

/**
 * Global singleton registry instance
 */
export const generatorRegistry = new GeneratorRegistry();
