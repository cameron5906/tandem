import { ProgramNode, Span, TypeRefNode } from "./ast";
import { astTypeRefToString } from "./languageMetadata";

export type SymbolKind = "module" | "type" | "field" | "intent" | "component";

export interface SymbolEntry {
  name: string;
  fqn: string;
  kind: SymbolKind;
  span: Span;
  containerFqn?: string;
  detail?: string;
}

/**
 * Build a flat symbol table from a Tandem AST.
 * Symbols include modules, types, intents, components, and record fields.
 */
export function buildSymbolTable(program: ProgramNode): SymbolEntry[] {
  const symbols: SymbolEntry[] = [];
  const currentModule = program.modules.length > 0 ? program.modules[0].name : "";

  // Modules
  for (const mod of program.modules) {
    symbols.push({
      name: mod.name,
      fqn: mod.name,
      kind: "module",
      span: mod.span,
    });
  }

  // Types (and fields)
  for (const type of program.types) {
    const fqn = qualify(currentModule, type.name);
    const typeSymbol: SymbolEntry = {
      name: type.name,
      fqn,
      kind: "type",
      span: type.span,
      detail: type.def.kind === "alias" ? "type alias" : "record type",
    };
    symbols.push(typeSymbol);

    if (type.def.kind === "record") {
      for (const field of type.def.fields) {
        symbols.push({
          name: field.name,
          fqn: `${fqn}.${field.name}`,
          kind: "field",
          span: field.span,
          containerFqn: fqn,
          detail: astTypeRefToString(field.type),
        });
      }
    }
  }

  // Intents
  for (const intent of program.intents) {
    const fqn = qualify(currentModule, intent.name);
    symbols.push({
      name: intent.name,
      fqn,
      kind: "intent",
      span: intent.span,
      detail: "route",
    });
  }

  // Components
  for (const comp of program.components) {
    const fqn = qualify(currentModule, comp.name);
    symbols.push({
      name: comp.name,
      fqn,
      kind: "component",
      span: comp.span,
      detail: `component (${comp.element})`,
    });
  }

  return symbols;
}

function qualify(moduleName: string, name: string): string {
  return moduleName ? `${moduleName}.${name}` : name;
}
