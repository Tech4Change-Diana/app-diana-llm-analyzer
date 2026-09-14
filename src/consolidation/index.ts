/**
 * DIANA — Consolidação determinística (P2), portada do núcleo/protótipo.
 *
 * Isolada de propósito: quando a interface for estreitada (o analyzer devolver
 * só `signals + categories + confidence` e o núcleo consolidar), este módulo
 * vira o candidato natural a `@diana/risk-engine` compartilhado (novo ADR).
 */
export * from "./thresholds.js";
export * from "./riskEngine.js";
export * from "./contextualAnalyzer.js";
export * from "./explainability.js";
export * from "./featureExtractor.js";
export * from "./preprocess.js";
export * from "./signalCatalog.js";
export * from "./deriveFeatures.js";
