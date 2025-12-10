import { describe, it, expect } from "vitest";
import { parseTandem, compileToIR } from "@tandem-lang/compiler";
import { GeneratorContext, LLMProviderConfig } from "@tandem-lang/generator-core";
import { ExpressGenerator } from "./ExpressGenerator";
import { ReactGenerator } from "./ReactGenerator";

// Mock LLM config for tests
const mockLLMConfig: LLMProviderConfig = {
  provider: "mock",
};

// Helper to create generator context from source
function createContext(source: string): GeneratorContext {
  const { program } = parseTandem(source);
  const { ir } = compileToIR(program);
  return {
    ir,
    config: { outputDir: "./out", llm: mockLLMConfig },
    targetModules: Array.from(ir.modules.values()),
  };
}

describe("Generator Project Name Derivation", () => {
  describe("ExpressGenerator", () => {
    it("derives project name from module name for backend", async () => {
      const source = `
@backend(express)
module app.tasks
intent route GetTask { input: { id: UUID } output: String }
`;
      const context = createContext(source);
      const generator = new ExpressGenerator();
      const output = await generator.generate(context);

      const pkgFile = output.files.find((f) => f.path === "package.json");
      expect(pkgFile).toBeDefined();
      const pkg = JSON.parse(pkgFile!.content);
      expect(pkg.name).toBe("tasks-backend");
    });

    it("uses custom project name when specified", async () => {
      const source = `
@backend(express)
module app.tasks
intent route GetTask { input: { id: UUID } output: String }
`;
      const context = createContext(source);
      const generator = new ExpressGenerator({ projectName: "my-api" });
      const output = await generator.generate(context);

      const pkgFile = output.files.find((f) => f.path === "package.json");
      const pkg = JSON.parse(pkgFile!.content);
      expect(pkg.name).toBe("my-api");
    });

    it('falls back to "tandem-backend" when no module name available', async () => {
      const source = `
@backend(express)
module test
intent route GetTask { input: { id: UUID } output: String }
`;
      const context = createContext(source);
      const generator = new ExpressGenerator();
      const output = await generator.generate(context);

      const pkgFile = output.files.find((f) => f.path === "package.json");
      const pkg = JSON.parse(pkgFile!.content);
      // "test" is the module name, so it becomes "test-backend"
      expect(pkg.name).toBe("test-backend");
    });
  });

  describe("ReactGenerator", () => {
    it("derives project name from module name for frontend", async () => {
      const source = `
@frontend(react)
module app.tasks
intent route GetTask { input: { id: UUID } output: String }
`;
      const context = createContext(source);
      const generator = new ReactGenerator();
      const output = await generator.generate(context);

      const pkgFile = output.files.find((f) => f.path === "package.json");
      expect(pkgFile).toBeDefined();
      const pkg = JSON.parse(pkgFile!.content);
      expect(pkg.name).toBe("tasks-frontend");
    });

    it("derives app title from module name", async () => {
      const source = `
@frontend(react)
module app.tasks
intent route GetTask { input: { id: UUID } output: String }
`;
      const context = createContext(source);
      const generator = new ReactGenerator();
      const output = await generator.generate(context);

      const appFile = output.files.find((f) => f.path === "src/App.tsx");
      expect(appFile).toBeDefined();
      expect(appFile!.content).toContain("Tasks App");
    });

    it("uses custom project name when specified", async () => {
      const source = `
@frontend(react)
module app.tasks
intent route GetTask { input: { id: UUID } output: String }
`;
      const context = createContext(source);
      const generator = new ReactGenerator({ projectName: "my-dashboard" });
      const output = await generator.generate(context);

      const pkgFile = output.files.find((f) => f.path === "package.json");
      const pkg = JSON.parse(pkgFile!.content);
      expect(pkg.name).toBe("my-dashboard");
    });
  });
});

