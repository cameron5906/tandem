import {
  ProgramNode,
  ModuleNode,
  TypeDeclNode,
  IntentDeclNode,
  FieldNode,
  TypeRefNode,
  ObjectTypeNode,
  TypeDefNode,
  SimpleTypeRefNode,
  GenericTypeRefNode,
  OptionalTypeRefNode,
  ArrayTypeRefNode,
  AnnotationNode,
} from "./ast";
import { parser } from "@tandem-lang/grammar";
import { Diagnostic } from "./diagnostics";
import { TreeCursor } from "@lezer/common";

export interface ParseResult {
  program: ProgramNode;
  diagnostics: Diagnostic[];
}

class Walker {
  private cursor: TreeCursor;

  constructor(
    private source: string,
    cursor: TreeCursor
  ) {
    this.cursor = cursor;
  }

  getText(node: { from: number; to: number } = this.cursor): string {
    return this.source.slice(node.from, node.to);
  }

  walk(): ProgramNode {
    this.cursor.firstChild(); // Enter Program

    const program: ProgramNode = {
      modules: [],
      types: [],
      intents: [],
    };

    do {
      switch (this.cursor.type.name) {
        case "ModuleDecl":
          program.modules.push(this.walkModule());
          break;
        case "TypeDecl":
          program.types.push(this.walkTypeDecl());
          break;
        case "IntentDecl":
          program.intents.push(this.walkIntentDecl());
          break;
      }
    } while (this.cursor.nextSibling());

    this.cursor.parent(); // Exit Program

    return program;
  }

  walkModule(): ModuleNode {
    const from = this.cursor.from;
    this.cursor.firstChild(); // Enter ModuleDecl

    // Collect annotations (zero or more before "module" keyword)
    const annotations: AnnotationNode[] = [];
    while (this.cursor.name === "Annotation") {
      annotations.push(this.walkAnnotation());
      this.cursor.nextSibling();
    }

    // Now we're at the "module" keyword, skip to QualifiedIdentifier
    this.cursor.nextSibling();

    const node: ModuleNode = {
      name: this.getText(),
      annotations,
      span: { from, to: this.cursor.to },
    };

    this.cursor.parent(); // Exit ModuleDecl
    return node;
  }

  walkAnnotation(): AnnotationNode {
    const from = this.cursor.from;
    const to = this.cursor.to;

    this.cursor.firstChild(); // Enter Annotation -> At token
    this.cursor.nextSibling(); // -> Identifier (annotation name)

    const name = this.getText();
    let value: string | undefined;

    // Check for AnnotationArgs
    if (this.cursor.nextSibling() && this.cursor.name === "AnnotationArgs") {
      this.cursor.firstChild(); // Enter AnnotationArgs -> LParen
      this.cursor.nextSibling(); // -> AnnotationValue

      this.cursor.firstChild(); // Enter AnnotationValue -> Identifier or String
      value = this.getText();
      // Strip quotes if it's a string
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      this.cursor.parent(); // Exit AnnotationValue
      this.cursor.parent(); // Exit AnnotationArgs
    }

    this.cursor.parent(); // Exit Annotation

    return { name, value, span: { from, to } };
  }

  walkTypeDecl(): TypeDeclNode {
    const from = this.cursor.from,
      to = this.cursor.to;

    this.cursor.firstChild(); // Enter TypeDecl -> Identifier
    const name = this.getText();
    this.cursor.nextSibling(); // -> anonymous definition node

    const defSpan = { from: this.cursor.from, to: this.cursor.to };
    let def: TypeDefNode;

    this.cursor.firstChild(); // Enter anonymous node

    if (this.cursor.name === "Equals") {
      this.cursor.nextSibling(); // -> TypeRef
      def = {
        kind: "alias",
        target: this.walkTypeRef(),
        span: { from: this.cursor.from, to: this.cursor.to },
      };
    } else {
      // on LBrace
      const fields: FieldNode[] = [];
      while (this.cursor.nextSibling() && this.cursor.name !== "RBrace") {
        // Now cursor is on a FieldDecl
        fields.push(this.walkField());
      }
      def = { kind: "record", fields, span: defSpan };
    }

    this.cursor.parent(); // Exit anonymous

    return { name, def, span: { from, to } };
  }

  walkIntentDecl(): IntentDeclNode {
    const from = this.cursor.from,
      to = this.cursor.to;

    this.cursor.firstChild(); // Enter IntentDecl, land on Identifier
    const name = this.getText();

    let input: ObjectTypeNode | undefined;
    let output: TypeRefNode | undefined;
    let spec: string | undefined;

    this.cursor.nextSibling(); // From Identifier, move to LBrace

    // From LBrace, loop through siblings until RBrace
    while (this.cursor.nextSibling() && this.cursor.name !== "RBrace") {
      // We are on an IntentBodyProperty, enter it
      this.cursor.firstChild();
      let found = false;

      do {
        const currentNodeName = this.cursor.name as string;
        switch (currentNodeName) {
          case "ObjectType":
            input = this.walkObjectType();
            found = true;
            break;
          case "TypeRef":
            output = this.walkTypeRef();
            found = true;
            break;
          case "String":
            spec = this.getText().slice(1, -1);
            found = true;
            break;
        }
        if (found) break;
      } while (this.cursor.nextSibling());

      this.cursor.parent(); // Return to IntentBodyProperty
    }

    this.cursor.parent(); // Go back up from LBrace parent to IntentDecl

    if (!input || !output) {
      throw new Error("Intent must have input and output");
    }

    return {
      name,
      kind: "route",
      input,
      output,
      spec,
      span: { from, to },
    };
  }

