import { ComponentElementType, TypeRefNode } from "./ast";

export interface KeywordMeta {
  label: string;
  detail: string;
  documentation: string;
  snippet?: string;
}

export interface PropertyMeta {
  name: string;
  detail: string;
  documentation?: string;
  snippet?: string;
}

export interface AnnotationMeta {
  name: string;
  documentation?: string;
  snippet?: string;
  allowedValues?: string[];
}

export interface ComponentElementMeta {
  name: ComponentElementType;
  description: string;
}

// Top-level constructs in a Tandem module.
export const TOP_LEVEL_KEYWORDS: KeywordMeta[] = [
  {
    label: "module",
    detail: "Declare a module",
    documentation: "Declares a module namespace for grouping related types, intents, and components.",
    snippet: "module ${1:name}",
  },
  {
    label: "type",
    detail: "Declare a record type",
    documentation: "Declares a record type with fields.",
    snippet: "type ${1:Name} {\n\t$0\n}",
  },
  {
    label: "type alias",
    detail: "Declare a type alias",
    documentation: "Declares a type alias to another type.",
    snippet: "type ${1:Name} = ${2:Type}",
  },
  {
    label: "intent route",
    detail: "Declare an API route",
    documentation: "Declares an HTTP route with input and output types.",
    snippet: "intent route ${1:Name} {\n\tinput: {\n\t\t$2\n\t}\n\toutput: ${3:Type}\n}",
  },
  {
    label: "component",
    detail: "Declare a UI component",
    documentation: "Declares a UI component with an element type.",
    snippet: "component ${1:Name} {\n\telement: ${2|card,form,list,table,modal,button,detail,dashboard|}\n\t$0\n}",
  },
];

// Properties valid inside an intent body.
export const INTENT_PROPERTIES: PropertyMeta[] = [
  {
    name: "input",
    detail: "Input type for the route",
    documentation: "Defines the input payload shape for the intent.",
    snippet: "input: {\n\t${1:field}: ${2:Type}\n}",
  },
  {
    name: "output",
    detail: "Output type for the route",
    documentation: "Defines the output payload type for the intent.",
    snippet: "output: ${1:Type}",
  },
  {
    name: "spec",
    detail: "OpenAPI specification",
    documentation: "OpenAPI-style description, e.g. GET /users/{id}.",
    snippet: 'spec: "${1:GET /path}"',
  },
];

// Properties valid inside a component body.
export const COMPONENT_PROPERTIES: PropertyMeta[] = [
  {
    name: "element",
    detail: "UI element type",
    documentation: "Selects the UI element type for the component.",
    snippet: "element: ${1|card,form,list,table,modal,button,detail,dashboard|}",
  },
  {
    name: "displays",
    detail: "Data type to display",
    documentation: "Type the component renders (cards, lists, tables, detail, dashboard).",
    snippet: "displays: ${1:Type}",
  },
  {
    name: "binds",
    detail: "Intent to bind form submission",
    documentation: "Intent the form submits when triggered.",
    snippet: "binds: ${1:IntentName}",
  },
  {
    name: "actions",
    detail: "Available actions/intents",
    documentation: "Array of intents a component can trigger.",
    snippet: "actions: [${1:Intent}]",
  },
  {
    name: "itemComponent",
    detail: "Component for list items",
    documentation: "Component used to render each list item.",
    snippet: "itemComponent: ${1:ComponentName}",
  },
  {
    name: "emptyState",
    detail: "Message when list is empty",
    documentation: "Fallback message shown for empty collections.",
    snippet: 'emptyState: "${1:No items found}"',
  },
  {
    name: "spec",
    detail: "Component specification",
    documentation: "Freeform specification text for the component.",
    snippet: 'spec: "${1:description}"',
  },
];

// Supported module annotations.
export const ANNOTATIONS: AnnotationMeta[] = [
  {
    name: "backend",
    documentation: "Marks a module for backend/server-side generation.",
    snippet: "backend(${1|express,fastify|})",
    allowedValues: ["express", "fastify"],
  },
  {
    name: "frontend",
    documentation: "Marks a module for frontend/client-side generation.",
    snippet: "frontend(${1|react,vue|})",
    allowedValues: ["react", "vue"],
  },
];

// Supported component element values.
export const COMPONENT_ELEMENTS: ComponentElementMeta[] = [
  { name: "card", description: "A card display for showing entity details" },
  { name: "form", description: "A form for user input, requires 'binds'" },
  { name: "list", description: "A list view, requires 'displays'" },
  { name: "table", description: "A table view, requires 'displays'" },
  { name: "modal", description: "A modal dialog" },
  { name: "button", description: "A button element" },
  { name: "detail", description: "A detail view, requires 'displays'" },
  { name: "dashboard", description: "A dashboard layout" },
];

// Short docs for keywords and properties, used for hover/help text.
export const KEYWORD_DOCS: Record<string, string> = {
  module: "Declares a module namespace for grouping related types, intents, and components.",
  type: "Declares a type alias or record type.",
  intent: "Declares an intent (API operation).",
  route: "Specifies that an intent is an HTTP route.",
  component: "Declares a UI component.",
  element: "Specifies the UI element type for a component.",
  displays: "Specifies the data type a component displays.",
  binds: "Specifies the intent a form component submits to.",
  actions: "Specifies the intents a component can trigger.",
  input: "Specifies the input type for an intent.",
  output: "Specifies the output type for an intent.",
  spec: "OpenAPI or descriptive specification string.",
  itemComponent: "Specifies the component used to render list items.",
  emptyState: "Message shown when a list is empty.",
  backend: "Marks a module for backend/server-side generation.",
  frontend: "Marks a module for frontend/client-side generation.",
};

// Convert an AST type reference to a display string.
export function astTypeRefToString(typeRef: TypeRefNode): string {
  switch (typeRef.kind) {
    case "simple":
      return typeRef.name;
    case "generic": {
      const args = typeRef.typeArgs.map((a) => astTypeRefToString(a)).join(", ");
      return `${typeRef.name}<${args}>`;
    }
    case "optional":
      return `${astTypeRefToString(typeRef.inner)}?`;
    case "array":
      return `${astTypeRefToString(typeRef.element)}[]`;
    default:
      return "unknown";
  }
}
