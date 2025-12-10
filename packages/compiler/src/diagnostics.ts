export type DiagnosticSeverity = "error" | "warning" | "info" | "hint";

export interface Diagnostic {
  message: string;
  from?: number;
  to?: number;
  severity?: DiagnosticSeverity;
  code?: string;
}
