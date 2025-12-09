import { describe, it, expect, beforeEach } from "vitest";
import {
  GeneratorRegistry,
  IFrameworkGenerator,
  GeneratorContext,
  GeneratorOutput,
  FrameworkGeneratorMeta,
} from "./src";
import { createEmptyIR } from "@tandem-lang/compiler";

// Mock generator implementation for testing
function createMockGenerator(
  meta: Partial<FrameworkGeneratorMeta>
): IFrameworkGenerator {
  const fullMeta: FrameworkGeneratorMeta = {
    id: meta.id || "test:mock",
    language: meta.language || "typescript",
    framework: meta.framework || "mock",
    target: meta.target || "backend",
    description: meta.description || "Mock generator for testing",
    ...meta,
  };

  return {
    meta: fullMeta,
    generate(_context: GeneratorContext): GeneratorOutput {
      return {
        files: [{ path: "test.ts", content: "// generated" }],
      };
    },
  };
}

describe("GeneratorRegistry", () => {
  let registry: GeneratorRegistry;

  beforeEach(() => {
    registry = new GeneratorRegistry();
  });

  describe("register", () => {
    it("registers a generator successfully", () => {
      const generator = createMockGenerator({ id: "typescript:express" });

      registry.register(generator);

      expect(registry.has("typescript:express")).toBe(true);
      expect(registry.size).toBe(1);
    });

    it("throws error when registering duplicate ID", () => {
      const generator1 = createMockGenerator({ id: "typescript:express" });
      const generator2 = createMockGenerator({ id: "typescript:express" });

      registry.register(generator1);

      expect(() => registry.register(generator2)).toThrow(
        "Generator already registered: typescript:express"
      );
    });

    it("allows registering multiple different generators", () => {
      const express = createMockGenerator({ id: "typescript:express" });
      const react = createMockGenerator({ id: "typescript:react" });

      registry.register(express);
      registry.register(react);

      expect(registry.size).toBe(2);
    });
  });

  describe("get", () => {
    it("returns registered generator by ID", () => {
      const generator = createMockGenerator({ id: "typescript:express" });
      registry.register(generator);

      const result = registry.get("typescript:express");

      expect(result).toBe(generator);
    });

    it("returns undefined for unregistered ID", () => {
      const result = registry.get("typescript:nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("unregister", () => {
    it("removes a registered generator", () => {
      const generator = createMockGenerator({ id: "typescript:express" });
      registry.register(generator);

      const removed = registry.unregister("typescript:express");

      expect(removed).toBe(true);
      expect(registry.has("typescript:express")).toBe(false);
    });

    it("returns false for unregistered ID", () => {
      const removed = registry.unregister("typescript:nonexistent");

      expect(removed).toBe(false);
    });
  });

  describe("findByAnnotation", () => {
    beforeEach(() => {
      registry.register(
        createMockGenerator({
          id: "typescript:express",
          language: "typescript",
          framework: "express",
          target: "backend",
        })
      );
      registry.register(
        createMockGenerator({
          id: "typescript:react",
          language: "typescript",
          framework: "react",
          target: "frontend",
        })
      );
    });

    it("finds backend generator by annotation", () => {
      const result = registry.findByAnnotation("backend", "express");

      expect(result?.meta.id).toBe("typescript:express");
    });

    it("finds frontend generator by annotation", () => {
      const result = registry.findByAnnotation("frontend", "react");

      expect(result?.meta.id).toBe("typescript:react");
    });

    it("returns undefined for wrong target", () => {
      // express is backend, not frontend
      const result = registry.findByAnnotation("frontend", "express");

      expect(result).toBeUndefined();
    });

    it("returns undefined for unknown framework", () => {
      const result = registry.findByAnnotation("backend", "fastify");

      expect(result).toBeUndefined();
    });

    it("supports explicit language parameter", () => {
      const result = registry.findByAnnotation(
        "backend",
        "express",
        "typescript"
      );

      expect(result?.meta.id).toBe("typescript:express");
    });
  });

  describe("findAll", () => {
    beforeEach(() => {
      registry.register(
        createMockGenerator({
          id: "typescript:express",
          language: "typescript",
          framework: "express",
          target: "backend",
        })
      );
      registry.register(
        createMockGenerator({
          id: "typescript:react",
          language: "typescript",
          framework: "react",
          target: "frontend",
        })
      );
      registry.register(
        createMockGenerator({
          id: "python:fastapi",
          language: "python",
          framework: "fastapi",
          target: "backend",
        })
      );
    });

    it("returns all generators when no filter", () => {
      const results = registry.findAll();

      expect(results).toHaveLength(3);
    });

    it("filters by language", () => {
      const results = registry.findAll({ language: "typescript" });

      expect(results).toHaveLength(2);
      expect(results.every((g) => g.meta.language === "typescript")).toBe(true);
    });

    it("filters by target", () => {
      const results = registry.findAll({ target: "backend" });

      expect(results).toHaveLength(2);
      expect(results.every((g) => g.meta.target === "backend")).toBe(true);
    });

    it("filters by multiple criteria", () => {
      const results = registry.findAll({
        language: "typescript",
        target: "backend",
      });

      expect(results).toHaveLength(1);
      expect(results[0].meta.id).toBe("typescript:express");
    });
  });

  describe("list", () => {
    it("returns metadata for all generators", () => {
      registry.register(createMockGenerator({ id: "typescript:express" }));
      registry.register(createMockGenerator({ id: "typescript:react" }));

      const metas = registry.list();

      expect(metas).toHaveLength(2);
      expect(metas.map((m) => m.id)).toContain("typescript:express");
      expect(metas.map((m) => m.id)).toContain("typescript:react");
    });

    it("returns empty array when no generators registered", () => {
      const metas = registry.list();

      expect(metas).toEqual([]);
    });
  });

  describe("clear", () => {
    it("removes all registered generators", () => {
      registry.register(createMockGenerator({ id: "typescript:express" }));
      registry.register(createMockGenerator({ id: "typescript:react" }));

      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.list()).toEqual([]);
    });
  });
});

describe("IFrameworkGenerator", () => {
  it("generates output with files", () => {
    const generator = createMockGenerator({ id: "test:generator" });
    const context: GeneratorContext = {
      ir: createEmptyIR(),
      config: { outputDir: "./generated" },
      targetModules: [],
    };

    const output = generator.generate(context);

    expect(output.files).toHaveLength(1);
    expect(output.files[0].path).toBe("test.ts");
    expect(output.files[0].content).toContain("generated");
  });

  it("supports optional validate method", () => {
    const generator: IFrameworkGenerator = {
      meta: {
        id: "test:validator",
        language: "typescript",
        framework: "test",
        target: "backend",
        description: "Test validator",
      },
      generate(): GeneratorOutput {
        return { files: [] };
      },
      validate(context: GeneratorContext): string[] {
        if (context.targetModules.length === 0) {
          return ["No modules to generate"];
        }
        return [];
      },
    };

    const context: GeneratorContext = {
      ir: createEmptyIR(),
      config: { outputDir: "./generated" },
      targetModules: [],
    };

    const errors = generator.validate?.(context);

    expect(errors).toContain("No modules to generate");
  });
});
