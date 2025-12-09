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

/**
 * Convert a PascalCase name to camelCase.
 * @param name - PascalCase name (e.g., "GetUser")
 * @returns camelCase name (e.g., "getUser")
 */
export function toCamelCase(name: string): string {
  if (!name) return name;
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/**
 * Convert an intent name to a handler function name.
 * @param fqn - Fully qualified intent name (e.g., "api.tasks.GetTask")
 * @returns Handler name (e.g., "getTaskHandler")
 */
export function toHandlerName(fqn: string): string {
  const short = shorten(fqn);
  return toCamelCase(short) + "Handler";
}

/**
 * Convert an intent name to a hook function name.
 * @param fqn - Fully qualified intent name (e.g., "api.tasks.GetTask")
 * @returns Hook name (e.g., "useGetTask")
 */
export function toHookName(fqn: string): string {
  const short = shorten(fqn);
  return "use" + short;
}

/**
 * Convert an intent name to an API client method name.
 * @param fqn - Fully qualified intent name (e.g., "api.tasks.GetTask")
 * @returns API method name (e.g., "getTask")
 */
export function toApiMethodName(fqn: string): string {
  const short = shorten(fqn);
  return toCamelCase(short);
}

/**
 * Convert an intent name to a route path.
 * @param fqn - Fully qualified intent name (e.g., "api.tasks.GetTask")
 * @returns Route path (e.g., "/getTask")
 */
export function toRoutePath(fqn: string): string {
  const short = shorten(fqn);
  return "/" + toCamelCase(short);
}
