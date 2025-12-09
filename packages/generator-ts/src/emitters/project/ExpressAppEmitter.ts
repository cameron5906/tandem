import { GeneratedFile } from "@tandem-lang/generator-core";

/**
 * Configuration for Express app entry point generation.
 */
export interface ExpressAppConfig {
  /** Port number or environment variable reference */
  port?: number | string;
  /** API base path */
  apiBasePath?: string;
  /** Enable CORS middleware */
  enableCors?: boolean;
}

/**
 * Emitter for generating Express application entry point.
 */
export class ExpressAppEmitter {
  emit(config: ExpressAppConfig = {}): GeneratedFile[] {
    const port = config.port ?? 'process.env.PORT || 3000';
    const apiBasePath = config.apiBasePath ?? "/api";
    const enableCors = config.enableCors ?? true;

    const imports = this.generateImports(enableCors);
    const middleware = this.generateMiddleware(enableCors);
    const routes = this.generateRoutes(apiBasePath);
    const listen = this.generateListen(port);

    const content = [imports, "", middleware, routes, "", listen].join("\n");

    return [
      {
        path: "src/index.ts",
        content: content + "\n",
      },
    ];
  }

  private generateImports(enableCors: boolean): string {
    const lines = ['import express from "express";'];
    if (enableCors) {
      lines.push('import cors from "cors";');
    }
    lines.push('import router from "./routes/index.js";');
    return lines.join("\n");
  }

  private generateMiddleware(enableCors: boolean): string {
    const lines = ["const app = express();", ""];
    if (enableCors) {
      lines.push("app.use(cors());");
    }
    lines.push("app.use(express.json());");
    return lines.join("\n");
  }

  private generateRoutes(apiBasePath: string): string {
    return `app.use("${apiBasePath}", router);`;
  }

  private generateListen(port: number | string): string {
    const portValue = typeof port === "number" ? port : port;
    return `const PORT = ${portValue};

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`;
  }
}