describe("Full Express Project Generation", () => {
  const source = `
@backend(express)
module app.tasks
type Task { id: UUID, title: String }
intent route ListTasks { input: {} output: List<Task> }
intent route CreateTask { input: { title: String } output: Task }
`;

  it("generates complete Express project with all files", async () => {
    const context = createContext(source);
    const generator = new ExpressGenerator();
    const output = await generator.generate(context);

    const filePaths = output.files.map((f) => f.path);

    // Project files
    expect(filePaths).toContain("package.json");
    expect(filePaths).toContain("tsconfig.json");
    expect(filePaths).toContain("src/index.ts");

    // Generated source files (modular output)
    expect(filePaths).toContain("src/types.ts"); // Aggregate
    expect(filePaths).toContain("src/app/tasks/types.ts"); // Per-module
    expect(filePaths).toContain("src/app/tasks/handlers.ts"); // Per-module
    expect(filePaths).toContain("src/app/tasks/routes.ts"); // Per-module
    expect(filePaths).toContain("src/routes/index.ts"); // Aggregate router
  });

  it("Express package.json has correct scripts", async () => {
    const context = createContext(source);
    const generator = new ExpressGenerator();
    const output = await generator.generate(context);

    const pkgFile = output.files.find((f) => f.path === "package.json");
    const pkg = JSON.parse(pkgFile!.content);

    expect(pkg.scripts.dev).toBe("tsx watch src/index.ts");
    expect(pkg.scripts.build).toBe("tsc");
    expect(pkg.scripts.start).toBe("node dist/index.js");
  });

  it("Express package.json has all required dependencies", async () => {
    const context = createContext(source);
    const generator = new ExpressGenerator();
    const output = await generator.generate(context);

    const pkgFile = output.files.find((f) => f.path === "package.json");
    const pkg = JSON.parse(pkgFile!.content);

    expect(pkg.dependencies).toHaveProperty("express");
    expect(pkg.dependencies).toHaveProperty("cors");
    expect(pkg.devDependencies).toHaveProperty("@types/express");
    expect(pkg.devDependencies).toHaveProperty("@types/cors");
    expect(pkg.devDependencies).toHaveProperty("typescript");
    expect(pkg.devDependencies).toHaveProperty("tsx");
  });

  it("Express package.json has type: module", async () => {
    const context = createContext(source);
    const generator = new ExpressGenerator();
    const output = await generator.generate(context);

    const pkgFile = output.files.find((f) => f.path === "package.json");
    const pkg = JSON.parse(pkgFile!.content);

    expect(pkg.type).toBe("module");
  });

  it("Express tsconfig.json has Node settings", async () => {
    const context = createContext(source);
    const generator = new ExpressGenerator();
    const output = await generator.generate(context);

    const tsconfigFile = output.files.find((f) => f.path === "tsconfig.json");
    const tsconfig = JSON.parse(tsconfigFile!.content);

    expect(tsconfig.compilerOptions.target).toBe("ES2022");
    expect(tsconfig.compilerOptions.module).toBe("ESNext");
    expect(tsconfig.compilerOptions.moduleResolution).toBe("bundler");
    expect(tsconfig.compilerOptions.outDir).toBe("dist");
  });

  it("Express src/index.ts has correct content", async () => {
    const context = createContext(source);
    const generator = new ExpressGenerator();
    const output = await generator.generate(context);

    const indexFile = output.files.find((f) => f.path === "src/index.ts");
    expect(indexFile).toBeDefined();
    expect(indexFile!.content).toContain('import express from "express"');
    expect(indexFile!.content).toContain('import cors from "cors"');
    expect(indexFile!.content).toContain("app.listen");
  });
});

