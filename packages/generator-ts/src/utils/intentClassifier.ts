import { shorten } from "./naming";

/**
 * Classification of an intent for code generation purposes.
 */
export type IntentKind = "query" | "mutation";

/**
 * HTTP methods for REST API generation.
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/**
 * Result of classifying an intent by its name.
 */
export interface IntentClassification {
  /** Whether this is a query (read) or mutation (write) operation */
  kind: IntentKind;
  /** The HTTP method to use for this intent */
  method: HttpMethod;
}

/**
 * Query intent name prefixes (read operations).
 */
const QUERY_PREFIXES = ["Get", "List", "Search", "Find", "Fetch", "Load"];

/**
 * Create intent name prefixes (POST operations).
 */
const CREATE_PREFIXES = ["Create", "Add", "Insert", "New"];

/**
 * Update intent name prefixes (PUT operations).
 */
const UPDATE_PREFIXES = ["Update", "Edit", "Modify", "Set", "Change", "Patch"];

/**
 * Delete intent name prefixes (DELETE operations).
 */
const DELETE_PREFIXES = ["Delete", "Remove", "Destroy", "Clear"];

/**
 * Check if a name starts with any of the given prefixes.
 */
function startsWithAny(name: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => name.startsWith(prefix));
}

/**
 * Classify an intent by its fully-qualified name.
 *
 * Uses naming conventions to determine:
 * - Whether it's a query (read) or mutation (write)
 * - Which HTTP method to use
 *
 * @param fqn - Fully qualified intent name (e.g., "api.tasks.GetTask")
 * @returns Classification with kind and HTTP method
 */
export function classifyIntent(fqn: string): IntentClassification {
  const shortName = shorten(fqn);

  if (startsWithAny(shortName, QUERY_PREFIXES)) {
    return { kind: "query", method: "GET" };
  }

  if (startsWithAny(shortName, CREATE_PREFIXES)) {
    return { kind: "mutation", method: "POST" };
  }

  if (startsWithAny(shortName, UPDATE_PREFIXES)) {
    return { kind: "mutation", method: "PUT" };
  }

  if (startsWithAny(shortName, DELETE_PREFIXES)) {
    return { kind: "mutation", method: "DELETE" };
  }

  // Default to POST mutation for unrecognized patterns
  return { kind: "mutation", method: "POST" };
}

/**
 * Check if an intent is a query (read operation).
 */
export function isQueryIntent(fqn: string): boolean {
  return classifyIntent(fqn).kind === "query";
}

/**
 * Check if an intent is a mutation (write operation).
 */
export function isMutationIntent(fqn: string): boolean {
  return classifyIntent(fqn).kind === "mutation";
}
