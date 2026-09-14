/**
 * Sinais detectados pela camada de interpretação (LLM).
 *
 * `DetectedSignal.type` é `string` (aberto): a taxonomia de indicadores é
 * expansível sem mudança estrutural do contrato — ver `taxonomy.ts`.
 */
export type SignalSeverity = "low" | "medium" | "high";

export interface DetectedSignal {
  id: string;
  type: string;
  /** 0–1. */
  confidence: number;
  messageIds: string[];
  title: string;
  description: string;
  severity: SignalSeverity;
}
