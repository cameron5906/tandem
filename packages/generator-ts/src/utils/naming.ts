/**
 * Extract the short name from a fully qualified name.
 * @param fqn - Fully qualified name (e.g., "sample.project.User")
 * @returns Short name (e.g., "User")
 */
export function shorten(fqn: string): string {
  if (!fqn.includes(".")) {
    return fqn;
  }
  return fqn.split(".").pop() || fqn;
}
