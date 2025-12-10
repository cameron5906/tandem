import { z } from "zod";

/**
 * Schema for LLM-generated React component output.
 *
 * This schema defines the expected structure of the LLM's response
 * when generating React component implementations.
 */
export const ComponentOutputSchema = z.object({
  /**
   * The main JSX content for the component.
   * This should be valid TSX that can be rendered.
   */
  jsx: z
    .string()
    .describe(
      "The complete JSX/TSX content for the component. Should be a valid React component body.",
    ),

  /**
   * Optional hooks used by the component.
   * Each hook should be a complete hook statement.
   */
  hooks: z
    .array(z.string())
    .nullable()
    .optional()
    .describe(
      "React hooks used by the component (useState, useEffect, custom hooks, etc.)",
    ),

  /**
   * Optional event handlers for the component.
   */
  handlers: z
    .array(
      z.object({
        name: z.string().describe("Name of the handler function"),
        implementation: z
          .string()
          .describe("Implementation of the handler function"),
      }),
    )
    .nullable()
    .optional()
    .describe("Event handlers used by the component (onClick, onChange, etc.)"),

  /**
   * Optional styles for the component.
   * Can be CSS-in-JS, Tailwind classes, or plain CSS.
   */
  styles: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Optional styling for the component. Can be inline styles object, CSS-in-JS, or Tailwind classes.",
    ),

  /**
   * Optional list of imports needed by the component.
   */
  imports: z
    .array(z.string())
    .nullable()
    .optional()
    .describe("List of import statements needed by this component."),
});

/**
 * Type for component output from LLM.
 */
export type ComponentOutput = z.infer<typeof ComponentOutputSchema>;

/**
 * Schema for complete component file.
 * Used for generating the full file content.
 */
export const ComponentFileSchema = z.object({
  /**
   * The complete file content including imports and exports.
   */
  fileContent: z
    .string()
    .describe(
      "Complete TSX file content for the component, including all imports, type definitions, hooks, and the exported component function.",
    ),

  /**
   * Name of the exported component.
   */
  componentName: z.string().describe("The name of the exported component."),

  /**
   * Props interface definition if the component accepts props.
   */
  propsInterface: z
    .string()
    .nullable()
    .optional()
    .describe("TypeScript interface definition for the component's props."),

  /**
   * Additional type definitions if any.
   */
  typeDefinitions: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Any additional type definitions needed by the component, not covered by imported types.",
    ),
});

export type ComponentFile = z.infer<typeof ComponentFileSchema>;

/**
 * Schema for form-specific component output.
 * Extends component output with form-related fields.
 */
export const FormComponentOutputSchema = ComponentOutputSchema.extend({
  /**
   * Form field definitions.
   */
  fields: z
    .array(
      z.object({
        name: z.string().describe("Field name"),
        type: z
          .enum(["text", "email", "password", "number", "textarea", "select"])
          .describe("Input type"),
        label: z.string().describe("Field label"),
        validation: z.string().nullable().optional().describe("Validation rules"),
      }),
    )
    .nullable()
    .optional()
    .describe("Form field definitions"),

  /**
   * Form submission handler.
   */
  onSubmit: z
    .string()
    .nullable()
    .optional()
    .describe("Form submission handler implementation"),
});

export type FormComponentOutput = z.infer<typeof FormComponentOutputSchema>;
