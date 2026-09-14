/**
 * Saída estruturada CRUA da LLM (`LlmAnalysisOutput`) — o shape de fronteira
 * que o modelo devolve (doc 04), antes do mapeamento para `AnalysisResult`.
 *
 * A LLM produz indicadores intermediários (não só a categoria final). O gateway
 * valida esta forma (zod) e a saneia contra a `Conversation` antes de
 * consolidar. `type` fica `string` (taxonomia expansível — ver `taxonomy.ts`);
 * o JSON Schema gerado restringe ao enum conhecido para guiar o modelo.
 */
import type { RiskCategory } from "./risk.js";
import type { SignalSeverity } from "./signals.js";

export interface LlmSignal {
  /** Indicador da taxonomia (§2.1); string aberta, saneada no gateway. */
  type: string;
  /** 0–1. */
  confidence: number;
  /** ids de mensagens da `Conversation` que embasam o sinal (auditabilidade). */
  messageIds: string[];
  severity: SignalSeverity;
  /** Justificativa curta em PT-BR (alimenta a explicação). */
  rationale?: string;
}

export interface LlmCategoryPrediction {
  category: RiskCategory;
  /** 0–1. */
  probability: number;
}

export interface LlmAnalysisOutput {
  signals: LlmSignal[];
  categories: LlmCategoryPrediction[];
  /** Descrição da progressão observada na janela (PT-BR), opcional. */
  progression?: string;
  /** Confiança global da interpretação, 0–1. */
  confidence: number;
}
