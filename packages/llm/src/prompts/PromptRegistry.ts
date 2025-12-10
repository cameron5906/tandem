import type { IPromptTemplate, GenerationTarget } from "../interfaces";

/**
 * Central registry for prompt templates.
 * Supports versioning and runtime template switching.
 */
export class PromptRegistry {
  private templates = new Map<string, IPromptTemplate<unknown>>();

  /**
   * Register a prompt template.
   *
   * @param template - Template to register
   */
  register<T>(template: IPromptTemplate<T>): void {
    const key = this.makeKey(template.config.target, template.config.version);
    this.templates.set(key, template as IPromptTemplate<unknown>);

    // Also register as "latest" if this is a newer version
    const latestKey = this.makeKey(template.config.target, "latest");
    const existing = this.templates.get(latestKey);

    if (!existing || this.compareVersions(template.config.version, existing.config.version) > 0) {
      this.templates.set(latestKey, template as IPromptTemplate<unknown>);
    }
  }

  /**
   * Get a prompt template by target and optional version.
   *
   * @param target - Generation target
   * @param version - Version string (defaults to "latest")
   * @returns Template or undefined if not found
   */
  get<T>(target: GenerationTarget, version: string = "latest"): IPromptTemplate<T> | undefined {
    const key = this.makeKey(target, version);
    return this.templates.get(key) as IPromptTemplate<T> | undefined;
  }

  /**
   * Check if a template is registered.
   *
   * @param target - Generation target
   * @param version - Version string
   * @returns True if registered
   */
  has(target: GenerationTarget, version: string = "latest"): boolean {
    const key = this.makeKey(target, version);
    return this.templates.has(key);
  }

  /**
   * List all registered templates.
   *
   * @returns Array of template metadata
   */
  list(): Array<{ target: GenerationTarget; version: string; description: string }> {
    const results: Array<{
      target: GenerationTarget;
      version: string;
      description: string;
    }> = [];

    const seen = new Set<string>();

    for (const template of this.templates.values()) {
      const id = `${template.config.target}:${template.config.version}`;
      if (!seen.has(id) && template.config.version !== "latest") {
        seen.add(id);
        results.push({
          target: template.config.target,
          version: template.config.version,
          description: template.config.description,
        });
      }
    }

    return results;
  }

  /**
   * Clear all registered templates.
   */
  clear(): void {
    this.templates.clear();
  }

  /**
   * Create a registry key from target and version.
   */
  private makeKey(target: GenerationTarget, version: string): string {
    return `${target}:${version}`;
  }

  /**
   * Compare two version strings.
   * Returns positive if a > b, negative if a < b, 0 if equal.
   */
  private compareVersions(a: string, b: string): number {
    if (a === b) return 0;
    if (a === "latest") return 1;
    if (b === "latest") return -1;

    const aParts = a.split(".").map(Number);
    const bParts = b.split(".").map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] ?? 0;
      const bVal = bParts[i] ?? 0;
      if (aVal !== bVal) return aVal - bVal;
    }

    return 0;
  }
}

/**
 * Global prompt registry instance.
 */
export const promptRegistry = new PromptRegistry();
