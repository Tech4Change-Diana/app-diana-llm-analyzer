/**
 * DIANA — Mock Risk Analyzer (portado para o gateway).
 *
 * Portado de `app-diana-monitoring/src/analyzer/MockRiskAnalyzer.ts`. Serve de
 * (a) FALLBACK quando a OCI está indisponível e (b) baseline de testes. Usa a
 * MESMA consolidação determinística (`src/consolidation/`) do caminho real —
 * por isso mock e OCI produzem `AnalysisResult` no mesmo formato (P8).
 *
 * ⚠️ MOCK / PROTOTYPE — os consumidores dependem da interface `RiskAnalyzer`,
 * nunca deste mock diretamente.
 */
import type {
  AnalysisResult,
  AuditEntry,
  Conversation,
  DetectedSignal,
  ModelMetadata,
  RiskAnalyzer,
} from "@diana/contracts";
import { detectPii } from "../consolidation/preprocess.js";
import { extractFeatures, type MessageMatch } from "../consolidation/featureExtractor.js";
import { analyzeContext } from "../consolidation/contextualAnalyzer.js";
import { buildExplanation } from "../consolidation/explainability.js";
import { evaluateRisk } from "../consolidation/riskEngine.js";
import { SIGNAL_CATALOG } from "../consolidation/signalCatalog.js";
import {
  CONFIDENCE_FLOOR,
  CONFIDENCE_CEILING,
  CONFIDENCE_STEP,
} from "../consolidation/thresholds.js";

export const MOCK_MODEL_METADATA: ModelMetadata = {
  modelName: "DIANA Risk Analyzer (mock)",
  version: "v0.1.0",
  environment: "mock",
};

export class MockRiskAnalyzer implements RiskAnalyzer {
  async analyzeConversation(conversation: Conversation): Promise<AnalysisResult> {
    const { privacy, piiFindings } = detectPii(conversation);
    const { features, matches } = extractFeatures(conversation);
    const signals = buildSignals(matches);

    const orderedMessageIds = conversation.messages.map((m) => m.id);
    const factors = analyzeContext(features, signals, orderedMessageIds);
    const assessment = evaluateRisk(features, signals, factors);
    const explanation = buildExplanation(assessment, signals, factors);

    return {
      conversationId: conversation.id,
      assessment,
      signals,
      explanation,
      features,
      model: MOCK_MODEL_METADATA,
      privacy,
      audit: buildAnalysisAudit(matches.length, piiFindings.length, assessment.priority),
      processedAt: new Date().toISOString(),
    };
  }
}

/** Constrói os `DetectedSignal[]` a partir dos matches já extraídos. */
function buildSignals(matches: MessageMatch[]): DetectedSignal[] {
  return Object.entries(SIGNAL_CATALOG)
    .map(([key, entry]) => {
      const messageIds = matches.filter((m) => m.signalKeys.includes(key)).map((m) => m.messageId);
      if (messageIds.length === 0) return null;

      const confidence = Math.min(
        CONFIDENCE_CEILING,
        CONFIDENCE_FLOOR + CONFIDENCE_STEP * (messageIds.length - 1),
      );

      return {
        id: `sig-${key}`,
        type: key,
        confidence: Math.round(confidence * 100) / 100,
        messageIds,
        title: entry.title,
        description: entry.description,
        severity: entry.severity,
      } satisfies DetectedSignal;
    })
    .filter((s): s is DetectedSignal => s !== null);
}

/** Trilha das etapas de ANÁLISE (carimbos ISO 8601). */
function buildAnalysisAudit(
  messageCount: number,
  piiCount: number,
  priority: string,
): AuditEntry[] {
  const at = () => new Date().toISOString();
  return [
    { timestamp: at(), stage: "received", description: "Conversa recebida para análise" },
    {
      timestamp: at(),
      stage: "preprocessing",
      description: `Dados preparados${piiCount ? ` · ${piiCount} PII minimizada(s)` : ""}`,
    },
    {
      timestamp: at(),
      stage: "feature_extraction",
      description: `${messageCount} mensagens analisadas`,
    },
    { timestamp: at(), stage: "ml_analysis", description: "Modelo mock avaliou padrões" },
    { timestamp: at(), stage: "context_analysis", description: "Contexto relacionado" },
    { timestamp: at(), stage: "risk_engine", description: `Prioridade: ${priority}` },
    { timestamp: at(), stage: "explainability", description: "Explicação gerada" },
  ];
}
