import { describe, it, expect } from "vitest";
import {
  PackageJsonEmitter,
  EXPRESS_DEPENDENCIES,
  EXPRESS_DEV_DEPENDENCIES,
  EXPRESS_SCRIPTS,
  REACT_DEPENDENCIES,
  REACT_DEV_DEPENDENCIES,
  REACT_SCRIPTS,
} from "./PackageJsonEmitter";

describe("PackageJsonEmitter", () => {
  const emitter = new PackageJsonEmitter();

  describe("basic functionality", () => {
    it("generates valid JSON with all required fields", () => {
      const files = emitter.emit({
        name: "test-app",
        scripts: { build: "tsc" },
        dependencies: { express: "^4.18.0" },
        devDependencies: { typescript: "^5.0.0" },
      });

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe("package.json");

      const pkg = JSON.parse(files[0].content);
      expect(pkg.name).toBe("test-app");
      expect(pkg.scripts).toBeDefined();
      expect(pkg.dependencies).toBeDefined();
      expect(pkg.devDependencies).toBeDefined();
    });

    it("includes name, version, type fields", () => {
      const files = emitter.emit({
        name: "my-project",
        version: "1.0.0",
        type: "module",
        scripts: {},
        dependencies: {},
        devDependencies: {},
      });

      const pkg = JSON.parse(files[0].content);
      expect(pkg.name).toBe("my-project");
      expect(pkg.version).toBe("1.0.0");
      expect(pkg.type).toBe("module");
    });

    it("includes scripts section", () => {
      const files = emitter.emit({
        name: "test",
        scripts: { dev: "vite", build: "tsc" },
        dependencies: {},
        devDependencies: {},
      });

      const pkg = JSON.parse(files[0].content);
      expect(pkg.scripts.dev).toBe("vite");
      expect(pkg.scripts.build).toBe("tsc");
    });

    it("sorts dependencies alphabetically", () => {
      const files = emitter.emit({
        name: "test",
        scripts: {},
        dependencies: { zod: "^3.0.0", axios: "^1.0.0", express: "^4.0.0" },
        devDependencies: {},
      });

      const pkg = JSON.parse(files[0].content);
      const depKeys = Object.keys(pkg.dependencies);
      expect(depKeys).toEqual(["axios", "express", "zod"]);
    });

    it("sorts devDependencies alphabetically", () => {
      const files = emitter.emit({
        name: "test",
        scripts: {},
        dependencies: {},
        devDependencies: { vitest: "^1.0.0", typescript: "^5.0.0", eslint: "^8.0.0" },
      });

      const pkg = JSON.parse(files[0].content);
      const devDepKeys = Object.keys(pkg.devDependencies);
      expect(devDepKeys).toEqual(["eslint", "typescript", "vitest"]);
    });
  });

  describe("defaults", () => {
    it('uses default version "0.1.0" when not specified', () => {
      const files = emitter.emit({
        name: "test",
        scripts: {},
        dependencies: {},
        devDependencies: {},
      });

      const pkg = JSON.parse(files[0].content);
      expect(pkg.version).toBe("0.1.0");
    });

    it('uses default type "module" when not specified', () => {
      const files = emitter.emit({
        name: "test",
        scripts: {},
        dependencies: {},
        devDependencies: {},
      });

      const pkg = JSON.parse(files[0].content);
      expect(pkg.type).toBe("module");
    });
  });

  describe("edge cases", () => {
    it("handles empty dependencies object", () => {
      const files = emitter.emit({
        name: "test",
        scripts: {},
        dependencies: {},
        devDependencies: { typescript: "^5.0.0" },
      });

      const pkg = JSON.parse(files[0].content);
      expect(pkg.dependencies).toEqual({});
    });

    it("handles empty devDependencies object", () => {
      const files = emitter.emit({
        name: "test",
        scripts: {},
        dependencies: { express: "^4.0.0" },
        devDependencies: {},
      });

      const pkg = JSON.parse(files[0].content);
      expect(pkg.devDependencies).toEqual({});
    });

    it("allows commonjs type", () => {
      const files = emitter.emit({
        name: "test",
        type: "commonjs",
        scripts: {},
        dependencies: {},
        devDependencies: {},
      });

      const pkg = JSON.parse(files[0].content);
      expect(pkg.type).toBe("commonjs");
    });
  });

  describe("preset constants", () => {
    it("EXPRESS_DEPENDENCIES contains express and cors", () => {
      expect(EXPRESS_DEPENDENCIES).toHaveProperty("express");
      expect(EXPRESS_DEPENDENCIES).toHaveProperty("cors");
    });

    it("EXPRESS_DEV_DEPENDENCIES contains required dev deps", () => {
      expect(EXPRESS_DEV_DEPENDENCIES).toHaveProperty("@types/express");
      expect(EXPRESS_DEV_DEPENDENCIES).toHaveProperty("@types/cors");
      expect(EXPRESS_DEV_DEPENDENCIES).toHaveProperty("typescript");
      expect(EXPRESS_DEV_DEPENDENCIES).toHaveProperty("tsx");
    });

    it("EXPRESS_SCRIPTS contains dev, build, start", () => {
      expect(EXPRESS_SCRIPTS).toHaveProperty("dev");
      expect(EXPRESS_SCRIPTS).toHaveProperty("build");
      expect(EXPRESS_SCRIPTS).toHaveProperty("start");
    });

    it("REACT_DEPENDENCIES contains react and react-query", () => {
      expect(REACT_DEPENDENCIES).toHaveProperty("react");
      expect(REACT_DEPENDENCIES).toHaveProperty("react-dom");
      expect(REACT_DEPENDENCIES).toHaveProperty("@tanstack/react-query");
    });

    it("REACT_DEV_DEPENDENCIES contains required dev deps", () => {
      expect(REACT_DEV_DEPENDENCIES).toHaveProperty("@types/react");
      expect(REACT_DEV_DEPENDENCIES).toHaveProperty("@types/react-dom");
      expect(REACT_DEV_DEPENDENCIES).toHaveProperty("vite");
      expect(REACT_DEV_DEPENDENCIES).toHaveProperty("@vitejs/plugin-react");
    });

    it("REACT_SCRIPTS contains dev, build, preview", () => {
      expect(REACT_SCRIPTS).toHaveProperty("dev");
      expect(REACT_SCRIPTS).toHaveProperty("build");
      expect(REACT_SCRIPTS).toHaveProperty("preview");
    });
  });
});
