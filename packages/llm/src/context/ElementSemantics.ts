import type { IRComponentElement } from "@tandem-lang/compiler";
import type { ComponentElementSemantics } from "../interfaces";

/**
 * Semantic information about each component element type.
 * This helps the LLM understand how to generate appropriate implementations.
 */
const ELEMENT_SEMANTICS: Record<IRComponentElement, ComponentElementSemantics> =
  {
    card: {
      element: "card",
      purpose: "Display data in a visually contained card layout",
      expectedBehaviors: [
        "Render all fields of the displayed type",
        "Support optional action buttons",
        "Handle loading and error states",
        "Be visually self-contained with clear boundaries",
      ],
      commonPatterns: [
        "Header with title/name field",
        "Body with additional fields",
        "Footer with action buttons",
        "Hover effects for interactivity",
      ],
    },

    form: {
      element: "form",
      purpose: "Collect user input and submit to a bound intent",
      expectedBehaviors: [
        "Generate input fields for all input type fields",
        "Validate input before submission",
        "Handle form submission via the bound intent",
        "Show loading state during submission",
        "Display success/error feedback",
      ],
      commonPatterns: [
        "Labeled input fields with proper types",
        "Submit button with loading indicator",
        "Error messages near relevant fields",
        "Form-level error display",
      ],
    },

    list: {
      element: "list",
      purpose: "Display a collection of items with an item component",
      expectedBehaviors: [
        "Iterate over List<T> data",
        "Render each item using the item component",
        "Handle empty state with fallback message",
        "Support loading state",
      ],
      commonPatterns: [
        "Virtualized scrolling for large lists",
        "Empty state with helpful message",
        "Loading skeleton placeholders",
        "Optional list header/footer",
      ],
    },

    table: {
      element: "table",
      purpose: "Display tabular data with columns based on type fields",
      expectedBehaviors: [
        "Generate columns from object keys",
        "Render rows from List<T> data",
        "Handle empty state",
        "Support sorting/filtering (optional)",
      ],
      commonPatterns: [
        "Column headers from field names",
        "Formatted cell values based on type",
        "Row hover highlighting",
        "Empty state message",
      ],
    },

    modal: {
      element: "modal",
      purpose: "Display content in an overlay dialog",
      expectedBehaviors: [
        "Render as an overlay above other content",
        "Support escape key to close",
        "Trap focus within modal",
        "Handle the bound mutation intent",
      ],
      commonPatterns: [
        "Dark backdrop overlay",
        "Centered content container",
        "Close button in header",
        "Action buttons in footer",
      ],
    },

    button: {
      element: "button",
      purpose: "Trigger an action or navigation",
      expectedBehaviors: [
        "Handle click events",
        "Show loading state during action",
        "Disabled state when not actionable",
        "Clear visual feedback",
      ],
      commonPatterns: [
        "Primary/secondary visual variants",
        "Icon support",
        "Loading spinner",
        "Disabled appearance",
      ],
    },

    detail: {
      element: "detail",
      purpose: "Display detailed information about a single item",
      expectedBehaviors: [
        "Show all fields of the displayed type",
        "Format values appropriately",
        "Support action buttons",
        "Handle loading state",
      ],
      commonPatterns: [
        "Field labels with values",
        "Grouped/sectioned content",
        "Edit/delete action buttons",
        "Back navigation",
      ],
    },

    dashboard: {
      element: "dashboard",
      purpose: "Display multiple widgets/metrics in a grid layout",
      expectedBehaviors: [
        "Layout multiple child components",
        "Support responsive grid",
        "Handle individual widget loading",
        "Aggregate data from multiple sources",
      ],
      commonPatterns: [
        "Grid/flexbox layout",
        "Metric cards with numbers",
        "Charts/graphs",
        "Recent activity lists",
      ],
    },
  };

/**
 * Fallback semantics for unknown element types.
 */
const UNKNOWN_ELEMENT_SEMANTICS: ComponentElementSemantics = {
  element: "card" as IRComponentElement, // Use card as fallback
  purpose: "Display content in a custom layout",
  expectedBehaviors: [
    "Render the provided data",
    "Handle loading and error states",
    "Support custom styling",
  ],
  commonPatterns: [
    "Flexible layout based on content",
    "Consistent visual styling",
    "Responsive design",
  ],
};

/**
 * Get semantic information for a component element type.
 *
 * @param element - The element type
 * @returns Semantic information (returns fallback for unknown elements)
 */
export function getElementSemantics(
  element: IRComponentElement,
): ComponentElementSemantics {
  return ELEMENT_SEMANTICS[element] ?? UNKNOWN_ELEMENT_SEMANTICS;
}

/**
 * Get all element semantics.
 */
export function getAllElementSemantics(): Record<
  IRComponentElement,
  ComponentElementSemantics
> {
  return ELEMENT_SEMANTICS;
}
