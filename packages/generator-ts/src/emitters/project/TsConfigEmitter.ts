import { GeneratedFile } from "@tandem-lang/generator-core";

/**
 * Target environment for TypeScript configuration.
 */
export type TsConfigTarget = "node" | "browser";

/**
 * Emitter for generating tsconfig.json files.
 */
export class TsConfigEmitter {
  emit(target: TsConfigTarget): GeneratedFile[] {
    const config =
      target === "node" ? this.createNodeConfig() : this.createBrowserConfig();

    return [
      {
        path: "tsconfig.json",
        content: JSON.stringify(config, null, 2) + "\n",
      },
    ];
  }

  /**
   * Create Node.js-optimized TypeScript configuration.
   */
  private createNodeConfig(): object {
    return {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
        outDir: "dist",
        rootDir: "src",
        declaration: true,
      },
      include: ["src/**/*.ts"],
      exclude: ["node_modules", "dist"],
    };
  }

  /**
   * Create browser-optimized TypeScript configuration.
   */
  private createBrowserConfig(): object {
    return {
      compilerOptions: {
        target: "ES2020",
        module: "ESNext",
        moduleResolution: "bundler",
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        jsx: "react-jsx",
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        isolatedModules: true,
        resolveJsonModule: true,
      },
      include: ["src"],
      exclude: ["node_modules"],
    };
  }
}
