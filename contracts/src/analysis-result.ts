/**
 * Agregado de saída da análise — a "linguagem comum" `Conversation` ->
 * `AnalysisResult` de toda a DIANA.
 */
import type { RiskAssessment } from "./risk.js";
import type { DetectedSignal } from "./signals.js";
import type { ExplanationResult } from "./explanation.js";
import type { ConversationFeatures } from "./features.js";
import type { ModelMetadata } from "./model.js";
import type { PrivacyReport } from "./privacy.js";
import type { AuditEntry } from "./audit.js";

export interface AnalysisResult {
  conversationId: string;
  assessment: RiskAssessment;
  signals: DetectedSignal[];
  explanation: ExplanationResult;
  features: ConversationFeatures;
  model: ModelMetadata;
  privacy: PrivacyReport;
  audit: AuditEntry[];
  /** ISO 8601. */
  processedAt: string;
}