  walkObjectType(): ObjectTypeNode {
    const from = this.cursor.from,
      to = this.cursor.to;

    const fields: FieldNode[] = [];
    this.cursor.firstChild(); // Enter LBrace

    while (this.cursor.nextSibling() && this.cursor.name === "FieldDecl") {
      fields.push(this.walkField());
    }

    this.cursor.parent();
    return { fields, span: { from, to } };
  }

  walkField(): FieldNode {
    const from = this.cursor.from,
      to = this.cursor.to;

    this.cursor.firstChild(); // Enter Field
    const name = this.getText();
    this.cursor.nextSibling(); // Colon
    this.cursor.nextSibling(); // TypeRef

    const type = this.walkTypeRef();
    this.cursor.parent();

    return { name, type, span: { from, to } };
  }

  // Walk a TypeRef node and return the appropriate TypeRefNode variant
  // Grammar: TypeRef { BaseTypeRef OptionalMarker? }
  walkTypeRef(): TypeRefNode {
    const from = this.cursor.from,
      to = this.cursor.to;

    this.cursor.firstChild(); // Enter TypeRef -> BaseTypeRef

    // Walk the base type (GenericTypeRef, ArrayTypeRef, or SimpleTypeRef)
    let baseType = this.walkBaseTypeRef();

    // Check for OptionalMarker sibling (the ? suffix)
    if (this.cursor.nextSibling() && this.cursor.name === "OptionalMarker") {
      // Wrap in OptionalTypeRefNode
      baseType = {
        kind: "optional",
        inner: baseType,
        span: { from, to },
      } as OptionalTypeRefNode;
    }

    this.cursor.parent(); // Exit TypeRef

    return baseType;
  }

  // Walk BaseTypeRef: GenericTypeRef | ArrayTypeRef | SimpleTypeRef
  private walkBaseTypeRef(): TypeRefNode {
    const from = this.cursor.from,
      to = this.cursor.to;

    this.cursor.firstChild(); // Enter BaseTypeRef -> variant

    let result: TypeRefNode;

    switch (this.cursor.name) {
      case "GenericTypeRef":
        result = this.walkGenericTypeRef();
        break;
      case "ArrayTypeRef":
        result = this.walkArrayTypeRef();
        break;
      case "SimpleTypeRef":
        result = this.walkSimpleTypeRef();
        break;
      default:
        // Fallback for backwards compatibility or unexpected nodes
        result = {
          kind: "simple",
          name: this.getText(),
          span: { from, to },
        } as SimpleTypeRefNode;
    }

    this.cursor.parent(); // Exit BaseTypeRef

    return result;
  }

  // Walk SimpleTypeRef: QualifiedIdentifier
  private walkSimpleTypeRef(): SimpleTypeRefNode {
    const from = this.cursor.from,
      to = this.cursor.to;

    this.cursor.firstChild(); // Enter SimpleTypeRef -> QualifiedIdentifier
    const name = this.getText();
    this.cursor.parent(); // Exit SimpleTypeRef

    return {
      kind: "simple",
      name,
      span: { from, to },
    };
  }

  // Walk GenericTypeRef: QualifiedIdentifier LAngle TypeArgList RAngle
  private walkGenericTypeRef(): GenericTypeRefNode {
    const from = this.cursor.from,
      to = this.cursor.to;

    this.cursor.firstChild(); // Enter GenericTypeRef -> QualifiedIdentifier
    const name = this.getText();

    this.cursor.nextSibling(); // -> LAngle
    this.cursor.nextSibling(); // -> TypeArgList

    const typeArgs: TypeRefNode[] = [];

    // Walk TypeArgList: TypeRef (Comma TypeRef)*
    this.cursor.firstChild(); // Enter TypeArgList -> first TypeRef

    do {
      if (this.cursor.name === "TypeRef") {
        typeArgs.push(this.walkTypeRef());
      }
      // Skip Comma tokens
    } while (this.cursor.nextSibling());

    this.cursor.parent(); // Exit TypeArgList

    this.cursor.parent(); // Exit GenericTypeRef

    return {
      kind: "generic",
      name,
      typeArgs,
      span: { from, to },
    };
  }

  // Walk ArrayTypeRef: QualifiedIdentifier LBracket RBracket
  private walkArrayTypeRef(): ArrayTypeRefNode {
    const from = this.cursor.from,
      to = this.cursor.to;

    this.cursor.firstChild(); // Enter ArrayTypeRef -> QualifiedIdentifier
    const elementName = this.getText();
    this.cursor.parent(); // Exit ArrayTypeRef

    // Create the element type as a SimpleTypeRefNode
    const element: SimpleTypeRefNode = {
      kind: "simple",
      name: elementName,
      span: { from, to },
    };

    return {
      kind: "array",
      element,
      span: { from, to },
    };
  }
}

export function parseTandem(source: string): ParseResult {
  const tree = parser.parse(source);
  const walker = new Walker(source, tree.cursor());
  const program = walker.walk();

  return {
    program,
    diagnostics: [],
  };
}
