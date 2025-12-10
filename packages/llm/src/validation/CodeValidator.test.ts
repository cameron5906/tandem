import { describe, it, expect, vi } from "vitest";
import { CodeValidator, DEFAULT_VALIDATOR_CONFIG } from "./CodeValidator";
import type { ICodeValidator, ValidationResult } from "../interfaces";

describe("CodeValidator", () => {
  describe("validate", () => {
    it("validates correct TypeScript code", async () => {
      const validator = new CodeValidator();
      const code = `
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
`;
      const result = await validator.validate(code, "typescript");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("detects syntax errors", async () => {
      const validator = new CodeValidator();
      const code = `
function broken() {
  const x = ;
}
`;
      const result = await validator.validate(code, "typescript");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("validates TSX code", async () => {
      const validator = new CodeValidator();
      const code = `
function Button() {
  return <button>Click me</button>;
}
`;
      const result = await validator.validate(code, "tsx");

      expect(result.valid).toBe(true);
    });

    it("runs custom validators", async () => {
      const customValidator: ICodeValidator = {
        validate: vi.fn().mockResolvedValue({
          valid: true,
          errors: [],
          warnings: [{ type: "style", message: "Custom warning" }],
        }),
        attemptFix: vi.fn().mockResolvedValue(null),
      };

      const validator = new CodeValidator({
        customValidators: [customValidator],
      });

      const code = `const x = 1;`;
      const result = await validator.validate(code, "typescript");

      expect(customValidator.validate).toHaveBeenCalledWith(code, "typescript");
      expect(result.warnings.some((w) => w.message === "Custom warning")).toBe(
        true,
      );
    });

    it("handles custom validator errors gracefully", async () => {
      const brokenValidator: ICodeValidator = {
        validate: vi.fn().mockRejectedValue(new Error("Validator crashed")),
        attemptFix: vi.fn().mockResolvedValue(null),
      };

      const validator = new CodeValidator({
        customValidators: [brokenValidator],
      });

      const code = `const x = 1;`;
      // Should not throw
      const result = await validator.validate(code, "typescript");

      expect(result.valid).toBe(true);
    });
  });

  describe("pattern checks", () => {
    it("warns about TODO comments", async () => {
      const validator = new CodeValidator();
      const code = `
// TODO: implement this
function placeholder() {}
`;
      const result = await validator.validate(code, "typescript");

      expect(result.warnings.some((w) => w.message.includes("TODO"))).toBe(
        true,
      );
    });

    it("warns about FIXME comments", async () => {
      const validator = new CodeValidator();
      const code = `
// FIXME: this is broken
function broken() {}
`;
      const result = await validator.validate(code, "typescript");

      expect(result.warnings.some((w) => w.message.includes("FIXME"))).toBe(
        true,
      );
    });

    it("warns about console.log in handlers", async () => {
      const validator = new CodeValidator();
      const code = `
function handler() {
  console.log('debug');
  return { ok: true };
}
`;
      const result = await validator.validate(code, "typescript");

      expect(
        result.warnings.some((w) => w.message.includes("console.log")),
      ).toBe(true);
    });

    it("warns about empty catch blocks", async () => {
      const validator = new CodeValidator();
      const code = `
function risky() {
  try {
    doSomething();
  } catch (e) {}
}
`;
      const result = await validator.validate(code, "typescript");

      expect(
        result.warnings.some((w) => w.message.includes("Empty catch block")),
      ).toBe(true);
    });

    it("warns about any type usage", async () => {
      const validator = new CodeValidator();
      const code = `
function process(data: any): any {
  return data;
}
`;
      const result = await validator.validate(code, "typescript");

      expect(
        result.warnings.some((w) => w.message.includes("'any' type")),
      ).toBe(true);
    });

    it("includes line numbers in warnings", async () => {
      const validator = new CodeValidator();
      const code = `const x = 1;
// TODO: fix this
const y = 2;`;
      const result = await validator.validate(code, "typescript");

      const todoWarning = result.warnings.find((w) =>
        w.message.includes("TODO"),
      );
      expect(todoWarning?.line).toBe(2);
    });
  });

  describe("attemptFix", () => {
    it("returns null when no errors can be fixed", async () => {
      const validator = new CodeValidator();
      const code = `const x = ;`;
      const result = await validator.validate(code, "typescript");

      const fixed = await validator.attemptFix(code, result.errors);

      expect(fixed).toBeNull();
    });

    it("tries custom validators for fixes", async () => {
      const customValidator: ICodeValidator = {
        validate: vi.fn().mockResolvedValue({
          valid: true,
          errors: [],
          warnings: [],
        }),
        attemptFix: vi.fn().mockResolvedValue("fixed code"),
      };

      const validator = new CodeValidator({
        customValidators: [customValidator],
      });

      const errors = [
        { type: "syntax" as const, message: "error", fixable: false },
      ];
      const fixed = await validator.attemptFix("broken code", errors);

      expect(fixed).toBe("fixed code");
    });
  });

  describe("validateSyntaxOnly", () => {
    it("performs quick syntax validation", async () => {
      const validator = new CodeValidator();
      const code = `const x: number = 5;`;

      const result = await validator.validateSyntaxOnly(code, "typescript");

      expect(result.valid).toBe(true);
    });

    it("detects syntax errors quickly", async () => {
      const validator = new CodeValidator();
      const code = `const x = ;`;

      const result = await validator.validateSyntaxOnly(code, "typescript");

      expect(result.valid).toBe(false);
    });
  });

  describe("formatErrors", () => {
    it("formats success message", async () => {
      const validator = new CodeValidator();
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
      };

      const formatted = validator.formatErrors(result);

      expect(formatted).toBe("Code validated successfully.");
    });

    it("formats errors with line numbers", async () => {
      const validator = new CodeValidator();
      const result: ValidationResult = {
        valid: false,
        errors: [
          {
            type: "syntax",
            message: "Unexpected token",
            line: 5,
            column: 10,
            fixable: false,
          },
        ],
        warnings: [],
      };

      const formatted = validator.formatErrors(result);

      expect(formatted).toContain("SYNTAX");
      expect(formatted).toContain("Line 5");
      expect(formatted).toContain("Column 10");
      expect(formatted).toContain("Unexpected token");
    });

    it("includes warnings in formatted output", async () => {
      const validator = new CodeValidator();
      const result: ValidationResult = {
        valid: false,
        errors: [
          { type: "syntax", message: "Error", fixable: false },
        ],
        warnings: [
          { type: "style", message: "Style warning", line: 3 },
        ],
      };

      const formatted = validator.formatErrors(result);

      expect(formatted).toContain("Warnings:");
      expect(formatted).toContain("STYLE");
      expect(formatted).toContain("Style warning");
    });
  });

  describe("configuration", () => {
    it("uses default configuration", () => {
      const validator = new CodeValidator();

      // Should not throw
      expect(validator).toBeDefined();
    });

    it("accepts partial configuration", () => {
      const validator = new CodeValidator({
        strict: true,
      });

      expect(validator).toBeDefined();
    });

    it("merges with default configuration", () => {
      const config = { strict: true };
      const validator = new CodeValidator(config);

      // Should have default values merged
      expect(validator).toBeDefined();
    });
  });
});
