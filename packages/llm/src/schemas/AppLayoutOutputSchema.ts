import { z } from "zod";

/**
 * Schema for LLM-generated App layout output.
 *
 * This schema defines the expected structure of the LLM's response
 * when generating the main App component layout.
 */
export const AppLayoutOutputSchema = z.object({
  /**
   * The JSX content for the App component's return statement.
   * Should compose the available components into a cohesive layout.
   */
  jsx: z
    .string()
    .describe(
      "The JSX content for the App component's return statement. Should compose available components into a layout.",
    ),

  /**
   * React hooks used by the App component.
   * Each hook should be a complete hook statement (e.g., "const { data } = useListTasks()").
   */
  hooks: z
    .array(z.string())
    .nullable()
    .optional()
    .describe(
      "React hooks used (useState, useEffect, React Query hooks, etc.). Each entry is a complete hook statement.",
    ),

  /**
   * Event handlers used in the App component.
   */
  handlers: z
    .array(
      z.object({
        name: z.string().describe("Handler function name (e.g., handleOpenModal)"),
        implementation: z
          .string()
          .describe("Complete handler function implementation"),
      }),
    )
    .nullable()
    .optional()
    .describe("Event handlers used in the App component"),

  /**
   * State variable declarations.
   * Each entry should be a complete useState declaration.
   */
  stateDeclarations: z
    .array(z.string())
    .nullable()
    .optional()
    .describe(
      "State variable declarations (e.g., 'const [isModalOpen, setIsModalOpen] = useState(false);')",
    ),
});

/**
 * Type for App layout output from LLM.
 */
export type AppLayoutOutput = z.infer<typeof AppLayoutOutputSchema>;
