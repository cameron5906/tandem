import { describe, it, expect } from "vitest";
import { TsConfigEmitter } from "./TsConfigEmitter";

describe("TsConfigEmitter", () => {
  const emitter = new TsConfigEmitter();

  describe("file output", () => {
    it("generates tsconfig.json file", () => {
      const files = emitter.emit("node");

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe("tsconfig.json");
    });

    it("generates valid JSON", () => {
      const files = emitter.emit("node");

      expect(() => JSON.parse(files[0].content)).not.toThrow();
    });
  });

  describe("Node target", () => {
    it("generates Node-optimized config", () => {
      const files = emitter.emit("node");
      const config = JSON.parse(files[0].content);

      expect(config.compilerOptions).toBeDefined();
      expect(config.include).toBeDefined();
      expect(config.exclude).toBeDefined();
    });

    it("uses ES2022 target for Node", () => {
      const files = emitter.emit("node");
      const config = JSON.parse(files[0].content);

      expect(config.compilerOptions.target).toBe("ES2022");
    });

    it("uses NodeNext module resolution for Node", () => {
      const files = emitter.emit("node");
      const config = JSON.parse(files[0].content);

      expect(config.compilerOptions.module).toBe("NodeNext");
      expect(config.compilerOptions.moduleResolution).toBe("NodeNext");
    });

    it("includes outDir for Node", () => {
      const files = emitter.emit("node");
      const config = JSON.parse(files[0].content);

      expect(config.compilerOptions.outDir).toBe("dist");
    });

    it("includes rootDir for Node", () => {
      const files = emitter.emit("node");
      const config = JSON.parse(files[0].content);

      expect(config.compilerOptions.rootDir).toBe("src");
    });

    it("enables declaration generation for Node", () => {
      const files = emitter.emit("node");
      const config = JSON.parse(files[0].content);

      expect(config.compilerOptions.declaration).toBe(true);
    });

    it("includes src directory in Node config", () => {
      const files = emitter.emit("node");
      const config = JSON.parse(files[0].content);

      expect(config.include).toContain("src/**/*.ts");
    });

    it("excludes node_modules and dist in Node config", () => {
      const files = emitter.emit("node");
      const config = JSON.parse(files[0].content);

      expect(config.exclude).toContain("node_modules");
      expect(config.exclude).toContain("dist");
    });
  });

  describe("Browser target", () => {
    it("generates browser-optimized config", () => {
      const files = emitter.emit("browser");
      const config = JSON.parse(files[0].content);

      expect(config.compilerOptions).toBeDefined();
      expect(config.include).toBeDefined();
      expect(config.exclude).toBeDefined();
    });

    it("uses ES2020 target for browser", () => {
      const files = emitter.emit("browser");
      const config = JSON.parse(files[0].content);

      expect(config.compilerOptions.target).toBe("ES2020");
    });

    it("uses ESNext module for browser", () => {
      const files = emitter.emit("browser");
      const config = JSON.parse(files[0].content);

      expect(config.compilerOptions.module).toBe("ESNext");
    });

    it("uses bundler module resolution for browser", () => {
      const files = emitter.emit("browser");
      const config = JSON.parse(files[0].content);

      expect(config.compilerOptions.moduleResolution).toBe("bundler");
    });

    it("includes DOM lib for browser", () => {
      const files = emitter.emit("browser");
      const config = JSON.parse(files[0].content);

      expect(config.compilerOptions.lib).toContain("DOM");
      expect(config.compilerOptions.lib).toContain("DOM.Iterable");
    });

    it('includes jsx: "react-jsx" for browser', () => {
      const files = emitter.emit("browser");
      const config = JSON.parse(files[0].content);

      expect(config.compilerOptions.jsx).toBe("react-jsx");
    });

    it("sets noEmit: true for browser (Vite handles bundling)", () => {
      const files = emitter.emit("browser");
      const config = JSON.parse(files[0].content);

      expect(config.compilerOptions.noEmit).toBe(true);
    });

    it("enables isolatedModules for browser", () => {
      const files = emitter.emit("browser");
      const config = JSON.parse(files[0].content);

      expect(config.compilerOptions.isolatedModules).toBe(true);
    });

    it("does not include outDir for browser", () => {
      const files = emitter.emit("browser");
      const config = JSON.parse(files[0].content);

      expect(config.compilerOptions.outDir).toBeUndefined();
    });
  });

  describe("common settings", () => {
    it("enables strict mode for both targets", () => {
      const nodeConfig = JSON.parse(emitter.emit("node")[0].content);
      const browserConfig = JSON.parse(emitter.emit("browser")[0].content);

      expect(nodeConfig.compilerOptions.strict).toBe(true);
      expect(browserConfig.compilerOptions.strict).toBe(true);
    });

    it("enables esModuleInterop for both targets", () => {
      const nodeConfig = JSON.parse(emitter.emit("node")[0].content);
      const browserConfig = JSON.parse(emitter.emit("browser")[0].content);

      expect(nodeConfig.compilerOptions.esModuleInterop).toBe(true);
      expect(browserConfig.compilerOptions.esModuleInterop).toBe(true);
    });

    it("enables skipLibCheck for both targets", () => {
      const nodeConfig = JSON.parse(emitter.emit("node")[0].content);
      const browserConfig = JSON.parse(emitter.emit("browser")[0].content);

      expect(nodeConfig.compilerOptions.skipLibCheck).toBe(true);
      expect(browserConfig.compilerOptions.skipLibCheck).toBe(true);
    });
  });
});
