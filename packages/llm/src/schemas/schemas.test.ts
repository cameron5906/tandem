import { describe, it, expect } from "vitest";
import {
  HandlerOutputSchema,
  HandlerFileSchema,
  ComponentOutputSchema,
  ComponentFileSchema,
  FormComponentOutputSchema,
} from "./index";

describe("HandlerOutputSchema", () => {
  it("validates minimal handler output", () => {
    const output = {
      implementation: `
const user = await db.users.findById(req.query.id);
if (!user) {
  return res.status(404).json({ error: 'User not found' });
}
res.json(user);
`,
    };

    const result = HandlerOutputSchema.safeParse(output);

    expect(result.success).toBe(true);
  });

  it("validates handler output with all fields", () => {
    const output = {
      implementation: `
const user = await db.users.findById(req.query.id);
res.json(user);
`,
      validation: `
if (!req.query.id) {
  return res.status(400).json({ error: 'Missing id parameter' });
}
`,
      imports: ["import { db } from '../database';"],
      comments: ["Fetches user by ID from database"],
    };

    const result = HandlerOutputSchema.safeParse(output);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.validation).toBeDefined();
      expect(result.data.imports).toHaveLength(1);
      expect(result.data.comments).toHaveLength(1);
    }
  });

  it("rejects output without implementation", () => {
    const output = {
      validation: "const valid = true;",
    };

    const result = HandlerOutputSchema.safeParse(output);

    expect(result.success).toBe(false);
  });
});

describe("HandlerFileSchema", () => {
  it("validates complete handler file output", () => {
    const output = {
      fileContent: `
import { Request, Response } from 'express';
import { db } from '../database';

export async function getUser(req: Request, res: Response): Promise<void> {
  const user = await db.users.findById(req.query.id);
  res.json(user);
}
`,
      handlerName: "getUser",
    };

    const result = HandlerFileSchema.safeParse(output);

    expect(result.success).toBe(true);
  });

  it("validates handler file with type definitions", () => {
    const output = {
      fileContent: "export function handler() {}",
      handlerName: "handler",
      typeDefinitions: "type CustomType = { id: string };",
    };

    const result = HandlerFileSchema.safeParse(output);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.typeDefinitions).toBeDefined();
    }
  });
});

describe("ComponentOutputSchema", () => {
  it("validates minimal component output", () => {
    const output = {
      jsx: `
<div className="user-card">
  <h2>{user.name}</h2>
  <p>{user.email}</p>
</div>
`,
    };

    const result = ComponentOutputSchema.safeParse(output);

    expect(result.success).toBe(true);
  });

  it("validates component output with hooks", () => {
    const output = {
      jsx: `<button onClick={handleClick}>{count}</button>`,
      hooks: [
        "const [count, setCount] = useState(0);",
        "const handleClick = useCallback(() => setCount(c => c + 1), []);",
      ],
    };

    const result = ComponentOutputSchema.safeParse(output);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hooks).toHaveLength(2);
    }
  });

  it("validates component output with handlers", () => {
    const output = {
      jsx: `<form onSubmit={handleSubmit}><button type="submit">Submit</button></form>`,
      handlers: [
        {
          name: "handleSubmit",
          implementation:
            "const handleSubmit = (e: FormEvent) => { e.preventDefault(); };",
        },
      ],
    };

    const result = ComponentOutputSchema.safeParse(output);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.handlers).toHaveLength(1);
    }
  });

  it("validates component output with styles", () => {
    const output = {
      jsx: `<div style={styles}>Content</div>`,
      styles: `const styles = { padding: '1rem', backgroundColor: '#f0f0f0' };`,
    };

    const result = ComponentOutputSchema.safeParse(output);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.styles).toBeDefined();
    }
  });

  it("validates component output with all fields", () => {
    const output = {
      jsx: `
<div className="container">
  <h1>{title}</h1>
  <button onClick={handleClick}>Click me</button>
</div>
`,
      hooks: ["const [title, setTitle] = useState('Hello');"],
      handlers: [
        {
          name: "handleClick",
          implementation: "const handleClick = () => setTitle('Clicked!');",
        },
      ],
      styles: "const containerStyle = { margin: '1rem' };",
      imports: ["import { useState } from 'react';"],
    };

    const result = ComponentOutputSchema.safeParse(output);

    expect(result.success).toBe(true);
  });

  it("rejects output without jsx", () => {
    const output = {
      hooks: ["const [state, setState] = useState(null);"],
    };

    const result = ComponentOutputSchema.safeParse(output);

    expect(result.success).toBe(false);
  });
});

describe("ComponentFileSchema", () => {
  it("validates complete component file", () => {
    const output = {
      fileContent: `
import React from 'react';

interface UserCardProps {
  user: { name: string; email: string };
}

export function UserCard({ user }: UserCardProps): JSX.Element {
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
`,
      componentName: "UserCard",
      propsInterface: "interface UserCardProps { user: { name: string; email: string }; }",
    };

    const result = ComponentFileSchema.safeParse(output);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.propsInterface).toBeDefined();
    }
  });
});

describe("FormComponentOutputSchema", () => {
  it("validates form component output", () => {
    const output = {
      jsx: `
<form onSubmit={handleSubmit}>
  <input name="name" value={formData.name} onChange={handleChange} />
  <input name="email" value={formData.email} onChange={handleChange} />
  <button type="submit">Submit</button>
</form>
`,
      fields: [
        { name: "name", type: "text", label: "Name" },
        { name: "email", type: "email", label: "Email" },
      ],
      onSubmit: `
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  await api.createUser(formData);
};
`,
    };

    const result = FormComponentOutputSchema.safeParse(output);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fields).toHaveLength(2);
    }
  });

  it("validates form field types", () => {
    const output = {
      jsx: "<form></form>",
      fields: [
        { name: "password", type: "password", label: "Password" },
        { name: "bio", type: "textarea", label: "Biography" },
        {
          name: "role",
          type: "select",
          label: "Role",
          validation: "required",
        },
      ],
    };

    const result = FormComponentOutputSchema.safeParse(output);

    expect(result.success).toBe(true);
  });

  it("rejects invalid field types", () => {
    const output = {
      jsx: "<form></form>",
      fields: [{ name: "invalid", type: "invalid-type", label: "Invalid" }],
    };

    const result = FormComponentOutputSchema.safeParse(output);

    expect(result.success).toBe(false);
  });
});
