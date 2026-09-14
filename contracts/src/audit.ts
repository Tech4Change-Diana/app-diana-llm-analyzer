/**
 * Trilha de auditoria.
 *
 * `AuditEntry.stage` é `string` (alinhado a `docs/contracts.md`), acomodando
 * tanto os rótulos "de análise" (`PipelineStage`) quanto a máquina de estados
 * de batch do núcleo (`RECEIVED -> ... -> ALERTED|DISCARDED`).
 */
export type PipelineStage =
  | "received"
  | "preprocessing"
  | "feature_extraction"
  | "ml_analysis"
  | "context_analysis"
  | "risk_engine"
  | "explainability";

export interface AuditEntry {
  /** ISO 8601. */
  timestamp: string;
  stage: string;
  description: string;
}
