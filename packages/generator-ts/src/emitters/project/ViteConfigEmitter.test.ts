import { describe, it, expect } from "vitest";
import { ViteConfigEmitter } from "./ViteConfigEmitter";

describe("ViteConfigEmitter", () => {
  const emitter = new ViteConfigEmitter();

  describe("file output", () => {
    it("generates vite.config.ts file", () => {
      const files = emitter.emit();

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe("vite.config.ts");
    });
  });

  describe("imports", () => {
    it("includes defineConfig import", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain('import { defineConfig } from "vite"');
    });

    it("includes react plugin import", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain('import react from "@vitejs/plugin-react"');
    });
  });

  describe("config structure", () => {
    it("exports defineConfig call", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain("export default defineConfig({");
    });

    it("includes plugins array with react", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain("plugins: [react()]");
    });

    it("includes server configuration", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain("server: {");
    });
  });

  describe("API proxy configuration", () => {
    it("configures proxy in server section", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain("proxy: {");
    });

    it('uses default API path "/api"', () => {
      const files = emitter.emit();

      expect(files[0].content).toContain('"/api"');
    });

    it("uses custom API path when specified", () => {
      const files = emitter.emit({ apiPath: "/v1" });

      expect(files[0].content).toContain('"/v1"');
      expect(files[0].content).not.toContain('"/api"');
    });

    it('uses default proxy target "http://localhost:3000"', () => {
      const files = emitter.emit();

      expect(files[0].content).toContain('"http://localhost:3000"');
    });

    it("uses custom proxy target when specified", () => {
      const files = emitter.emit({ apiProxyTarget: "http://localhost:8080" });

      expect(files[0].content).toContain('"http://localhost:8080"');
      expect(files[0].content).not.toContain('"http://localhost:3000"');
    });
  });

  describe("configuration combinations", () => {
    it("accepts empty config object", () => {
      const files = emitter.emit({});

      expect(files).toHaveLength(1);
      expect(files[0].content).toContain("defineConfig");
    });

    it("handles custom apiPath and apiProxyTarget together", () => {
      const files = emitter.emit({
        apiPath: "/api/v2",
        apiProxyTarget: "http://backend:5000",
      });

      expect(files[0].content).toContain('"/api/v2"');
      expect(files[0].content).toContain('"http://backend:5000"');
    });

    it("handles only apiPath specified", () => {
      const files = emitter.emit({ apiPath: "/graphql" });

      expect(files[0].content).toContain('"/graphql"');
      expect(files[0].content).toContain('"http://localhost:3000"');
    });

    it("handles only apiProxyTarget specified", () => {
      const files = emitter.emit({ apiProxyTarget: "http://api.example.com" });

      expect(files[0].content).toContain('"/api"');
      expect(files[0].content).toContain('"http://api.example.com"');
    });
  });
});
