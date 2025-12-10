import type {
  TandemIR,
  IRIntent,
  IRComponent,
  IRTypeRef,
} from "@tandem-lang/compiler";

/**
 * Resolved type information with full details for LLM context.
 */
export interface ResolvedTypeInfo {
  /** Fully qualified name */
  fqn: string;
  /** Type kind */
  kind: "alias" | "record" | "builtin";
  /** Fields for record types */
  fields?: Array<{
    name: string;
    type: string; // Human-readable type string
    isOptional: boolean;
    description?: string;
  }>;
  /** Generated TypeScript type representation */
  tsType: string;
}

/**
 * HTTP methods for intent classification.
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/**
 * Context for generating intent/route handler implementations.
 */
export interface HandlerGenerationContext {
  /** The intent being generated */
  intent: IRIntent;
  /** Resolved input type information */
  inputType: ResolvedTypeInfo;
  /** Resolved output type information */
  outputType: ResolvedTypeInfo;
  /** HTTP method for this route */
  httpMethod: HttpMethod;
  /** Route path (e.g., "/getUser") */
  routePath: string;
  /** Types referenced transitively by input/output */
  relatedTypes: ResolvedTypeInfo[];
  /** Module name containing this intent */
  moduleName: string;
  /** Natural language specification from DSL */
  spec?: string;
}

/**
 * Semantic information about component element types.
 */
export interface ComponentElementSemantics {
  /** Element type name */
  element: string;
  /** Purpose description (e.g., "Display data in a card layout") */
  purpose: string;
  /** Expected behaviors for this element type */
  expectedBehaviors: string[];
  /** Common implementation patterns */
  commonPatterns: string[];
}

/**
 * Context for generating component implementations.
 */
export interface ComponentGenerationContext {
  /** The component being generated */
  component: IRComponent;
  /** Resolved type being displayed (if any) */
  displayType?: ResolvedTypeInfo;
  /** Bound intent for form submission (if any) */
  boundIntent?: IRIntent;
  /** Action intents available to the component */
  actionIntents: IRIntent[];
  /** Types referenced by the component */
  relatedTypes: ResolvedTypeInfo[];
  /** Module name containing this component */
  moduleName: string;
  /** Natural language specification from DSL */
  spec?: string;
  /** Semantic information about the component element */
  elementSemantics: ComponentElementSemantics;
}

/**
 * Summary information about a component for App layout generation.
 */
export interface ComponentSummary {
  /** Short component name (e.g., "TaskCard") */
  name: string;
  /** Fully qualified name */
  fqn: string;
  /** Element type (card, form, list, modal, table, detail, dashboard) */
  element: string;
  /** Type being displayed (short name) */
  displayType?: string;
  /** Bound intent for forms (short name) */
  bindsIntent?: string;
  /** Action intent names */
  actions?: string[];
  /** Natural language specification */
  spec?: string;
}

/**
 * Context for generating App layout.
 */
export interface AppLayoutGenerationContext {
  /** Application title */
  appTitle: string;
  /** All generated components */
  components: ComponentSummary[];
  /** Module name */
  moduleName: string;
  /** Whether there's a dashboard component */
  hasDashboard: boolean;
  /** List/table components (display lists of data) */
  listComponents: ComponentSummary[];
  /** Form components */
  formComponents: ComponentSummary[];
  /** Modal components */
  modalComponents: ComponentSummary[];
}

/**
 * Builds rich context from IR for LLM consumption.
 */
export interface IContextBuilder {
  /**
   * Build context for handler code generation.
   *
   * @param ir - The complete Tandem IR
   * @param intentFqn - Fully qualified name of the intent
   * @returns Handler generation context
   */
  buildHandlerContext(ir: TandemIR, intentFqn: string): HandlerGenerationContext;

  /**
   * Build context for component code generation.
   *
   * @param ir - The complete Tandem IR
   * @param componentFqn - Fully qualified name of the component
   * @returns Component generation context
   */
  buildComponentContext(
    ir: TandemIR,
    componentFqn: string,
  ): ComponentGenerationContext;

  /**
   * Resolve a type reference to full type information.
   *
   * @param ir - The complete Tandem IR
   * @param typeRef - Type reference to resolve
   * @returns Resolved type information
   */
  resolveType(ir: TandemIR, typeRef: IRTypeRef): ResolvedTypeInfo;

  /**
   * Build context for App layout generation.
   *
   * @param ir - The complete Tandem IR
   * @param appTitle - Application title
   * @returns App layout generation context
   */
  buildAppLayoutContext(ir: TandemIR, appTitle: string): AppLayoutGenerationContext;
}
