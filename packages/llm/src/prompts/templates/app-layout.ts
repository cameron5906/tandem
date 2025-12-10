import type {
  IAppLayoutPromptTemplate,
  PromptTemplateConfig,
  LLMMessage,
  AppLayoutGenerationContext,
  ComponentSummary,
} from "../../interfaces";

/**
 * Prompt template for generating React App layout with component composition.
 */
export class AppLayoutTemplate implements IAppLayoutPromptTemplate {
  readonly config: PromptTemplateConfig = {
    id: "app-layout-v1",
    target: "app-layout",
    version: "1.0.0",
    description: "Generates React App component layout with component composition",
  };

  /**
   * Build the full message array for the LLM.
   */
  buildMessages(context: AppLayoutGenerationContext): LLMMessage[] {
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
  estimateTokens(context: AppLayoutGenerationContext): number {
    const messages = this.buildMessages(context);
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * Build the system prompt establishing the AI's role and guidelines.
   */
  private buildSystemPrompt(): string {
    return `You are an expert React developer creating an App component layout.

Your task is to compose available components into a cohesive single-page application.

## Guidelines

### Layout Principles
- Create a clear visual hierarchy with header, main content area
- Use semantic HTML elements (main, header, section, nav)
- Ensure the layout is responsive using Tailwind CSS
- Include appropriate spacing and visual grouping
- Create a professional, clean interface

### Component Usage
- All components are imported from "./components" (imports are handled separately)
- Use components based on their element type and purpose:
  - **dashboard**: Feature prominently as the main view
  - **list/table**: Display collections of data
  - **form**: Allow data entry (often triggered by buttons or modals)
  - **modal**: Show in response to user actions (use state to control visibility)
  - **card**: Display individual items
  - **detail**: Show detailed information for selected items

### State Management
- Use useState for UI state (modal visibility, selected items, active views)
- React Query hooks are available for data fetching if needed
- Handle loading and error states gracefully

### Accessibility
- Include proper heading hierarchy (h1 for app title, h2 for sections)
- Add ARIA labels where appropriate
- Ensure keyboard navigation works

## Output Format

Return a JSON object with this structure:
{
  "jsx": "// The JSX content inside return()",
  "hooks": ["// React Query or other hooks at component start"],
  "handlers": [{ "name": "handleOpenModal", "implementation": "const handleOpenModal = () => { setIsModalOpen(true); };" }],
  "stateDeclarations": ["const [isModalOpen, setIsModalOpen] = useState(false);"]
}

IMPORTANT:
- The jsx field contains ONLY what goes inside return()
- Do NOT include imports, component declaration, or exports
- Do NOT include the function signature or return keyword
- Use 2-space indentation
- All component names are exactly as provided (case-sensitive)`;
  }

  /**
   * Build the user prompt with specific context.
   */
  private buildUserPrompt(context: AppLayoutGenerationContext): string {
    const parts: string[] = [
      `Create an App layout for "${context.appTitle}"`,
      "",
      "## Available Components",
      "",
    ];

    // List all components with their details
    for (const comp of context.components) {
      parts.push(`### ${comp.name}`);
      parts.push(`- **Element**: ${comp.element}`);
      if (comp.displayType) {
        parts.push(`- **Displays**: ${comp.displayType}`);
      }
      if (comp.bindsIntent) {
        parts.push(`- **Binds**: ${comp.bindsIntent} (form submission)`);
      }
      if (comp.actions && comp.actions.length > 0) {
        parts.push(`- **Actions**: ${comp.actions.join(", ")}`);
      }
      if (comp.spec) {
        parts.push(`- **Purpose**: ${comp.spec}`);
      }
      parts.push("");
    }

    // Layout requirements
    parts.push("## Layout Requirements");
    parts.push("");
    parts.push("1. Create a single-page layout (no routing)");
    parts.push("2. Include a header with the app title");
    parts.push("3. Arrange components logically based on their purpose");
    parts.push("");

    // Component-specific guidance
    if (context.hasDashboard) {
      const dashboardComp = context.components.find(c => c.element === "dashboard");
      if (dashboardComp) {
        parts.push(`4. Feature the **${dashboardComp.name}** dashboard component prominently as the main view`);
      }
    }

    if (context.listComponents.length > 0) {
      const listNames = context.listComponents.map(c => `**${c.name}**`).join(", ");
      parts.push(`5. Display list/table components: ${listNames}`);
    }

    if (context.formComponents.length > 0) {
      const formNames = context.formComponents.map(c => `**${c.name}**`).join(", ");
      parts.push(`6. Include form components with appropriate triggers (buttons): ${formNames}`);
    }

    if (context.modalComponents.length > 0) {
      const modalNames = context.modalComponents.map(c => `**${c.name}**`).join(", ");
      parts.push(`7. Modal components should be conditionally rendered based on state: ${modalNames}`);
      parts.push("   - Use useState to track modal visibility");
      parts.push("   - Pass isOpen and onClose props to modals");
    }

    // Props guidance
    parts.push("");
    parts.push("## Component Props");
    parts.push("");
    parts.push("When using components, pass appropriate props based on element type:");
    parts.push("- **list/table**: Pass `data` array and `isLoading` boolean");
    parts.push("- **form**: Pass `onSuccess` and `onError` callbacks");
    parts.push("- **modal**: Pass `isOpen`, `onClose`, and optionally `data`");
    parts.push("- **card/detail**: Pass `data` object");
    parts.push("");
    parts.push("Note: You may need to fetch data using React Query hooks (useListX, useGetX patterns)");

    return parts.join("\n");
  }
}
