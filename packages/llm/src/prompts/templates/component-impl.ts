import type {
  IComponentPromptTemplate,
  PromptTemplateConfig,
  LLMMessage,
  ComponentGenerationContext,
  ResolvedTypeInfo,
} from "../../interfaces";

/**
 * Prompt template for generating React component JSX implementations.
 */
export class ComponentJSXTemplate implements IComponentPromptTemplate {
  readonly config: PromptTemplateConfig = {
    id: "component-jsx-v1",
    target: "component-jsx",
    version: "1.0.0",
    description: "Generates React component JSX implementation",
  };

  /**
   * Build the full message array for the LLM.
   */
  buildMessages(context: ComponentGenerationContext): LLMMessage[] {
    return [
      {
        role: "system",
        content: this.buildSystemPrompt(),
      },
      {
        role: "user",
        content: this.buildUserPrompt(context),
      },
    ];
  }

  /**
   * Estimate token count for this prompt.
   */
  estimateTokens(context: ComponentGenerationContext): number {
    const messages = this.buildMessages(context);
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * Build the system prompt establishing the AI's role and guidelines.
   */
  private buildSystemPrompt(): string {
    return `You are an expert React developer generating component implementations.

Your task is to generate the JSX content for React components based on the provided specification.

## Guidelines

### React Best Practices
- Use functional components with hooks
- Use semantic HTML elements
- Follow accessibility best practices (ARIA labels, semantic structure)
- Handle loading and error states gracefully
- Keep components focused and composable

### Styling
- Use Tailwind CSS classes for styling (assume it's available)
- Create visually appealing, professional layouts
- Ensure responsive design where appropriate
- Use consistent spacing and typography

### State & Hooks
- Use React Query hooks that are provided (use\${IntentName} pattern)
- Handle loading, error, and empty states
- Use proper TypeScript types for state

### Accessibility
- Include proper ARIA labels
- Ensure keyboard navigation works
- Use semantic HTML (button, nav, main, etc.)

## Output Format

Return a JSON object with this structure:
{
  "jsx": "// The JSX content inside the return statement",
  "hooks": ["// Any additional hooks needed at component start"],
  "styles": "// Optional: Any inline styles or CSS-in-JS if needed"
}

The JSX should be what goes inside the return() statement.
Do NOT include the component declaration, imports, or exports.
Use 2-space indentation.`;
  }

  /**
   * Build the user prompt with specific context.
   */
  private buildUserPrompt(context: ComponentGenerationContext): string {
    const {
      component,
      displayType,
      boundIntent,
      actionIntents,
      relatedTypes,
      moduleName,
      spec,
      elementSemantics,
    } = context;

    const parts: string[] = [
      "Generate the JSX for this React component:",
      "",
      `## Component: ${component.name}`,
      `## Element Type: ${component.element}`,
      `## Module: ${moduleName}`,
      "",
    ];

    // Specification
    if (spec) {
      parts.push("## Specification");
      parts.push(spec);
      parts.push("");
    }

    // Element semantics
    parts.push("## Element Semantics");
    parts.push(`- **Purpose**: ${elementSemantics.purpose}`);
    parts.push(
      `- **Expected Behaviors**: ${elementSemantics.expectedBehaviors.join(", ")}`,
    );
    parts.push(
      `- **Common Patterns**: ${elementSemantics.commonPatterns.join(", ")}`,
    );
    parts.push("");

    // Display type
    if (displayType) {
      parts.push("## Display Type");
      parts.push("The component displays data of this type:");
      parts.push("```typescript");
      parts.push(this.formatTypeInfo(displayType));
      parts.push("```");
      parts.push("");
    }

    // Bound intent (for forms)
    if (boundIntent) {
      parts.push("## Bound Intent");
      parts.push("This component submits data via this intent:");
      parts.push(`- **Name**: ${boundIntent.name}`);
      parts.push(
        `- **Input Fields**: ${boundIntent.inputType.fields.map((f) => f.name).join(", ")}`,
      );
      parts.push(
        `- **Hook**: use${this.extractShortName(boundIntent.name)}()`,
      );
      parts.push("");
    }

    // Action intents
    if (actionIntents.length > 0) {
      parts.push("## Action Intents");
      parts.push("These intents are available as actions:");
      for (const intent of actionIntents) {
        parts.push(
          `- ${intent.name} (hook: use${this.extractShortName(intent.name)}())`,
        );
      }
      parts.push("");
    }

    // Related types
    if (relatedTypes.length > 0) {
      parts.push("## Related Types");
      for (const type of relatedTypes) {
        parts.push("```typescript");
        parts.push(this.formatTypeInfo(type));
        parts.push("```");
      }
      parts.push("");
    }

    // Element-specific instructions
    parts.push("## Instructions");
    parts.push(...this.getElementInstructions(component.element));

    return parts.join("\n");
  }

  /**
   * Get element-specific generation instructions.
   */
  private getElementInstructions(
    element: string,
  ): string[] {
    switch (element) {
      case "card":
        return [
          "1. Create a card layout with clear visual boundaries",
          "2. Display all fields of the data type",
          "3. Include action buttons if actions are provided",
          "4. Use a header for the primary identifier (name, title, etc.)",
          "5. Handle the case when data is loading or unavailable",
        ];

      case "form":
        return [
          "1. Generate form fields for all input type fields",
          "2. Use appropriate input types (text, email, number, etc.)",
          "3. Include labels for each field",
          "4. Add a submit button that triggers the bound mutation",
          "5. Show loading state during submission",
          "6. Display validation errors near the relevant fields",
        ];

      case "list":
        return [
          "1. Iterate over the data array",
          "2. Render each item using the item component if specified",
          "3. Handle empty state with the emptyState message or a default",
          "4. Show a loading indicator while data is being fetched",
          "5. Consider adding key props for list items",
        ];

      case "table":
        return [
          "1. Create a table with columns based on the type fields",
          "2. Generate column headers from field names",
          "3. Render data rows from the list",
          "4. Format values appropriately (dates, numbers, etc.)",
          "5. Handle empty state when no data is available",
        ];

      case "modal":
        return [
          "1. Create a modal overlay with backdrop",
          "2. Center the modal content",
          "3. Include a close button in the header",
          "4. Handle escape key to close the modal",
          "5. Include the form or content based on the bound intent",
        ];

      case "detail":
        return [
          "1. Display all fields of the data type",
          "2. Use labels for each field",
          "3. Group related fields together",
          "4. Include action buttons if actions are provided",
          "5. Handle loading and error states",
        ];

      case "button":
        return [
          "1. Create a styled button element",
          "2. Handle click events to trigger the action",
          "3. Show loading state when the action is in progress",
          "4. Disable when appropriate",
        ];

      case "dashboard":
        return [
          "1. Create a grid layout for multiple widgets",
          "2. Include summary metrics or cards",
          "3. Arrange content in a visually balanced way",
          "4. Consider responsive layout for different screen sizes",
        ];

      default:
        return [
          "1. Implement the component based on its specification",
          "2. Handle loading and error states",
          "3. Use appropriate semantic HTML",
          "4. Include accessibility attributes",
        ];
    }
  }

  /**
   * Format type information for display in the prompt.
   */
  private formatTypeInfo(info: ResolvedTypeInfo): string {
    const shortName = info.fqn.split(".").pop() ?? info.fqn;

    if (info.kind === "record" && info.fields) {
      const fields = info.fields
        .map((f) => `  ${f.name}${f.isOptional ? "?" : ""}: ${f.type};`)
        .join("\n");
      return `interface ${shortName} {\n${fields}\n}`;
    }

    if (info.kind === "alias") {
      return `type ${shortName} = ${info.tsType};`;
    }

    return `type ${shortName} = ${info.tsType};`;
  }

  /**
   * Extract short name from FQN.
   */
  private extractShortName(fqn: string): string {
    const parts = fqn.split(".");
    return parts[parts.length - 1];
  }
}
