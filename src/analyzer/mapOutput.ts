/**
 * DIANA — Mapeamento saída da LLM -> `AnalysisResult` (via consolidação).
 *
 * Converte a `LlmAnalysisOutput` (já validada/saneada) em `DetectedSignal[]` e
 * roda a MESMA consolidação determinística do mock (P2): `analyzeContext` +
 * `evaluateRisk` + `buildExplanation`. As `categories` da LLM são insumo
 * interpretativo; quem consolida `assessment.categories`/`score` é o Risk Engine
 * (determinístico), honrando "a LLM interpreta, o Risk Engine consolida".
 */
import type {
  AnalysisResult,
  AuditEntry,
  Conversation,
  DetectedSignal,
  LlmAnalysisOutput,
  ModelMetadata,
} from "@diana/contracts";
import type { OciConfig } from "../config/env.js";
import { analyzeContext } from "../consolidation/contextualAnalyzer.js";
import { deriveFeaturesFromSignals } from "../consolidation/deriveFeatures.js";
import { evaluateRisk } from "../consolidation/riskEngine.js";
import { buildExplanation } from "../consolidation/explainability.js";
import { enrichSignal } from "../consolidation/signalCatalog.js";
import { detectPii } from "../consolidation/preprocess.js";

/** Versão do app/modelo reportada em `ModelMetadata.version`. */
export const APP_VERSION = "v0.1.0";

/** LLM `signals` -> `DetectedSignal[]` (ids únicos, título/descrição do catálogo). */
export function toDetectedSignals(output: LlmAnalysisOutput): DetectedSignal[] {
  const usedIds = new Map<string, number>();
  return output.signals.map((s) => {
    const entry = enrichSignal(s.type, s.severity);
    const seen = usedIds.get(s.type) ?? 0;
    usedIds.set(s.type, seen + 1);
    const id = seen === 0 ? `sig-${s.type}` : `sig-${s.type}-${seen}`;
    return {
      id,
      type: s.type,
      confidence: Math.round(s.confidence * 100) / 100,
      messageIds: s.messageIds,
      title: entry.title,
      description: entry.description,
      severity: entry.severity,
    } satisfies DetectedSignal;
  });
}

export function mapLlmOutputToAnalysisResult(
  conversation: Conversation,
  output: LlmAnalysisOutput,
  config: OciConfig,
): AnalysisResult {
  const signals = toDetectedSignals(output);
  const features = deriveFeaturesFromSignals(conversation, signals);
  const orderedMessageIds = conversation.messages.map((m) => m.id);
  const factors = analyzeContext(features, signals, orderedMessageIds);
  const assessment = evaluateRisk(features, signals, factors);
  const explanation = buildExplanation(assessment, signals, factors, output.progression);

  // Valores "de análise" — o orquestrador do núcleo sobrescreve privacy/audit
  // do batch (ADR 0001).
  const { privacy } = detectPii(conversation);

  const model: ModelMetadata = {
    modelName: config.modelId ?? config.endpointId ?? "oci-generative-ai",
    version: APP_VERSION,
    environment: config.environment === "mock" ? "development" : config.environment,
  };

  return {
    conversationId: conversation.id,
    assessment,
    signals,
    explanation,
    features,
    model,
    privacy,
    audit: buildAnalysisAudit(conversation.messages.length, assessment.priority, model.modelName, {
      llmOutput: output,
    }),
    processedAt: new Date().toISOString(),
  };
}

/**
 * `categories`/`confidence` da LLM são **advisory-only** neste MVP: quem
 * consolida `assessment.categories`/`score` é o Risk Engine determinístico (P2).
 * Ainda assim os registramos na trilha de auditoria para **rastreabilidade**
 * (RF-14) — permite auditar divergência entre a interpretação da LLM e a
 * consolidação, sem deixar a LLM decidir o resultado.
 */
function summarizeLlmInterpretation(output: LlmAnalysisOutput): string {
  const top = [...output.categories].sort((a, b) => b.probability - a.probability)[0];
  const confPct = Math.round(output.confidence * 100);
  const topPhrase = top
    ? `top categoria "${top.category}" (${Math.round(top.probability * 100)}%)`
    : "sem categorias sugeridas";
  return `${topPhrase}; confiança global ${confPct}% (advisory)`;
}

function buildAnalysisAudit(
  messageCount: number,
  priority: string,
  modelName: string,
  extra: { llmOutput: LlmAnalysisOutput },
): AuditEntry[] {
  const at = () => new Date().toISOString();
  return [
    { timestamp: at(), stage: "received", description: "Conversa recebida para análise" },
    { timestamp: at(), stage: "feature_extraction", description: `${messageCount} mensagens` },
    {
      timestamp: at(),
      stage: "ml_analysis",
      description:
        `OCI Generative AI (${modelName}) interpretou a janela — ` +
        summarizeLlmInterpretation(extra.llmOutput),
    },
    { timestamp: at(), stage: "context_analysis", description: "Contexto consolidado" },
    { timestamp: at(), stage: "risk_engine", description: `Prioridade: ${priority}` },
    { timestamp: at(), stage: "explainability", description: "Explicação gerada" },
  ];
}
