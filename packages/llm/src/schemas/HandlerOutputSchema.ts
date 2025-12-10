import { z } from "zod";

/**
 * Schema for LLM-generated handler implementation output.
 *
 * This schema defines the expected structure of the LLM's response
 * when generating Express route handler implementations.
 */
export const HandlerOutputSchema = z.object({
  /**
   * The main handler implementation code.
   * This should be a complete, valid TypeScript function body.
   */
  implementation: z
    .string()
    .describe(
      "The complete handler implementation code as valid TypeScript. Should include the full function body with proper error handling.",
    ),

  /**
   * Optional validation code for input data.
   * If provided, this will be inserted before the main implementation.
   */
  validation: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Optional input validation code to check request parameters before processing.",
    ),

  /**
   * Optional list of imports needed by the implementation.
   */
  imports: z
    .array(z.string())
    .nullable()
    .optional()
    .describe("List of import statements needed by this implementation."),

  /**
   * Optional explanatory comments about the implementation.
   */
  comments: z
    .array(z.string())
    .nullable()
    .optional()
    .describe(
      "Optional comments explaining key implementation decisions or assumptions.",
    ),
});

/**
 * Type for handler output from LLM.
 */
export type HandlerOutput = z.infer<typeof HandlerOutputSchema>;

/**
 * Schema for complete handler code including wrapper.
 * Used for generating the full file content.
 */
export const HandlerFileSchema = z.object({
  /**
   * The complete file content including imports and exports.
   */
  fileContent: z
    .string()
    .describe(
      "Complete TypeScript file content for the handler, including all imports, type definitions, and the exported handler function.",
    ),

  /**
   * Name of the exported handler function.
   */
  handlerName: z
    .string()
    .describe("The name of the exported handler function."),

  /**
   * Additional type definitions if any.
   */
  typeDefinitions: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Any additional type definitions needed by the handler, not covered by imported types.",
    ),
});

export type HandlerFile = z.infer<typeof HandlerFileSchema>;
