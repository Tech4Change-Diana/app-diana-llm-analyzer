/**
 * @diana/contracts — contrato de domínio compartilhado da DIANA.
 *
 * Ponto único de importação dos tipos canônicos (`Conversation`,
 * `AnalysisResult`, `RiskAnalyzer`, ...) + a taxonomia de indicadores da LLM.
 * ZERO dependências de runtime: todas as setas de dependência de tipos apontam
 * para cá, e este pacote não depende de ninguém (`01-repositorios.md`).
 */
export * from "./conversation.js";
export * from "./signals.js";
export * from "./risk.js";
export * from "./explanation.js";
export * from "./privacy.js";
export * from "./features.js";
export * from "./audit.js";
export * from "./model.js";
export * from "./analysis-result.js";
export * from "./analyzer.js";
export * from "./labels.js";
export * from "./taxonomy.js";
export * from "./llm-output.js";
