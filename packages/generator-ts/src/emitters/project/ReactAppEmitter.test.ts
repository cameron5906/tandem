import { describe, it, expect } from "vitest";
import { ReactAppEmitter } from "./ReactAppEmitter";

describe("ReactAppEmitter", () => {
  const emitter = new ReactAppEmitter();

  describe("file output", () => {
    it("generates two files", () => {
      const files = emitter.emit();

      expect(files).toHaveLength(2);
    });

    it("generates src/main.tsx file", () => {
      const files = emitter.emit();
      const mainFile = files.find((f) => f.path === "src/main.tsx");

      expect(mainFile).toBeDefined();
    });

    it("generates src/App.tsx file", () => {
      const files = emitter.emit();
      const appFile = files.find((f) => f.path === "src/App.tsx");

      expect(appFile).toBeDefined();
    });
  });

  describe("main.tsx generation", () => {
    function getMainContent() {
      const files = emitter.emit();
      return files.find((f) => f.path === "src/main.tsx")!.content;
    }

    it("includes React imports", () => {
      const content = getMainContent();

      expect(content).toContain('import React from "react"');
      expect(content).toContain('import ReactDOM from "react-dom/client"');
    });

    it("includes QueryClient import", () => {
      const content = getMainContent();

      expect(content).toContain("import { QueryClient, QueryClientProvider }");
      expect(content).toContain('@tanstack/react-query"');
    });

    it("includes App import", () => {
      const content = getMainContent();

      expect(content).toContain('import App from "./App"');
    });

    it("includes QueryClient setup", () => {
      const content = getMainContent();

      expect(content).toContain("const queryClient = new QueryClient()");
    });

    it("includes QueryClientProvider wrapper", () => {
      const content = getMainContent();

      expect(content).toContain("<QueryClientProvider client={queryClient}>");
      expect(content).toContain("</QueryClientProvider>");
    });

    it("includes StrictMode wrapper", () => {
      const content = getMainContent();

      expect(content).toContain("<React.StrictMode>");
      expect(content).toContain("</React.StrictMode>");
    });

    it("includes createRoot call", () => {
      const content = getMainContent();

      expect(content).toContain("ReactDOM.createRoot");
      expect(content).toContain('document.getElementById("root")');
    });

    it("includes render call with App component", () => {
      const content = getMainContent();

      expect(content).toContain("<App />");
    });
  });

  describe("App.tsx generation", () => {
    function getAppContent(config?: { appTitle?: string }) {
      const files = emitter.emit(config);
      return files.find((f) => f.path === "src/App.tsx")!.content;
    }

    it('uses default app title "Tandem App"', () => {
      const content = getAppContent();

      expect(content).toContain("<h1>Tandem App</h1>");
    });

    it("uses custom app title when specified", () => {
      const content = getAppContent({ appTitle: "My Custom App" });

      expect(content).toContain("<h1>My Custom App</h1>");
    });

    it("exports default App component", () => {
      const content = getAppContent();

      expect(content).toContain("export default App");
    });

    it("defines App function component", () => {
      const content = getAppContent();

      expect(content).toContain("function App()");
    });

    it("returns JSX with div wrapper", () => {
      const content = getAppContent();

      expect(content).toContain("<div>");
      expect(content).toContain("</div>");
    });

    it("includes placeholder comment", () => {
      const content = getAppContent();

      expect(content).toContain("{/* Your components here */}");
    });
  });

  describe("configuration", () => {
    it("accepts empty config object", () => {
      const files = emitter.emit({});

      expect(files).toHaveLength(2);
    });

    it("app title only affects App.tsx", () => {
      const files = emitter.emit({ appTitle: "Custom Title" });
      const mainContent = files.find((f) => f.path === "src/main.tsx")!.content;
      const appContent = files.find((f) => f.path === "src/App.tsx")!.content;

      expect(mainContent).not.toContain("Custom Title");
      expect(appContent).toContain("Custom Title");
    });
  });
});
