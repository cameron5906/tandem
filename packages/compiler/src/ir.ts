// Intermediate Representation (IR) for Tandem
// The IR uses fully qualified names and resolved type references

// IRTypeRef represents a resolved type reference
// All type names are fully qualified (e.g., "sample.project.User" or built-in "String")
export type IRTypeRef = IRSimpleTypeRef | IRGenericTypeRef;

export interface IRSimpleTypeRef {
  kind: "simple";
  fqn: string; // Fully qualified name: "String", "UUID", "sample.project.User"
}

export interface IRGenericTypeRef {
  kind: "generic";
  name: string; // Generic type name: "List", "Optional", "Map", "Result"
  typeArgs: IRTypeRef[]; // Resolved type arguments
}

// Helper to create simple type references
export function simpleType(fqn: string): IRSimpleTypeRef {
  return { kind: "simple", fqn };
}

// Helper to create generic type references
export function genericType(name: string, typeArgs: IRTypeRef[]): IRGenericTypeRef {
  return { kind: "generic", name, typeArgs };
}

// Serialize IRTypeRef to a string representation (for debugging/display)
export function typeRefToString(ref: IRTypeRef): string {
  if (ref.kind === "simple") {
    return ref.fqn;
  }
  const args = ref.typeArgs.map(typeRefToString).join(", ");
  return `${ref.name}<${args}>`;
}

// IRType represents a user-defined type in the IR
export type IRType =
  | { kind: "alias"; target: IRTypeRef }
  | { kind: "record"; fields: IRField[] };

export interface IRField {
  name: string;
  type: IRTypeRef;
}

// IRIntent represents a compiled intent declaration
export interface IRIntent {
  kind: "route";
  name: string; // Fully qualified name: "api.users.GetUser"
  inputType: { fields: IRField[] };
  outputType: IRTypeRef;
  spec?: string;
}

// IRAnnotation represents a module annotation
export interface IRAnnotation {
  name: string; // "backend", "frontend"
  value?: string; // "express", "react"
}

// IRModule represents a module with its annotations
export interface IRModule {
  name: string; // Fully qualified name: "api.users"
  annotations: IRAnnotation[];
}

// Component element types for semantic UI descriptions
export type IRComponentElement =
  | "card"
  | "form"
  | "list"
  | "table"
  | "modal"
  | "button"
  | "detail"
  | "dashboard";

// IRComponent represents a compiled component declaration
export interface IRComponent {
  name: string; // Fully qualified name: "app.users.UserCard"
  element: IRComponentElement;
  displays?: IRTypeRef;
  binds?: string; // FQN of bound intent
  actions?: string[]; // FQNs of action intents
  itemComponent?: string; // FQN of item component
  emptyState?: string;
  spec?: string;
}

// TandemIR is the complete intermediate representation
export interface TandemIR {
  modules: Map<string, IRModule>; // Key: fully qualified name
  types: Map<string, IRType>; // Key: fully qualified name
  intents: Map<string, IRIntent>; // Key: fully qualified name
  components: Map<string, IRComponent>; // Key: fully qualified name
}

// Create an empty IR
export function createEmptyIR(): TandemIR {
  return {
    modules: new Map(),
    types: new Map(),
    intents: new Map(),
    components: new Map(),
  };
}
