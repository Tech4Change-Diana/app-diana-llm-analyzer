/**
 * Explicabilidade — apoio à decisão humana (P3).
 */
import type { DetectedSignal } from "./signals.js";

export interface ContextualFactor {
  type: "content" | "sequence" | "frequency" | "escalation" | "combination";
  label: string;
  description: string;
  contribution: "low" | "medium" | "high";
}

export interface ExplanationResult {
  summary: string;
  topSignals: DetectedSignal[];
  contextualFactors: ContextualFactor[];
  recommendedActions: string[];
}
