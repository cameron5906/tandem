import { GeneratedFile } from "@tandem-lang/generator-core";

/**
 * Configuration for package.json generation.
 */
export interface PackageJsonConfig {
  /** Package name */
  name: string;
  /** Package version */
  version?: string;
  /** Module type (ESM or CommonJS) */
  type?: "module" | "commonjs";
  /** npm scripts */
  scripts: Record<string, string>;
  /** Production dependencies */
  dependencies: Record<string, string>;
  /** Development dependencies */
  devDependencies: Record<string, string>;
}

/**
 * Emitter for generating package.json files.
 */
export class PackageJsonEmitter {
  emit(config: PackageJsonConfig): GeneratedFile[] {
    const packageJson = {
      name: config.name,
      version: config.version ?? "0.1.0",
      type: config.type ?? "module",
      scripts: config.scripts,
      dependencies: this.sortDependencies(config.dependencies),
      devDependencies: this.sortDependencies(config.devDependencies),
    };

    return [
      {
        path: "package.json",
        content: JSON.stringify(packageJson, null, 2) + "\n",
      },
    ];
  }

  /**
   * Sort dependencies alphabetically for consistent output.
   */
  private sortDependencies(
    deps: Record<string, string>
  ): Record<string, string> {
    const sorted: Record<string, string> = {};
    for (const key of Object.keys(deps).sort()) {
      sorted[key] = deps[key];
    }
    return sorted;
  }
}

/**
 * Default Express backend dependencies.
 */
export const EXPRESS_DEPENDENCIES: Record<string, string> = {
  express: "^4.18.0",
  cors: "^2.8.5",
};

/**
 * Default Express backend dev dependencies.
 */
export const EXPRESS_DEV_DEPENDENCIES: Record<string, string> = {
  "@types/express": "^4.17.0",
  "@types/cors": "^2.8.0",
  "@types/node": "^20.0.0",
  typescript: "^5.0.0",
  tsx: "^4.0.0",
};

/**
 * Default Express npm scripts.
 */
export const EXPRESS_SCRIPTS: Record<string, string> = {
  dev: "tsx watch src/index.ts",
  build: "tsc",
  start: "node dist/index.js",
};

/**
 * Default React frontend dependencies.
 */
export const REACT_DEPENDENCIES: Record<string, string> = {
  react: "^18.2.0",
  "react-dom": "^18.2.0",
  "@tanstack/react-query": "^5.0.0",
};

/**
 * Default React frontend dev dependencies.
 */
export const REACT_DEV_DEPENDENCIES: Record<string, string> = {
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0",
  "@vitejs/plugin-react": "^4.0.0",
  typescript: "^5.0.0",
  vite: "^5.0.0",
};

/**
 * Default React npm scripts.
 */
export const REACT_SCRIPTS: Record<string, string> = {
  dev: "vite",
  build: "tsc && vite build",
  preview: "vite preview",
};
