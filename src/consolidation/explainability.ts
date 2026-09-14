/**
 * DIANA — Explainability Engine.
 *
 * Portado de `app-diana-monitoring/src/pipeline/explainability.ts`. Converte o
 * resultado do Risk Engine em explicação legível ao responsável. Ver
 * `docs/regras-de-negocio.md` §7.
 *
 * No caminho OCI, `progression`/`rationale` da LLM podem ser incorporados ao
 * `summary` (mantendo o tom de apoio) — ver `enrichSummaryWithLlm`.
 */
import type {
  ContextualFactor,
  DetectedSignal,
  ExplanationResult,
  RiskAssessment,
} from "@diana/contracts";
import { riskCategoryLabels } from "@diana/contracts";

export function buildExplanation(
  assessment: RiskAssessment,
  signals: DetectedSignal[],
  factors: ContextualFactor[],
  llmProgression?: string,
): ExplanationResult {
  // Ranquear por PESO de severidade (não alfabético) e depois confiança.
  const SEVERITY_RANK = { high: 3, medium: 2, low: 1 } as const;
  const sorted = [...signals].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.confidence - a.confidence,
  );

  const topSignals = sorted.slice(0, 3);
  const topCategory = assessment.categories[0];

  let summary: string;
  if (signals.length === 0) {
    summary = "A análise desta conversa não identificou sinais relevantes de risco.";
  } else {
    const categoryPhrase = topCategory
      ? riskCategoryLabels[topCategory.category].toLowerCase()
      : "um padrão potencialmente preocupante";
    summary = `A DIANA identificou ${signals.length} padrões na conversa que podem indicar ${categoryPhrase}.`;
    if (assessment.level === "high" || assessment.level === "critical") {
      summary += " A conversa apresenta um padrão de escalada de sinais ao longo do tempo.";
    }
  }

  // Incorpora a leitura da LLM sobre a progressão, quando disponível (tom de apoio).
  const progression = llmProgression?.trim();
  if (progression && signals.length > 0) {
    summary += ` Interpretação do modelo: ${progression}`;
  }

  const recommendedActions = buildRecommendedActions(assessment);

  return {
    summary,
    topSignals,
    contextualFactors: factors,
    recommendedActions,
  };
}

function buildRecommendedActions(assessment: RiskAssessment): string[] {
  const actions = [
    "Converse com a criança com calma, sem culpá-la ou assustá-la.",
    "Procure entender o contexto: o alerta é um ponto de partida para uma conversa.",
    "Avalie a situação considerando o histórico e o contexto da interação.",
  ];

  if (assessment.level === "high" || assessment.level === "critical") {
    actions.push(
      "Tome medidas de proteção quando necessário — bloqueio, denúncia ou busca de ajuda especializada.",
    );
  } else {
    actions.push(
      "Fique atento a novas conversas e, se necessário, ajuste as configurações de proteção.",
    );
  }

  return actions;
}
