/**
 * Fronteira de troca `RiskAnalyzer` — o ponto único onde o mock vira modelo
 * real. Consumidores dependem APENAS desta interface (ADR 0001). A assinatura é
 * congelada em `docs/contracts.md`.
 */
import type { Conversation } from "./conversation.js";
import type { AnalysisResult } from "./analysis-result.js";

export interface RiskAnalyzer {
  analyzeConversation(conversation: Conversation): Promise<AnalysisResult>;
}
