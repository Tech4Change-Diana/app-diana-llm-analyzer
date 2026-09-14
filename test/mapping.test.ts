import { describe, it, expect } from "vitest";
import { parseLlmOutput, sanitizeLlmOutput } from "../src/schema/llmOutput.js";
import { mapLlmOutputToAnalysisResult } from "../src/analyzer/mapOutput.js";
import { loadOciConfig } from "../src/config/env.js";
import { groomingConversation, validLlmOutputJson } from "./fixtures.js";

const ociConfig = loadOciConfig({
  ANALYZER_MODE: "oci",
  OCI_COMPARTMENT_OCID: "ocid1.compartment.oc1..exemplo",
  OCI_GENAI_MODEL_ID: "cohere.command-r-plus",
  OCI_GENAI_ENV: "development",
});

describe("mapeamento saída da LLM -> AnalysisResult", () => {
  const output = sanitizeLlmOutput(
    parseLlmOutput(validLlmOutputJson()),
    groomingConversation.messages.map((m) => m.id),
  );
  const result = mapLlmOutputToAnalysisResult(groomingConversation, output, ociConfig);

  it("produz DetectedSignal[] enriquecidos do catálogo", () => {
    expect(result.signals).toHaveLength(2);
    const image = result.signals.find((s) => s.type === "image_request");
    expect(image?.title).toBe("Solicitação de imagem");
    expect(image?.severity).toBe("high");
    expect(image?.messageIds).toEqual(["MSG-9"]);
  });

  it("consolida assessment de forma determinística (alto risco)", () => {
    expect(result.assessment.score).toBeGreaterThan(0);
    expect(["high", "critical", "medium"]).toContain(result.assessment.level);
    // Qualquer severity:"high" sempre aciona atenção do responsável (§6.6).
    expect(result.assessment.requiresGuardianAttention).toBe(true);
    // image_request recebe boost de calibração e lidera; grooming também presente.
    const cats = result.assessment.categories.map((c) => c.category);
    expect(cats[0]).toBe("image_request");
    expect(cats).toContain("grooming");
  });

  it("registra a interpretação da LLM (advisory) na auditoria (achado B)", () => {
    const ml = result.audit.find((a) => a.stage === "ml_analysis");
    expect(ml?.description).toContain("advisory");
    expect(ml?.description).toContain("grooming");
  });

  it("incorpora a progressão da LLM na explicação", () => {
    expect(result.explanation.summary).toContain("Interpretação do modelo");
    expect(result.explanation.topSignals.length).toBeGreaterThan(0);
  });

  it("carimba ModelMetadata do ambiente OCI (não mock)", () => {
    expect(result.model.environment).toBe("development");
    expect(result.model.modelName).toBe("cohere.command-r-plus");
  });

  it("é determinístico: mesma entrada => mesmo assessment", () => {
    const again = mapLlmOutputToAnalysisResult(groomingConversation, output, ociConfig);
    expect(again.assessment).toEqual(result.assessment);
    expect(again.features).toEqual(result.features);
  });
});
