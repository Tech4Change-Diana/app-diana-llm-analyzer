/**
 * Rótulos PT-BR (consumidos pela UI/relatórios do responsável).
 */
import type { RiskCategory } from "./risk.js";
import type { PipelineStage } from "./audit.js";

export const riskCategoryLabels: Record<RiskCategory, string> = {
  grooming: "Possível grooming / aliciamento",
  image_request: "Solicitação de imagem íntima",
  cyberbullying: "Cyberbullying",
  blackmail: "Chantagem",
  threat: "Ameaça",
  personal_information: "Compartilhamento de informação pessoal",
  isolation: "Tentativa de isolamento",
  sexual_content: "Conteúdo potencialmente sexual",
  emotional_distress: "Sinais de sofrimento emocional",
  self_harm: "Linguagem relacionada a automutilação ou suicídio",
};

export const pipelineStageLabels: Record<PipelineStage, string> = {
  received: "Conversa recebida",
  preprocessing: "Pré-processamento",
  feature_extraction: "Extração de características",
  ml_analysis: "Análise ML",
  context_analysis: "Análise de contexto",
  risk_engine: "Risk Engine",
  explainability: "Explicabilidade",
};