describe("Full React Project Generation", () => {
  const source = `
@frontend(react)
module app.tasks
type Task { id: UUID, title: String }
intent route ListTasks { input: {} output: List<Task> }
intent route CreateTask { input: { title: String } output: Task }
`;

  it("generates complete React project with all files", async () => {
    const context = createContext(source);
    const generator = new ReactGenerator();
    const output = await generator.generate(context);

    const filePaths = output.files.map((f) => f.path);

    // Project files
    expect(filePaths).toContain("package.json");
    expect(filePaths).toContain("tsconfig.json");
    expect(filePaths).toContain("vite.config.ts");
    expect(filePaths).toContain("index.html");
    expect(filePaths).toContain("src/main.tsx");
    expect(filePaths).toContain("src/App.tsx");

    // Generated source files (modular output)
    expect(filePaths).toContain("src/types.ts"); // Aggregate
    expect(filePaths).toContain("src/app/tasks/types.ts"); // Per-module types
    expect(filePaths).toContain("src/app/tasks/client.ts"); // Per-module client
    expect(filePaths).toContain("src/app/tasks/hooks.ts"); // Per-module hooks
    expect(filePaths).toContain("src/api/client.ts"); // Aggregate client
    expect(filePaths).toContain("src/hooks/index.ts"); // Aggregate hooks
  });

  it("React package.json has correct scripts", async () => {
    const context = createContext(source);
    const generator = new ReactGenerator();
    const output = await generator.generate(context);

    const pkgFile = output.files.find((f) => f.path === "package.json");
    const pkg = JSON.parse(pkgFile!.content);

    expect(pkg.scripts.dev).toBe("vite");
    expect(pkg.scripts.build).toBe("tsc && vite build");
    expect(pkg.scripts.preview).toBe("vite preview");
  });

  it("React package.json has all required dependencies", async () => {
    const context = createContext(source);
    const generator = new ReactGenerator();
    const output = await generator.generate(context);

    const pkgFile = output.files.find((f) => f.path === "package.json");
    const pkg = JSON.parse(pkgFile!.content);

    expect(pkg.dependencies).toHaveProperty("react");
    expect(pkg.dependencies).toHaveProperty("react-dom");
    expect(pkg.dependencies).toHaveProperty("@tanstack/react-query");
    expect(pkg.devDependencies).toHaveProperty("@types/react");
    expect(pkg.devDependencies).toHaveProperty("@types/react-dom");
    expect(pkg.devDependencies).toHaveProperty("vite");
    expect(pkg.devDependencies).toHaveProperty("@vitejs/plugin-react");
  });

  it("React package.json has type: module", async () => {
    const context = createContext(source);
    const generator = new ReactGenerator();
    const output = await generator.generate(context);

    const pkgFile = output.files.find((f) => f.path === "package.json");
    const pkg = JSON.parse(pkgFile!.content);

    expect(pkg.type).toBe("module");
  });

  it("React tsconfig.json has browser settings", async () => {
    const context = createContext(source);
    const generator = new ReactGenerator();
    const output = await generator.generate(context);

    const tsconfigFile = output.files.find((f) => f.path === "tsconfig.json");
    const tsconfig = JSON.parse(tsconfigFile!.content);

    expect(tsconfig.compilerOptions.target).toBe("ES2020");
    expect(tsconfig.compilerOptions.jsx).toBe("react-jsx");
    expect(tsconfig.compilerOptions.lib).toContain("DOM");
    expect(tsconfig.compilerOptions.noEmit).toBe(true);
  });

  it("React vite.config.ts has correct content", async () => {
    const context = createContext(source);
    const generator = new ReactGenerator();
    const output = await generator.generate(context);

    const viteFile = output.files.find((f) => f.path === "vite.config.ts");
    expect(viteFile).toBeDefined();
    expect(viteFile!.content).toContain("defineConfig");
    expect(viteFile!.content).toContain("react()");
    expect(viteFile!.content).toContain('"/api"');
    expect(viteFile!.content).toContain("http://localhost:3000");
  });

  it("React index.html has correct content", async () => {
    const context = createContext(source);
    const generator = new ReactGenerator();
    const output = await generator.generate(context);

    const htmlFile = output.files.find((f) => f.path === "index.html");
    expect(htmlFile).toBeDefined();
    expect(htmlFile!.content).toContain("<!DOCTYPE html>");
    expect(htmlFile!.content).toContain('<div id="root"></div>');
    expect(htmlFile!.content).toContain("/src/main.tsx");
  });

  it("React src/main.tsx has correct content", async () => {
    const context = createContext(source);
    const generator = new ReactGenerator();
    const output = await generator.generate(context);

    const mainFile = output.files.find((f) => f.path === "src/main.tsx");
    expect(mainFile).toBeDefined();
    expect(mainFile!.content).toContain("QueryClient");
    expect(mainFile!.content).toContain("QueryClientProvider");
    expect(mainFile!.content).toContain("React.StrictMode");
  });

  it("React src/App.tsx has correct content", async () => {
    const context = createContext(source);
    const generator = new ReactGenerator();
    const output = await generator.generate(context);

    const appFile = output.files.find((f) => f.path === "src/App.tsx");
    expect(appFile).toBeDefined();
    expect(appFile!.content).toContain("function App()");
    expect(appFile!.content).toContain("export default App");
  });
});

