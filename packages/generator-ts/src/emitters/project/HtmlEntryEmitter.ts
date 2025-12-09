import { GeneratedFile } from "@tandem-lang/generator-core";

/**
 * Configuration for HTML entry point generation.
 */
export interface HtmlEntryConfig {
  /** Page title */
  title?: string;
  /** Language attribute */
  lang?: string;
}

/**
 * Emitter for generating index.html entry point.
 */
export class HtmlEntryEmitter {
  emit(config: HtmlEntryConfig = {}): GeneratedFile[] {
    const title = config.title ?? "Tandem App";
    const lang = config.lang ?? "en";

    const content = `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

    return [
      {
        path: "index.html",
        content,
      },
    ];
  }
}
