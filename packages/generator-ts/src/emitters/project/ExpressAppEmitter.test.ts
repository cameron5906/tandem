import { describe, it, expect } from "vitest";
import { ExpressAppEmitter } from "./ExpressAppEmitter";

describe("ExpressAppEmitter", () => {
  const emitter = new ExpressAppEmitter();

  describe("file output", () => {
    it("generates src/index.ts file", () => {
      const files = emitter.emit();

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe("src/index.ts");
    });
  });

  describe("imports", () => {
    it("includes express import", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain('import express from "express"');
    });

    it("includes cors import when enabled (default)", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain('import cors from "cors"');
    });

    it("includes router import", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain('import router from "./routes/index.js"');
    });

    it("excludes cors import when disabled", () => {
      const files = emitter.emit({ enableCors: false });

      expect(files[0].content).not.toContain('import cors from "cors"');
    });
  });

  describe("middleware", () => {
    it("includes express.json() middleware", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain("app.use(express.json())");
    });

    it("includes cors() middleware when enabled (default)", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain("app.use(cors())");
    });

    it("excludes cors() middleware when disabled", () => {
      const files = emitter.emit({ enableCors: false });

      expect(files[0].content).not.toContain("app.use(cors())");
    });
  });

  describe("routing", () => {
    it("mounts router at /api by default", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain('app.use("/api", router)');
    });

    it("uses custom API base path when specified", () => {
      const files = emitter.emit({ apiBasePath: "/v1" });

      expect(files[0].content).toContain('app.use("/v1", router)');
    });
  });

  describe("server", () => {
    it("includes app.listen with PORT", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain("app.listen(PORT");
    });

    it("uses default port expression", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain("process.env.PORT || 3000");
    });

    it("uses custom port when specified as number", () => {
      const files = emitter.emit({ port: 8080 });

      expect(files[0].content).toContain("const PORT = 8080");
    });

    it("uses custom port expression when specified as string", () => {
      const files = emitter.emit({ port: "process.env.API_PORT || 4000" });

      expect(files[0].content).toContain("const PORT = process.env.API_PORT || 4000");
    });

    it("includes console.log in listen callback", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain("console.log");
      expect(files[0].content).toContain("Server running on port");
    });
  });

  describe("app setup", () => {
    it("creates express app instance", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain("const app = express()");
    });
  });

  describe("configuration combinations", () => {
    it("handles all options together", () => {
      const files = emitter.emit({
        port: 5000,
        apiBasePath: "/api/v2",
        enableCors: true,
      });

      expect(files[0].content).toContain("const PORT = 5000");
      expect(files[0].content).toContain('app.use("/api/v2", router)');
      expect(files[0].content).toContain("app.use(cors())");
    });

    it("handles minimal config with cors disabled", () => {
      const files = emitter.emit({
        enableCors: false,
      });

      expect(files[0].content).not.toContain("cors");
      expect(files[0].content).toContain("express");
      expect(files[0].content).toContain("router");
    });
  });
});
