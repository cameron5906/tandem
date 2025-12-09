import { describe, it, expect } from "vitest";
import { HtmlEntryEmitter } from "./HtmlEntryEmitter";

describe("HtmlEntryEmitter", () => {
  const emitter = new HtmlEntryEmitter();

  describe("file output", () => {
    it("generates index.html file", () => {
      const files = emitter.emit();

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe("index.html");
    });
  });

  describe("HTML structure", () => {
    it("includes DOCTYPE declaration", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain("<!DOCTYPE html>");
    });

    it("includes html element with lang attribute", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain("<html");
      expect(files[0].content).toContain("</html>");
    });

    it("includes head element", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain("<head>");
      expect(files[0].content).toContain("</head>");
    });

    it("includes body element", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain("<body>");
      expect(files[0].content).toContain("</body>");
    });

    it("includes root div element", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain('<div id="root"></div>');
    });

    it("includes script tag for main.tsx", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain('<script type="module" src="/src/main.tsx"></script>');
    });
  });

  describe("meta tags", () => {
    it("includes charset meta tag", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain('<meta charset="UTF-8"');
    });

    it("includes viewport meta tag", () => {
      const files = emitter.emit();

      expect(files[0].content).toContain('<meta name="viewport"');
      expect(files[0].content).toContain("width=device-width");
      expect(files[0].content).toContain("initial-scale=1.0");
    });
  });

  describe("title configuration", () => {
    it('uses default title "Tandem App"', () => {
      const files = emitter.emit();

      expect(files[0].content).toContain("<title>Tandem App</title>");
    });

    it("uses custom title when specified", () => {
      const files = emitter.emit({ title: "My Custom App" });

      expect(files[0].content).toContain("<title>My Custom App</title>");
      expect(files[0].content).not.toContain("<title>Tandem App</title>");
    });
  });

  describe("lang configuration", () => {
    it('uses default lang "en"', () => {
      const files = emitter.emit();

      expect(files[0].content).toContain('lang="en"');
    });

    it("uses custom lang when specified", () => {
      const files = emitter.emit({ lang: "es" });

      expect(files[0].content).toContain('lang="es"');
      expect(files[0].content).not.toContain('lang="en"');
    });

    it("supports various language codes", () => {
      const languages = ["fr", "de", "ja", "zh"];

      for (const lang of languages) {
        const files = emitter.emit({ lang });
        expect(files[0].content).toContain(`lang="${lang}"`);
      }
    });
  });

  describe("configuration combinations", () => {
    it("accepts empty config object", () => {
      const files = emitter.emit({});

      expect(files).toHaveLength(1);
      expect(files[0].content).toContain("<!DOCTYPE html>");
    });

    it("handles custom title and lang together", () => {
      const files = emitter.emit({
        title: "Mon Application",
        lang: "fr",
      });

      expect(files[0].content).toContain("<title>Mon Application</title>");
      expect(files[0].content).toContain('lang="fr"');
    });

    it("handles only title specified", () => {
      const files = emitter.emit({ title: "Custom Title" });

      expect(files[0].content).toContain("<title>Custom Title</title>");
      expect(files[0].content).toContain('lang="en"');
    });

    it("handles only lang specified", () => {
      const files = emitter.emit({ lang: "de" });

      expect(files[0].content).toContain("<title>Tandem App</title>");
      expect(files[0].content).toContain('lang="de"');
    });
  });

  describe("HTML validity", () => {
    it("has properly nested elements", () => {
      const files = emitter.emit();
      const content = files[0].content;

      // Check that html comes before head, head comes before body
      const htmlIndex = content.indexOf("<html");
      const headIndex = content.indexOf("<head>");
      const bodyIndex = content.indexOf("<body>");

      expect(htmlIndex).toBeLessThan(headIndex);
      expect(headIndex).toBeLessThan(bodyIndex);
    });

    it("closes all opened tags", () => {
      const files = emitter.emit();
      const content = files[0].content;

      expect(content).toContain("</html>");
      expect(content).toContain("</head>");
      expect(content).toContain("</body>");
      expect(content).toContain("</title>");
    });
  });
});
