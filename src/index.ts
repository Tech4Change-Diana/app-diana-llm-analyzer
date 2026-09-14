/**
 * @diana/llm-analyzer — superfície pública da inteligência da DIANA.
 *
 * Consumo pelo núcleo (`app-diana-monitoring`) é uma linha na fábrica
 * `createAnalyzer()` (ADR 0001 / doc 04):
 *
 * ```ts
 * case "oci":
 *   return new OciGenAiRiskAnalyzer(loadOciConfig());
 * ```
 */
import type { RiskAnalyzer } from "@diana/contracts";
import { loadOciConfig, type OciConfig } from "./config/env.js";
import { OciGenAiRiskAnalyzer, type OciAnalyzerDeps } from "./analyzer/OciGenAiRiskAnalyzer.js";
import { MockRiskAnalyzer } from "./analyzer/MockRiskAnalyzer.js";

export { OciGenAiRiskAnalyzer, type OciAnalyzerDeps } from "./analyzer/OciGenAiRiskAnalyzer.js";
export { MockRiskAnalyzer, MOCK_MODEL_METADATA } from "./analyzer/MockRiskAnalyzer.js";
export { loadOciConfig, type OciConfig } from "./config/env.js";
export { createLogger, type Logger, type LogLevel } from "./logger.js";
export { OciUnavailableError, type ChatInvoker } from "./oci/client.js";
export {
  parseLlmOutput,
  sanitizeLlmOutput,
  buildResponseSchema,
  LlmSchemaError,
} from "./schema/llmOutput.js";
export { mapLlmOutputToAnalysisResult } from "./analyzer/mapOutput.js";
export { buildSystemPrompt } from "./prompt/system.js";
export { buildUserPrompt, computeWindowMetadata, renderTranscript } from "./prompt/render.js";
export type { RiskAnalyzer } from "@diana/contracts";

/**
 * Fábrica de conveniência: `mock` -> `MockRiskAnalyzer`; `oci` ->
 * `OciGenAiRiskAnalyzer` (com fallback interno para o mock). Sem credenciais, o
 * default (`ANALYZER_MODE=mock`) já cai no mock.
 */
export function createRiskAnalyzer(
  config: OciConfig = loadOciConfig(),
  deps?: OciAnalyzerDeps,
): RiskAnalyzer {
  if (config.analyzerMode === "mock") return new MockRiskAnalyzer();
  return new OciGenAiRiskAnalyzer(config, deps);
}
