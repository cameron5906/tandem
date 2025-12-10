import {
  ProgramNode,
  TypeDeclNode,
  TypeDefNode,
  IntentDeclNode,
  TypeRefNode,
  ComponentDeclNode,
  ModuleNode,
} from "./ast";
import {
  TandemIR,
  IRIntent,
  IRType,
  IRTypeRef,
  IRField,
  IRComponent,
  IRComponentElement,
  simpleType,
  genericType,
} from "./ir";
import { Diagnostic } from "./diagnostics";
import {
  isPrimitiveType,
  isGenericType,
  getExpectedTypeParams,
} from "./types";
import { ANNOTATIONS } from "./languageMetadata";

export interface CompileResult {
  ir: TandemIR;
  diagnostics: Diagnostic[];
}

const ANNOTATION_ALLOWED_MAP: Record<string, string[]> = {};
for (const annotation of ANNOTATIONS) {
  if (annotation.allowedValues) {
    ANNOTATION_ALLOWED_MAP[annotation.name] = annotation.allowedValues;
  }
}

class Compiler {
  private ir: TandemIR = {
    modules: new Map(),
    types: new Map(),
    intents: new Map(),
    components: new Map(),
  };
  private diagnostics: Diagnostic[] = [];
  private currentModule: string = "";

  constructor(private program: ProgramNode) {}

  compile(): CompileResult {
    // Assumption: only one module per file for now
    if (this.program.modules.length > 0) {
      const module = this.program.modules[0];
      this.currentModule = module.name;

      this.validateModuleAnnotations(module);

      // Register module with its annotations
      this.ir.modules.set(module.name, {
        name: module.name,
        annotations: module.annotations.map((a) => ({
          name: a.name,
          value: a.value,
        })),
      });
    }

    // First pass: register all type names so they can be referenced.
    for (const type of this.program.types) {
      this.registerType(type);
    }

    // Second pass: process all intents.
    for (const intent of this.program.intents) {
      this.compileIntent(intent);
    }

    // Third pass: process all components.
    for (const component of this.program.components) {
      this.compileComponent(component);
    }

    return {
      ir: this.ir,
      diagnostics: this.diagnostics,
    };
  }

  private fqn(name: string): string {
    return this.currentModule ? `${this.currentModule}.${name}` : name;
  }

  private registerType(type: TypeDeclNode) {
    const fqn = this.fqn(type.name);
    if (this.ir.types.has(fqn)) {
      this.diagnostics.push({
        message: `Duplicate type declaration: ${fqn}`,
        from: type.span.from,
        to: type.span.to,
      });
      return;
    }
    this.ir.types.set(fqn, this.compileType(type.def));
  }

  private compileType(def: TypeDefNode): IRType {
    if (def.kind === "alias") {
      return {
        kind: "alias",
        target: this.resolveTypeRef(def.target),
      };
    } else {
      return {
        kind: "record",
        fields: def.fields.map((f): IRField => ({
          name: f.name,
          type: this.resolveTypeRef(f.type),
        })),
      };
    }
  }

  private compileIntent(intent: IntentDeclNode) {
    const fqn = this.fqn(intent.name);
    if (this.ir.intents.has(fqn)) {
      this.diagnostics.push({
        message: `Duplicate intent declaration: ${fqn}`,
        from: intent.span.from,
        to: intent.span.to,
      });
      return;
    }

    const irIntent: IRIntent = {
      name: fqn,
      kind: "route",
      inputType: {
        fields: intent.input.fields.map((f): IRField => ({
          name: f.name,
          type: this.resolveTypeRef(f.type),
        })),
      },
      outputType: this.resolveTypeRef(intent.output),
      spec: intent.spec,
    };

    this.ir.intents.set(fqn, irIntent);
  }

  private compileComponent(component: ComponentDeclNode) {
    const fqn = this.fqn(component.name);

    // Validate: check for duplicate component declarations
    if (this.ir.components.has(fqn)) {
      this.diagnostics.push({
        message: `Duplicate component declaration: ${fqn}`,
        from: component.span.from,
        to: component.span.to,
      });
      return;
    }

    // Validate: components can only be declared in @frontend modules
    if (!this.isInFrontendModule()) {
      this.diagnostics.push({
        message: `Component '${component.name}' can only be declared in @frontend modules`,
        from: component.span.from,
        to: component.span.to,
      });
      return;
    }

    // Resolve binds reference (intent binding)
    let resolvedBinds: string | undefined;
    if (component.binds) {
      resolvedBinds = this.resolveIntentRef(component.binds, component.span);
    }

    // Resolve actions references
    let resolvedActions: string[] | undefined;
    if (component.actions && component.actions.length > 0) {
      resolvedActions = [];
      for (const action of component.actions) {
        const resolved = this.resolveIntentRef(action, component.span);
        if (resolved) {
          resolvedActions.push(resolved);
        }
      }
    }

    // Resolve itemComponent reference
    let resolvedItemComponent: string | undefined;
    if (component.itemComponent) {
      // For now, just qualify the name - forward references are allowed
      resolvedItemComponent = this.fqn(component.itemComponent);
    }

    // Resolve displays type
    let resolvedDisplays: IRTypeRef | undefined;
    if (component.displays) {
      resolvedDisplays = this.resolveTypeRef(component.displays);
    }

    // Semantic validation based on element type
    this.validateComponentSemantics(component, fqn);

    const irComponent: IRComponent = {
      name: fqn,
      element: component.element as IRComponentElement,
      displays: resolvedDisplays,
      binds: resolvedBinds,
      actions: resolvedActions,
      itemComponent: resolvedItemComponent,
      emptyState: component.emptyState,
      spec: component.spec,
    };

    this.ir.components.set(fqn, irComponent);
  }

