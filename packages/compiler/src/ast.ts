export interface Span {
  from: number;
  to: number;
}

export interface ProgramNode {
  modules: ModuleNode[];
  types: TypeDeclNode[];
  intents: IntentDeclNode[];
}

export interface AnnotationNode {
  name: string; // "backend", "frontend"
  value?: string; // "express", "react"
  span: Span;
}

export interface ModuleNode {
  name: string; // "domain.user"
  annotations: AnnotationNode[];
  span: Span;
}

export interface TypeDeclNode {
  name: string;
  module?: ModuleNode;
  def: TypeDefNode;
  span: Span;
}

export type TypeDefNode =
  | { kind: "alias"; target: TypeRefNode; span: Span }
  | { kind: "record"; fields: FieldNode[]; span: Span };

export interface FieldNode {
  name: string;
  type: TypeRefNode;
  span: Span;
}

// TypeRefNode is a discriminated union supporting:
// - Simple types: String, UUID, domain.User
// - Generic types: List<String>, Map<String, User>
// - Optional shorthand: String? (desugars to Optional<String>)
// - Array shorthand: String[] (desugars to List<String>)
export type TypeRefNode =
  | SimpleTypeRefNode
  | GenericTypeRefNode
  | OptionalTypeRefNode
  | ArrayTypeRefNode;

// Simple type reference: String, UUID, domain.user.User
export interface SimpleTypeRefNode {
  kind: "simple";
  name: string;
  span: Span;
}

// Generic type reference: List<String>, Map<K, V>, Optional<T>, Result<T, E>
export interface GenericTypeRefNode {
  kind: "generic";
  name: string;
  typeArgs: TypeRefNode[];
  span: Span;
}

// Optional shorthand: String? (equivalent to Optional<String>)
export interface OptionalTypeRefNode {
  kind: "optional";
  inner: TypeRefNode;
  span: Span;
}

// Array shorthand: String[] (equivalent to List<String>)
export interface ArrayTypeRefNode {
  kind: "array";
  element: TypeRefNode;
  span: Span;
}

export interface IntentDeclNode {
  name: string;
  module?: ModuleNode;
  kind: "route";
  input: ObjectTypeNode;
  output: TypeRefNode;
  spec?: string;
  span: Span;
}

export interface ObjectTypeNode {
  fields: FieldNode[];
  span: Span;
}
