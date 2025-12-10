import type { TandemIR, IRIntent, IRComponent, IRTypeRef } from "@tandem-lang/compiler";
import type {
  IContextBuilder,
  HandlerGenerationContext,
  ComponentGenerationContext,
  AppLayoutGenerationContext,
  ComponentSummary,
  ResolvedTypeInfo,
} from "../interfaces";
import { TypeResolver } from "./TypeResolver";
import { IntentAnalyzer } from "./IntentAnalyzer";
import { getElementSemantics } from "./ElementSemantics";

/**
 * Builds rich generation context from Tandem IR.
 * This context provides the LLM with all necessary information
 * to generate appropriate implementations.
 */
export class IRContextBuilder implements IContextBuilder {
  private typeResolver: TypeResolver;
  private intentAnalyzer: IntentAnalyzer;

  constructor() {
    this.typeResolver = new TypeResolver();
    this.intentAnalyzer = new IntentAnalyzer();
  }

  /**
   * Build context for handler code generation.
   *
   * @param ir - The complete Tandem IR
   * @param intentFqn - Fully qualified name of the intent
   * @returns Handler generation context
   */
  buildHandlerContext(
    ir: TandemIR,
    intentFqn: string,
  ): HandlerGenerationContext {
    const intent = ir.intents.get(intentFqn);
    if (!intent) {
      throw new Error(`Intent not found: ${intentFqn}`);
    }

    // Resolve input type
    const inputType = this.resolveInputType(ir, intent);

    // Resolve output type
    const outputType = this.typeResolver.resolveType(ir, intent.outputType);

    // Get HTTP method and route path
    const httpMethod = this.intentAnalyzer.getHttpMethod(intent);
    const routePath = this.intentAnalyzer.generateRoutePath(intentFqn);

    // Collect related types
    const relatedTypes = this.collectRelatedTypesForHandler(ir, intent);

    // Get module name
    const moduleName = this.intentAnalyzer.extractModulePath(intentFqn);

    return {
      intent,
      inputType,
      outputType,
      httpMethod,
      routePath,
      relatedTypes,
      moduleName,
      spec: intent.spec,
    };
  }

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
  ): ComponentGenerationContext {
    const component = ir.components.get(componentFqn);
    if (!component) {
      throw new Error(`Component not found: ${componentFqn}`);
    }

    // Resolve display type if present
    const displayType = component.displays
      ? this.typeResolver.resolveType(ir, component.displays)
      : undefined;

    // Get bound intent if present
    const boundIntent = component.binds
      ? ir.intents.get(component.binds)
      : undefined;

    // Get action intents
    const actionIntents = (component.actions ?? [])
      .map((fqn) => ir.intents.get(fqn))
      .filter((intent): intent is IRIntent => intent !== undefined);

    // Collect related types
    const relatedTypes = this.collectRelatedTypesForComponent(ir, component);

    // Get module name
    const moduleName = this.extractModulePath(componentFqn);

    // Get element semantics
    const elementSemantics = getElementSemantics(component.element);

    return {
      component,
      displayType,
      boundIntent,
      actionIntents,
      relatedTypes,
      moduleName,
      spec: component.spec,
      elementSemantics,
    };
  }

  /**
   * Resolve a type reference to full type information.
   *
   * @param ir - The complete Tandem IR
   * @param typeRef - Type reference to resolve
   * @returns Resolved type information
   */
  resolveType(ir: TandemIR, typeRef: IRTypeRef): ResolvedTypeInfo {
    return this.typeResolver.resolveType(ir, typeRef);
  }

  /**
   * Build context for App layout generation.
   *
   * @param ir - The complete Tandem IR
   * @param appTitle - Application title
   * @returns App layout generation context
   */
  buildAppLayoutContext(ir: TandemIR, appTitle: string): AppLayoutGenerationContext {
    const components: ComponentSummary[] = [];
    const listComponents: ComponentSummary[] = [];
    const formComponents: ComponentSummary[] = [];
    const modalComponents: ComponentSummary[] = [];
    let hasDashboard = false;
    let moduleName = "";

    for (const [fqn, component] of ir.components) {
      // Extract module name from first component
      if (!moduleName) {
        moduleName = this.extractModulePath(fqn);
      }

      // Build component summary
      const summary: ComponentSummary = {
        name: this.extractShortName(fqn),
        fqn,
        element: component.element,
        displayType: component.displays
          ? this.getTypeShortName(component.displays)
          : undefined,
        bindsIntent: component.binds
          ? this.extractShortName(component.binds)
          : undefined,
        actions: component.actions?.map((a) => this.extractShortName(a)),
        spec: component.spec,
      };

      components.push(summary);

      // Categorize by element type
      if (component.element === "dashboard") {
        hasDashboard = true;
      } else if (component.element === "list" || component.element === "table") {
        listComponents.push(summary);
      } else if (component.element === "form") {
        formComponents.push(summary);
      } else if (component.element === "modal") {
        modalComponents.push(summary);
      }
    }

    return {
      appTitle,
      components,
      moduleName,
      hasDashboard,
      listComponents,
      formComponents,
      modalComponents,
    };
  }

  /**
   * Get the short name of a type reference.
   */
  private getTypeShortName(typeRef: IRTypeRef): string {
    if (typeRef.kind === "simple") {
      return this.extractShortName(typeRef.fqn);
    }
    // For generic types like List<User>, return "List<User>"
    if (typeRef.kind === "generic") {
      const innerTypes = typeRef.typeArgs
        .map((arg) => this.getTypeShortName(arg))
        .join(", ");
      return `${typeRef.name}<${innerTypes}>`;
    }
    return "unknown";
  }

  /**
   * Resolve the input type for an intent.
   * Creates a synthetic record type from the intent's input fields.
   */
  private resolveInputType(ir: TandemIR, intent: IRIntent): ResolvedTypeInfo {
    const shortName = this.extractShortName(intent.name);

    return {
      fqn: `${shortName}Input`,
      kind: "record",
      fields: intent.inputType.fields.map((field) => ({
        name: field.name,
        type: this.typeResolver.typeRefToTS(field.type),
        isOptional: this.isOptionalType(field.type),
      })),
      tsType: `${shortName}Input`,
    };
  }

  /**
   * Collect all related types for a handler.
   */
  private collectRelatedTypesForHandler(
    ir: TandemIR,
    intent: IRIntent,
  ): ResolvedTypeInfo[] {
    const types: ResolvedTypeInfo[] = [];
    const visited = new Set<string>();

    // Collect from input fields
    for (const field of intent.inputType.fields) {
      const related = this.typeResolver.collectRelatedTypes(ir, field.type);
      for (const type of related) {
        if (!visited.has(type.fqn)) {
          visited.add(type.fqn);
          types.push(type);
        }
      }
    }

    // Collect from output type
    const outputRelated = this.typeResolver.collectRelatedTypes(
      ir,
      intent.outputType,
    );
    for (const type of outputRelated) {
      if (!visited.has(type.fqn)) {
        visited.add(type.fqn);
        types.push(type);
      }
    }

    return types;
  }

  /**
   * Collect all related types for a component.
   */
  private collectRelatedTypesForComponent(
    ir: TandemIR,
    component: IRComponent,
  ): ResolvedTypeInfo[] {
    const types: ResolvedTypeInfo[] = [];
    const visited = new Set<string>();

    // Collect from display type
    if (component.displays) {
      const related = this.typeResolver.collectRelatedTypes(
        ir,
        component.displays,
      );
      for (const type of related) {
        if (!visited.has(type.fqn)) {
          visited.add(type.fqn);
          types.push(type);
        }
      }
    }

    // Collect from bound intent input type
    if (component.binds) {
      const intent = ir.intents.get(component.binds);
      if (intent) {
        for (const field of intent.inputType.fields) {
          const related = this.typeResolver.collectRelatedTypes(ir, field.type);
          for (const type of related) {
            if (!visited.has(type.fqn)) {
              visited.add(type.fqn);
              types.push(type);
            }
          }
        }
      }
    }

    return types;
  }

  /**
   * Check if a type is optional (Optional<T>).
   */
  private isOptionalType(typeRef: IRTypeRef): boolean {
    return typeRef.kind === "generic" && typeRef.name === "Optional";
  }

  /**
   * Extract short name from FQN.
   */
  private extractShortName(fqn: string): string {
    const parts = fqn.split(".");
    return parts[parts.length - 1];
  }

  /**
   * Extract module path from FQN.
   */
  private extractModulePath(fqn: string): string {
    const parts = fqn.split(".");
    return parts.slice(0, -1).join(".");
  }
}

/**
 * Singleton instance for convenience.
 */
export const contextBuilder = new IRContextBuilder();