  private isInFrontendModule(): boolean {
    const module = this.ir.modules.get(this.currentModule);
    if (!module) return false;
    return module.annotations.some((a) => a.name === "frontend");
  }

  private resolveIntentRef(
    name: string,
    span: { from: number; to: number }
  ): string | undefined {
    // Try as FQN first
    const fqn = this.fqn(name);
    if (this.ir.intents.has(fqn)) {
      return fqn;
    }

    // Try as already fully qualified
    if (this.ir.intents.has(name)) {
      return name;
    }

    this.diagnostics.push({
      message: `Cannot resolve intent reference: ${name}`,
      from: span.from,
      to: span.to,
    });
    return undefined;
  }

  private validateModuleAnnotations(module: ModuleNode) {
    for (const annotation of module.annotations) {
      const allowed = ANNOTATION_ALLOWED_MAP[annotation.name];
      if (annotation.value && allowed && !allowed.includes(annotation.value)) {
        this.diagnostics.push({
          message: `Invalid ${annotation.name} annotation value '${annotation.value}'. Expected one of: ${allowed.join(
            ", "
          )}`,
          from: annotation.span.from,
          to: annotation.span.to,
          severity: "error",
          code: `invalid-${annotation.name}-annotation`,
        });
      }
    }
  }

  private validateComponentSemantics(component: ComponentDeclNode, fqn: string) {
    switch (component.element) {
      case "form":
        if (!component.binds) {
          this.diagnostics.push({
            message: `Form component '${fqn}' must have a 'binds' property`,
            from: component.span.from,
            to: component.span.to,
          });
        }
        break;

      case "list":
      case "table":
        if (!component.displays) {
          this.diagnostics.push({
            message: `${component.element} component '${fqn}' must have a 'displays' property`,
            from: component.span.from,
            to: component.span.to,
          });
        }
        break;

      case "card":
      case "detail":
        if (!component.displays) {
          this.diagnostics.push({
            message: `${component.element} component '${fqn}' must have a 'displays' property`,
            from: component.span.from,
            to: component.span.to,
          });
        }
        break;
    }
  }

  // Resolve a TypeRefNode to an IRTypeRef
  // Handles all variants: simple, generic, optional, array
  private resolveTypeRef(ref: TypeRefNode): IRTypeRef {
    switch (ref.kind) {
      case "simple":
        return this.resolveSimpleTypeRef(ref.name, ref.span);

      case "generic":
        return this.resolveGenericTypeRef(
          ref.name,
          ref.typeArgs,
          ref.span
        );

      case "optional":
        // Desugar: T? -> Optional<T>
        return genericType("Optional", [this.resolveTypeRef(ref.inner)]);

      case "array":
        // Desugar: T[] -> List<T>
        return genericType("List", [this.resolveTypeRef(ref.element)]);
    }
  }

  // Resolve a simple type reference (e.g., "String", "UUID", "User")
  private resolveSimpleTypeRef(
    name: string,
    span: { from: number; to: number }
  ): IRTypeRef {
    // 1. Check if it's a built-in primitive type
    if (isPrimitiveType(name)) {
      return simpleType(name);
    }

    // 2. Check if it's a generic type used without type arguments (error)
    if (isGenericType(name)) {
      this.diagnostics.push({
        message: `Generic type '${name}' requires type arguments`,
        from: span.from,
        to: span.to,
      });
      return simpleType(`INVALID<${name}>`);
    }

    // 3. Check if it's a type in the current module
    const fqn = this.fqn(name);
    if (this.ir.types.has(fqn)) {
      return simpleType(fqn);
    }

    // 4. Check if it's already a fully qualified name
    if (this.ir.types.has(name)) {
      return simpleType(name);
    }

    // 5. Assume it's a fully qualified name if it contains a dot
    if (name.includes(".")) {
      return simpleType(name);
    }

    // 6. Unresolved type
    this.diagnostics.push({
      message: `Cannot resolve type: ${name}`,
      from: span.from,
      to: span.to,
    });
    return simpleType(`UNRESOLVED<${name}>`);
  }

  // Resolve a generic type reference (e.g., "List<String>", "Map<String, User>")
  private resolveGenericTypeRef(
    name: string,
    typeArgs: TypeRefNode[],
    span: { from: number; to: number }
  ): IRTypeRef {
    // Validate that it's a known generic type
    if (!isGenericType(name)) {
      // Could be a user-defined generic type (future feature)
      // For now, emit an error
      this.diagnostics.push({
        message: `Unknown generic type: ${name}`,
        from: span.from,
        to: span.to,
      });
      return simpleType(`INVALID<${name}>`);
    }

    // Validate type argument count
    const expectedParams = getExpectedTypeParams(name);
    if (typeArgs.length !== expectedParams) {
      this.diagnostics.push({
        message: `Type '${name}' expects ${expectedParams} type argument(s), got ${typeArgs.length}`,
        from: span.from,
        to: span.to,
      });
    }

    // Recursively resolve type arguments
    const resolvedArgs = typeArgs.map((arg) => this.resolveTypeRef(arg));

    return genericType(name, resolvedArgs);
  }
}

export function compileToIR(program: ProgramNode): CompileResult {
  const compiler = new Compiler(program);
  return compiler.compile();
}
