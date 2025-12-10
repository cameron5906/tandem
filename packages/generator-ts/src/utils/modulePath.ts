/**
 * Module path utilities for organizing generated code by module structure.
 */

/**
 * Convert a fully qualified name to a directory path.
 * @param fqn - Fully qualified name (e.g., "api.users" or "domain.user.User")
 * @returns Directory path (e.g., "api/users" or "domain/user/User")
 */
export function fqnToPath(fqn: string): string {
  return fqn.replace(/\./g, "/");
}

/**
 * Extract the module path from a fully qualified name.
 * Removes the last segment (the item name) to get just the module path.
 * @param fqn - Fully qualified name (e.g., "api.users.GetUser")
 * @returns Module path (e.g., "api.users")
 */
export function extractModulePath(fqn: string): string {
  const parts = fqn.split(".");
  if (parts.length <= 1) {
    return fqn;
  }
  return parts.slice(0, -1).join(".");
}

/**
 * Calculate the relative import path between two module paths.
 * @param from - Source module path (e.g., "api/users")
 * @param to - Target module path (e.g., "domain/user")
 * @returns Relative path (e.g., "../../domain/user")
 */
export function getRelativeImportPath(from: string, to: string): string {
  // Normalize to use forward slashes
  const fromParts = from.replace(/\\/g, "/").split("/").filter(Boolean);
  const toParts = to.replace(/\\/g, "/").split("/").filter(Boolean);

  // Find common prefix length
  let commonLength = 0;
  while (
    commonLength < fromParts.length &&
    commonLength < toParts.length &&
    fromParts[commonLength] === toParts[commonLength]
  ) {
    commonLength++;
  }

  // Calculate how many levels to go up from 'from'
  const upCount = fromParts.length - commonLength;

  // Build the relative path
  const upPath = upCount > 0 ? "../".repeat(upCount) : "./";
  const downPath = toParts.slice(commonLength).join("/");

  if (!downPath) {
    // Same directory
    return ".";
  }

  return upPath + downPath;
}

/**
 * Group IR items by their module path.
 * @param items - Map of FQN to item
 * @returns Map of module path to Map of FQN to item
 */
export function groupByModule<T>(
  items: Map<string, T>
): Map<string, Map<string, T>> {
  const grouped = new Map<string, Map<string, T>>();

  for (const [fqn, item] of items) {
    const modulePath = extractModulePath(fqn);

    if (!grouped.has(modulePath)) {
      grouped.set(modulePath, new Map());
    }
    grouped.get(modulePath)!.set(fqn, item);
  }

  return grouped;
}

/**
 * Get all unique module paths from a TandemIR.
 * @param modules - Map of module names to IRModule
 * @returns Array of unique module paths
 */
export function getModulePaths(modules: Map<string, unknown>): string[] {
  return Array.from(modules.keys());
}

/**
 * Convert a module path (dot-separated) to a directory path (slash-separated).
 * @param modulePath - Module path (e.g., "api.users")
 * @returns Directory path (e.g., "api/users")
 */
export function moduleToDirectory(modulePath: string): string {
  return modulePath.replace(/\./g, "/");
}
