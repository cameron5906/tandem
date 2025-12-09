// Built-in type registry for Tandem language
// Defines all primitive and generic types available without explicit declaration

export interface BuiltinTypeInfo {
  name: string;
  description: string;
  tsType: string;
  category: "primitive" | "generic";
  typeParams?: number; // For generics: number of required type parameters
}

// Primitive types - atomic types with no type parameters
export const PRIMITIVE_TYPES: Record<string, BuiltinTypeInfo> = {
  // Core primitives
  String: {
    name: "String",
    description: "UTF-8 text",
    tsType: "string",
    category: "primitive",
  },
  Int: {
    name: "Int",
    description: "32-bit signed integer",
    tsType: "number",
    category: "primitive",
  },
  Float: {
    name: "Float",
    description: "64-bit floating point number",
    tsType: "number",
    category: "primitive",
  },
  Bool: {
    name: "Bool",
    description: "Boolean value (true or false)",
    tsType: "boolean",
    category: "primitive",
  },
  UUID: {
    name: "UUID",
    description: "Universally unique identifier",
    tsType: "string",
    category: "primitive",
  },
  DateTime: {
    name: "DateTime",
    description: "Date and time with timezone (ISO 8601)",
    tsType: "Date",
    category: "primitive",
  },

  // Extended primitives
  Decimal: {
    name: "Decimal",
    description: "Arbitrary precision decimal for financial calculations",
    tsType: "string",
    category: "primitive",
  },
  URL: {
    name: "URL",
    description: "Valid URL string",
    tsType: "string",
    category: "primitive",
  },
  Email: {
    name: "Email",
    description: "Valid email address",
    tsType: "string",
    category: "primitive",
  },
  Date: {
    name: "Date",
    description: "Date without time (ISO 8601 date)",
    tsType: "string",
    category: "primitive",
  },
  Time: {
    name: "Time",
    description: "Time without date (ISO 8601 time)",
    tsType: "string",
    category: "primitive",
  },
  Duration: {
    name: "Duration",
    description: "Time duration (ISO 8601 duration)",
    tsType: "string",
    category: "primitive",
  },
  JSON: {
    name: "JSON",
    description: "Arbitrary JSON value",
    tsType: "unknown",
    category: "primitive",
  },
};

// Generic types - types that require type parameters
export const GENERIC_TYPES: Record<string, BuiltinTypeInfo> = {
  Optional: {
    name: "Optional",
    description: "A value that may or may not be present",
    tsType: "T | null",
    category: "generic",
    typeParams: 1,
  },
  List: {
    name: "List",
    description: "An ordered collection of elements",
    tsType: "T[]",
    category: "generic",
    typeParams: 1,
  },
  Map: {
    name: "Map",
    description: "A key-value mapping",
    tsType: "Record<K, V>",
    category: "generic",
    typeParams: 2,
  },
  Result: {
    name: "Result",
    description: "A success or error result",
    tsType: "{ ok: true; value: T } | { ok: false; error: E }",
    category: "generic",
    typeParams: 2,
  },
};

// Combined lookup of all built-in types
export const ALL_BUILTIN_TYPES: Record<string, BuiltinTypeInfo> = {
  ...PRIMITIVE_TYPES,
  ...GENERIC_TYPES,
};

// Helper functions for type checking

export function isBuiltinType(name: string): boolean {
  return name in ALL_BUILTIN_TYPES;
}

export function isPrimitiveType(name: string): boolean {
  return name in PRIMITIVE_TYPES;
}

export function isGenericType(name: string): boolean {
  return name in GENERIC_TYPES;
}

export function getBuiltinType(name: string): BuiltinTypeInfo | undefined {
  return ALL_BUILTIN_TYPES[name];
}

export function getExpectedTypeParams(name: string): number {
  const info = GENERIC_TYPES[name];
  return info?.typeParams ?? 0;
}

// List of all primitive type names for reference
export const PRIMITIVE_TYPE_NAMES = Object.keys(PRIMITIVE_TYPES);

// List of all generic type names for reference
export const GENERIC_TYPE_NAMES = Object.keys(GENERIC_TYPES);
