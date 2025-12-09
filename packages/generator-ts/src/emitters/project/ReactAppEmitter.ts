import { GeneratedFile } from "@tandem-lang/generator-core";

/**
 * Configuration for React app generation.
 */
export interface ReactAppConfig {
  /** Application title */
  appTitle?: string;
}

/**
 * Emitter for generating React application entry point and App component.
 */
export class ReactAppEmitter {
  emit(config: ReactAppConfig = {}): GeneratedFile[] {
    const appTitle = config.appTitle ?? "Tandem App";

    return [this.generateMain(), this.generateApp(appTitle)];
  }

  private generateMain(): GeneratedFile {
    const content = `import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
`;

    return {
      path: "src/main.tsx",
      content,
    };
  }

  private generateApp(appTitle: string): GeneratedFile {
    const content = `function App() {
  return (
    <div>
      <h1>${appTitle}</h1>
      {/* Your components here */}
    </div>
  );
}

export default App;
`;

    return {
      path: "src/App.tsx",
      content,
    };
  }
}
