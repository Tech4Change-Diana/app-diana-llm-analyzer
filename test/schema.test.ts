import { describe, it, expect } from "vitest";
import {
  parseLlmOutput,
  sanitizeLlmOutput,
  buildResponseSchema,
  LlmSchemaError,
} from "../src/schema/llmOutput.js";
import { validLlmOutputJson } from "./fixtures.js";

describe("validação da saída da LLM", () => {
  it("aceita um LlmAnalysisOutput válido", () => {
    const out = parseLlmOutput(validLlmOutputJson());
    expect(out.signals).toHaveLength(2);
    expect(out.categories[0]?.category).toBe("grooming");
    expect(out.confidence).toBeCloseTo(0.7);
  });

  it("extrai JSON cercado por cercas de código", () => {
    const raw = "```json\n" + validLlmOutputJson() + "\n```";
    const out = parseLlmOutput(raw);
    expect(out.signals).toHaveLength(2);
  });

  it("rejeita JSON malformado", () => {
    expect(() => parseLlmOutput("isto não é json")).toThrow(LlmSchemaError);
  });

  it("rejeita categoria fora do enum", () => {
    const bad = JSON.stringify({
      signals: [],
      categories: [{ category: "inexistente", probability: 0.5 }],
      confidence: 0.5,
    });
    expect(() => parseLlmOutput(bad)).toThrow(LlmSchemaError);
  });

  it("saneia messageIds inexistentes e clampa confiança/probabilidade", () => {
    const parsed = parseLlmOutput(
      JSON.stringify({
        signals: [
          {
            type: "image_request",
            confidence: 1.7,
            messageIds: ["MSG-9", "FANTASMA"],
            severity: "high",
          },
        ],
        categories: [{ category: "grooming", probability: 2 }],
        confidence: -0.4,
      }),
    );
    const sane = sanitizeLlmOutput(parsed, ["MSG-9"]);
    expect(sane.signals[0]?.messageIds).toEqual(["MSG-9"]);
    expect(sane.signals[0]?.confidence).toBe(1);
    expect(sane.categories[0]?.probability).toBe(1);
    expect(sane.confidence).toBe(0);
  });

  it("descarta sinal cujos messageIds ficam todos inválidos (achado C)", () => {
    const parsed = parseLlmOutput(
      JSON.stringify({
        signals: [
          { type: "image_request", confidence: 0.6, messageIds: ["MSG-9"], severity: "high" },
          { type: "secrecy_request", confidence: 0.7, messageIds: ["FANTASMA"], severity: "high" },
        ],
        categories: [],
        confidence: 0.5,
      }),
    );
    const sane = sanitizeLlmOutput(parsed, ["MSG-9"]);
    expect(sane.signals).toHaveLength(1);
    expect(sane.signals[0]?.type).toBe("image_request");
  });

  it("mantém tipo desconhecido (taxonomia expansível)", () => {
    const parsed = parseLlmOutput(
      JSON.stringify({
        signals: [{ type: "novo_indicador", confidence: 0.5, messageIds: [], severity: "low" }],
        categories: [],
        confidence: 0.5,
      }),
    );
    expect(parsed.signals[0]?.type).toBe("novo_indicador");
  });

  it("buildResponseSchema restringe type ao enum da taxonomia", () => {
    // JSON Schema é uma estrutura dinâmica; navegamos por índices tipados como unknown.
    const schema = buildResponseSchema() as Record<string, any>;
    const items = schema.properties.signals.items;
    expect(items.properties.type.enum).toContain("secrecy_request");
    expect(items.properties.type.enum).toContain("image_request");
    expect(items.additionalProperties).toBe(false);
  });
});