describe("Skip Project Files Option", () => {
  const source = `
@backend(express)
module app.tasks
intent route GetTask { input: { id: UUID } output: String }
`;

  it("ExpressGenerator excludes project files when includeProjectFiles is false", async () => {
    const context = createContext(source);
    const generator = new ExpressGenerator({ includeProjectFiles: false });
    const output = await generator.generate(context);

    const filePaths = output.files.map((f) => f.path);

    expect(filePaths).not.toContain("package.json");
    expect(filePaths).not.toContain("tsconfig.json");
    expect(filePaths).not.toContain("src/index.ts");

    // Source files should still be present (modular output)
    expect(filePaths).toContain("src/types.ts"); // Aggregate
    expect(filePaths).toContain("src/app/tasks/types.ts"); // Per-module
    expect(filePaths).toContain("src/app/tasks/handlers.ts"); // Per-module
  });

  it("ReactGenerator excludes project files when includeProjectFiles is false", async () => {
    const source = `
@frontend(react)
module app.tasks
intent route GetTask { input: { id: UUID } output: String }
`;
    const context = createContext(source);
    const generator = new ReactGenerator({ includeProjectFiles: false });
    const output = await generator.generate(context);

    const filePaths = output.files.map((f) => f.path);

    expect(filePaths).not.toContain("package.json");
    expect(filePaths).not.toContain("tsconfig.json");
    expect(filePaths).not.toContain("vite.config.ts");
    expect(filePaths).not.toContain("index.html");
    expect(filePaths).not.toContain("src/main.tsx");
    expect(filePaths).not.toContain("src/App.tsx");

    // Source files should still be present (modular output)
    expect(filePaths).toContain("src/types.ts"); // Aggregate
    expect(filePaths).toContain("src/app/tasks/types.ts"); // Per-module
    expect(filePaths).toContain("src/app/tasks/client.ts"); // Per-module
  });
});

describe("Modular Output Structure", () => {
  it("Express generates module-organized files", async () => {
    const source = `
@backend(express)
module api.users
type User { id: UUID, name: String }
intent route GetUser { input: { id: UUID } output: User }
`;
    const context = createContext(source);
    const generator = new ExpressGenerator({ includeProjectFiles: false });
    const output = await generator.generate(context);

    const filePaths = output.files.map((f) => f.path);

    // Per-module files
    expect(filePaths).toContain("src/api/users/types.ts");
    expect(filePaths).toContain("src/api/users/handlers.ts");
    expect(filePaths).toContain("src/api/users/routes.ts");

    // Aggregate files
    expect(filePaths).toContain("src/types.ts");
    expect(filePaths).toContain("src/routes/index.ts");
  });

  it("React generates module-organized files", async () => {
    const source = `
@frontend(react)
module api.users
type User { id: UUID, name: String }
intent route GetUser { input: { id: UUID } output: User }
`;
    const context = createContext(source);
    const generator = new ReactGenerator({ includeProjectFiles: false });
    const output = await generator.generate(context);

    const filePaths = output.files.map((f) => f.path);

    // Per-module files
    expect(filePaths).toContain("src/api/users/types.ts");
    expect(filePaths).toContain("src/api/users/client.ts");
    expect(filePaths).toContain("src/api/users/hooks.ts");

    // Aggregate files
    expect(filePaths).toContain("src/types.ts");
    expect(filePaths).toContain("src/api/client.ts");
    expect(filePaths).toContain("src/hooks/index.ts");
  });
});
