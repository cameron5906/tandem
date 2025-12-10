import type { IRIntent } from "@tandem-lang/compiler";
import type { HttpMethod } from "../interfaces";

/**
 * Intent classification result.
 */
export interface IntentClassification {
  /** Whether this is a read/query operation */
  isQuery: boolean;
  /** Whether this is a write/mutation operation */
  isMutation: boolean;
  /** HTTP method for this intent */
  httpMethod: HttpMethod;
  /** Operation category */
  category: "read" | "create" | "update" | "delete";
}

/**
 * Prefixes that indicate query/read operations.
 */
const QUERY_PREFIXES = [
  "Get",
  "List",
  "Search",
  "Find",
  "Fetch",
  "Load",
  "Read",
  "Query",
  "Lookup",
  "Check",
  "Validate",
  "Verify",
];

/**
 * Prefixes that indicate create operations.
 */
const CREATE_PREFIXES = ["Create", "Add", "Insert", "New", "Register", "Post"];

/**
 * Prefixes that indicate update operations.
 */
const UPDATE_PREFIXES = [
  "Update",
  "Edit",
  "Modify",
  "Set",
  "Change",
  "Patch",
  "Save",
  "Put",
];

/**
 * Prefixes that indicate delete operations.
 */
const DELETE_PREFIXES = ["Delete", "Remove", "Destroy", "Clear", "Cancel"];

/**
 * Analyzes intents to determine HTTP methods and operation semantics.
 */
export class IntentAnalyzer {
  /**
   * Classify an intent based on its name.
   *
   * @param intent - The intent to classify
   * @returns Classification result
   */
  classify(intent: IRIntent): IntentClassification {
    const shortName = this.extractShortName(intent.name);

    if (this.matchesPrefix(shortName, QUERY_PREFIXES)) {
      return {
        isQuery: true,
        isMutation: false,
        httpMethod: "GET",
        category: "read",
      };
    }

    if (this.matchesPrefix(shortName, CREATE_PREFIXES)) {
      return {
        isQuery: false,
        isMutation: true,
        httpMethod: "POST",
        category: "create",
      };
    }

    if (this.matchesPrefix(shortName, UPDATE_PREFIXES)) {
      return {
        isQuery: false,
        isMutation: true,
        httpMethod: "PUT",
        category: "update",
      };
    }

    if (this.matchesPrefix(shortName, DELETE_PREFIXES)) {
      return {
        isQuery: false,
        isMutation: true,
        httpMethod: "DELETE",
        category: "delete",
      };
    }

    // Default to POST for unknown operations
    return {
      isQuery: false,
      isMutation: true,
      httpMethod: "POST",
      category: "create",
    };
  }

  /**
   * Get the HTTP method for an intent.
   *
   * @param intent - The intent
   * @returns HTTP method
   */
  getHttpMethod(intent: IRIntent): HttpMethod {
    return this.classify(intent).httpMethod;
  }

  /**
   * Check if an intent is a query (read) operation.
   *
   * @param intent - The intent
   * @returns True if query
   */
  isQuery(intent: IRIntent): boolean {
    return this.classify(intent).isQuery;
  }

  /**
   * Check if an intent is a mutation (write) operation.
   *
   * @param intent - The intent
   * @returns True if mutation
   */
  isMutation(intent: IRIntent): boolean {
    return this.classify(intent).isMutation;
  }

  /**
   * Generate a route path from an intent name.
   *
   * @param intentFqn - Fully qualified intent name
   * @returns Route path (e.g., "/getUser")
   */
  generateRoutePath(intentFqn: string): string {
    const shortName = this.extractShortName(intentFqn);
    return "/" + this.toCamelCase(shortName);
  }

  /**
   * Extract the short name (without module prefix) from an FQN.
   */
  private extractShortName(fqn: string): string {
    const parts = fqn.split(".");
    return parts[parts.length - 1];
  }

  /**
   * Extract the module path from an FQN.
   */
  extractModulePath(fqn: string): string {
    const parts = fqn.split(".");
    return parts.slice(0, -1).join(".");
  }

  /**
   * Check if a name matches any of the given prefixes.
   */
  private matchesPrefix(name: string, prefixes: string[]): boolean {
    return prefixes.some((prefix) => name.startsWith(prefix));
  }

  /**
   * Convert PascalCase to camelCase.
   */
  private toCamelCase(name: string): string {
    return name.charAt(0).toLowerCase() + name.slice(1);
  }
}

/**
 * Singleton instance for convenience.
 */
export const intentAnalyzer = new IntentAnalyzer();
