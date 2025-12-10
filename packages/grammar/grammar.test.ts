import { describe, it, expect } from 'vitest';
import { parser } from './src/index';
import {
  PRIMITIVE_TYPE_NAMES,
  GENERIC_TYPE_NAMES,
} from '@tandem-lang/compiler';

describe('@tandem-lang/grammar', () => {
  it('parses a simple module declaration', () => {
    const tree = parser.parse('module domain.user');
    const cursor = tree.cursor();
    expect(cursor.name).toBe('Program');

    // Move to the first child
    cursor.firstChild();

    expect(cursor.name).toBe('ModuleDecl');

    // Ensure there are no more siblings
    expect(cursor.nextSibling()).toBe(false);
  });

  describe('Component Declarations', () => {
    it('parses a basic component declaration', () => {
      const source = `component UserCard {
  element: card
}`;
      const tree = parser.parse(source);
      const cursor = tree.cursor();

      expect(cursor.name).toBe('Program');
      cursor.firstChild();
      expect(cursor.name).toBe('ComponentDecl');
    });

    it('parses component with displays property', () => {
      const source = `component UserCard {
  element: card
  displays: User
}`;
      const tree = parser.parse(source);
      const cursor = tree.cursor();

      cursor.firstChild(); // Program -> ComponentDecl
      expect(cursor.name).toBe('ComponentDecl');

      cursor.firstChild(); // ComponentDecl -> Identifier
      expect(cursor.name).toBe('Identifier');
      expect(source.slice(cursor.from, cursor.to)).toBe('UserCard');
    });

    it('parses component with binds property', () => {
      const source = `component CreateForm {
  element: form
  binds: CreateUser
}`;
      const tree = parser.parse(source);
      const cursor = tree.cursor();

      cursor.firstChild();
      expect(cursor.name).toBe('ComponentDecl');
    });

    it('parses component with actions array', () => {
      const source = `component UserCard {
  element: card
  displays: User
  actions: [EditUser, DeleteUser]
}`;
      const tree = parser.parse(source);
      const cursor = tree.cursor();

      cursor.firstChild();
      expect(cursor.name).toBe('ComponentDecl');

      // Navigate to find IdentifierList
      cursor.firstChild(); // Identifier
      cursor.nextSibling(); // LBrace

      let foundIdentifierList = false;
      while (cursor.nextSibling()) {
        if (cursor.name === 'ComponentBodyProperty') {
          cursor.firstChild();
          do {
            if (cursor.name === 'IdentifierList') {
              foundIdentifierList = true;
              break;
            }
          } while (cursor.nextSibling());
          cursor.parent();
          if (foundIdentifierList) break;
        }
      }

      expect(foundIdentifierList).toBe(true);
    });

    it('parses component with emptyState string', () => {
      const source = `component UserList {
  element: list
  displays: List<User>
  emptyState: "No users found"
}`;
      const tree = parser.parse(source);
      const cursor = tree.cursor();

      cursor.firstChild();
      expect(cursor.name).toBe('ComponentDecl');
    });

    it('parses component with spec property', () => {
      const source = `component UserCard {
  element: card
  displays: User
  spec: "A card showing user information"
}`;
      const tree = parser.parse(source);
      const cursor = tree.cursor();

      cursor.firstChild();
      expect(cursor.name).toBe('ComponentDecl');
    });

    it('parses component with itemComponent reference', () => {
      const source = `component UserList {
  element: list
  displays: List<User>
  itemComponent: UserCard
}`;
      const tree = parser.parse(source);
      const cursor = tree.cursor();

      cursor.firstChild();
      expect(cursor.name).toBe('ComponentDecl');
    });

    it('parses component with all properties', () => {
      const source = `component UserList {
  element: list
  displays: List<User>
  itemComponent: UserCard
  actions: [DeleteUser]
  emptyState: "No users"
  spec: "User list component"
}`;
      const tree = parser.parse(source);
      const cursor = tree.cursor();

      cursor.firstChild();
      expect(cursor.name).toBe('ComponentDecl');

      // Count ComponentBodyProperty nodes
      cursor.firstChild(); // Identifier
      cursor.nextSibling(); // LBrace

      let propertyCount = 0;
      while (cursor.nextSibling()) {
        if (cursor.name === 'ComponentBodyProperty') {
          propertyCount++;
        }
      }

      expect(propertyCount).toBe(6);
    });

    it('parses multiple components in sequence', () => {
      const source = `component UserCard {
  element: card
  displays: User
}

component UserList {
  element: list
  displays: List<User>
}`;
      const tree = parser.parse(source);
      const cursor = tree.cursor();

      cursor.firstChild(); // First ComponentDecl
      expect(cursor.name).toBe('ComponentDecl');

      cursor.nextSibling(); // Second ComponentDecl
      expect(cursor.name).toBe('ComponentDecl');
    });

    it('parses component alongside module and types', () => {
      const source = `@frontend(react)
module app.users

type User {
  id: UUID
  name: String
}

component UserCard {
  element: card
  displays: User
}`;
      const tree = parser.parse(source);
      const cursor = tree.cursor();

      // Should have ModuleDecl, TypeDecl, ComponentDecl
      cursor.firstChild();
      expect(cursor.name).toBe('ModuleDecl');

      cursor.nextSibling();
      expect(cursor.name).toBe('TypeDecl');

      cursor.nextSibling();
      expect(cursor.name).toBe('ComponentDecl');
    });

    it('parses component with generic type in displays', () => {
      const source = `component UserList {
  element: list
  displays: List<Optional<User>>
}`;
      const tree = parser.parse(source);
      const cursor = tree.cursor();

      cursor.firstChild();
      expect(cursor.name).toBe('ComponentDecl');
    });

    it('parses component with qualified identifier in binds', () => {
      const source = `component CreateForm {
  element: form
  binds: api.users.CreateUser
}`;
      const tree = parser.parse(source);
      const cursor = tree.cursor();

      cursor.firstChild();
      expect(cursor.name).toBe('ComponentDecl');
    });
  });

  describe('Type references', () => {
    it('accepts all compiler-defined primitive types', () => {
      for (const name of PRIMITIVE_TYPE_NAMES) {
        const source = `type T { f: ${name} }`;
        const tree = parser.parse(source);
        expect(tree.cursor().name).toBe('Program');
      }
    });

    it('accepts all compiler-defined generic types', () => {
      for (const name of GENERIC_TYPE_NAMES) {
        const source = `type T { f: ${name}<String${name === 'Map' || name === 'Result' ? ', Int' : ''}> }`;
        const tree = parser.parse(source);
        expect(tree.cursor().name).toBe('Program');
      }
    });

    it('accepts optional and array shorthand over primitives', () => {
      const source = `type T {
  maybe: String?
  many: Int[]
}`;
      const tree = parser.parse(source);
      expect(tree.cursor().name).toBe('Program');
    });
  });
});
