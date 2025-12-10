import { describe, it, expect } from "vitest";
import { TypeScriptValidator } from "./TypeScriptValidator";

describe("TypeScriptValidator", () => {
  const validator = new TypeScriptValidator();

  describe("validate - TypeScript", () => {
    it("validates correct TypeScript code", async () => {
      const code = `
function add(a: number, b: number): number {
  return a + b;
}
`;
      const result = await validator.validate(code, "typescript");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("detects missing closing brace", async () => {
      const code = `
function broken(x: number) {
  if (x > 0) {
    return x;
  // missing closing brace
}
`;
      const result = await validator.validate(code, "typescript");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe("syntax");
    });

    it("detects missing semicolon in strict contexts", async () => {
      const code = `const x = 5
const y = 10`;
      const result = await validator.validate(code, "typescript");

      // TypeScript allows missing semicolons, so this should pass
      expect(result.valid).toBe(true);
    });

    it("detects invalid syntax", async () => {
      const code = `
function test() {
  const x = ;
}
`;
      const result = await validator.validate(code, "typescript");

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.type === "syntax")).toBe(true);
    });

    it("validates async functions", async () => {
      const code = `
async function fetchData(): Promise<string> {
  const response = await fetch('/api/data');
  return response.text();
}
`;
      const result = await validator.validate(code, "typescript");

      expect(result.valid).toBe(true);
    });

    it("validates arrow functions", async () => {
      const code = `
const multiply = (a: number, b: number): number => a * b;
const greet = (name: string) => \`Hello, \${name}!\`;
`;
      const result = await validator.validate(code, "typescript");

      expect(result.valid).toBe(true);
    });

    it("validates interface declarations", async () => {
      const code = `
interface User {
  id: string;
  name: string;
  email?: string;
}

const user: User = { id: '1', name: 'John' };
`;
      const result = await validator.validate(code, "typescript");

      expect(result.valid).toBe(true);
    });

    it("validates type aliases", async () => {
      const code = `
type Status = 'pending' | 'active' | 'completed';
type UserRole = 'admin' | 'user' | 'guest';

const status: Status = 'active';
`;
      const result = await validator.validate(code, "typescript");

      expect(result.valid).toBe(true);
    });

    it("validates generic types", async () => {
      const code = `
function identity<T>(value: T): T {
  return value;
}

const result = identity<string>('hello');
`;
      const result = await validator.validate(code, "typescript");

      expect(result.valid).toBe(true);
    });

    it("provides line numbers for errors", async () => {
      const code = `const x = 1;
const y = 2;
const z = ;
const w = 4;`;
      const result = await validator.validate(code, "typescript");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Error should be on line 3
      expect(result.errors[0].line).toBe(3);
    });
  });

  describe("validate - TSX", () => {
    it("validates correct TSX code", async () => {
      const code = `
function Button({ label }: { label: string }) {
  return <button>{label}</button>;
}
`;
      const result = await validator.validate(code, "tsx");

      expect(result.valid).toBe(true);
    });

    it("validates JSX with fragments", async () => {
      const code = `
function List() {
  return (
    <>
      <div>Item 1</div>
      <div>Item 2</div>
    </>
  );
}
`;
      const result = await validator.validate(code, "tsx");

      expect(result.valid).toBe(true);
    });

    it("validates JSX with expressions", async () => {
      const code = `
function Greeting({ name }: { name: string }) {
  return (
    <div className="greeting">
      <h1>Hello, {name}!</h1>
      {name.length > 5 && <span>That's a long name!</span>}
    </div>
  );
}
`;
      const result = await validator.validate(code, "tsx");

      expect(result.valid).toBe(true);
    });

    it("validates JSX with map", async () => {
      const code = `
function UserList({ users }: { users: { id: string; name: string }[] }) {
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
`;
      const result = await validator.validate(code, "tsx");

      expect(result.valid).toBe(true);
    });

    it("detects unclosed JSX tags", async () => {
      const code = `
function Broken() {
  return (
    <div>
      <span>unclosed
    </div>
  );
}
`;
      const result = await validator.validate(code, "tsx");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("validates React hooks", async () => {
      const code = `
import { useState, useEffect } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('Count:', count);
  }, [count]);

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
`;
      const result = await validator.validate(code, "tsx");

      expect(result.valid).toBe(true);
    });

    it("validates component with props interface", async () => {
      const code = `
interface CardProps {
  title: string;
  description?: string;
  onClick?: () => void;
}

function Card({ title, description, onClick }: CardProps) {
  return (
    <div onClick={onClick}>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}
`;
      const result = await validator.validate(code, "tsx");

      expect(result.valid).toBe(true);
    });
  });

  describe("attemptFix", () => {
    it("returns null for unfixable errors", async () => {
      const code = `const x = ;`;
      const result = await validator.validate(code, "typescript");

      const fixed = await validator.attemptFix(code, result.errors);

      expect(fixed).toBeNull();
    });

    it("returns null when no errors are fixable", async () => {
      const errors = [
        {
          type: "syntax" as const,
          message: "Some error",
          fixable: false,
        },
      ];

      const fixed = await validator.attemptFix("const x = 1;", errors);

      expect(fixed).toBeNull();
    });
  });
});
