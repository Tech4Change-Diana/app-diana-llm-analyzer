/**
 * Consolidação de risco (produzida de forma determinística pelo Risk Engine).
 */
export type RiskLevel = "none" | "low" | "medium" | "high" | "critical";

export type RiskPriority = "low" | "medium" | "high";

export type RiskCategory =
  | "grooming"
  | "image_request"
  | "cyberbullying"
  | "blackmail"
  | "threat"
  | "personal_information"
  | "isolation"
  | "sexual_content"
  | "emotional_distress"
  | "self_harm";

export interface RiskPrediction {
  category: RiskCategory;
  probability: number;
  level: RiskLevel;
}

export interface RiskAssessment {
  level: RiskLevel;
  priority: RiskPriority;
  categories: RiskPrediction[];
  requiresGuardianAttention: boolean;
  rationale: string;
  /** Indicador técnico 0–100. */
  score: number;
}
