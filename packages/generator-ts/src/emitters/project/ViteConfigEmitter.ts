import { GeneratedFile } from "@tandem-lang/generator-core";

/**
 * Configuration for Vite config generation.
 */
export interface ViteConfig {
  /** Backend API URL for proxy configuration */
  apiProxyTarget?: string;
  /** API path prefix to proxy */
  apiPath?: string;
}

/**
 * Emitter for generating Vite configuration.
 */
export class ViteConfigEmitter {
  emit(config: ViteConfig = {}): GeneratedFile[] {
    const apiProxyTarget = config.apiProxyTarget ?? "http://localhost:3000";
    const apiPath = config.apiPath ?? "/api";

    const content = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "${apiPath}": "${apiProxyTarget}",
    },
  },
});
`;

    return [
      {
        path: "vite.config.ts",
        content,
      },
    ];
  }
}
