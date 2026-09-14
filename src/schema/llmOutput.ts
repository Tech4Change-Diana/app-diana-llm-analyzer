/**
 * DIANA — Validação e saneamento da saída estruturada da LLM.
 *
 * O gateway PODE ter deps de runtime (ao contrário de `@diana/contracts`): aqui
 * usamos zod como guardrail que não depende de suporte nativo a `responseFormat`
 * pelo modelo (§3.5). O JSON Schema canônico (`LlmAnalysisOutput.schema.json`)
 * fica em `@diana/contracts`; `buildResponseSchema()` deriva a versão
 * "restritiva" (enum da taxonomia) enviada ao modelo quando suportado.
 */
import { z } from "zod";
import type { LlmAnalysisOutput, RiskCategory } from "@diana/contracts";
import { CATEGORY_ORDER, KNOWN_SIGNAL_TYPES } from "@diana/contracts";

const severitySchema = z.enum(["low", "medium", "high"]);
const categorySchema = z.enum(CATEGORY_ORDER as [RiskCategory, ...RiskCategory[]]);

const llmSignalSchema = z.object({
  type: z.string().min(1),
  confidence: z.number(),
  messageIds: z.array(z.string()).default([]),
  severity: severitySchema,
  rationale: z.string().optional(),
});

const llmCategorySchema = z.object({
  category: categorySchema,
  probability: z.number(),
});

export const llmAnalysisOutputSchema = z.object({
  signals: z.array(llmSignalSchema).default([]),
  categories: z.array(llmCategorySchema).default([]),
  progression: z.string().optional(),
  confidence: z.number(),
});

/** Erro de validação/parse da saída da LLM (gatilho de retry/fallback). */
export class LlmSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmSchemaError";
  }
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/**
 * Extrai o objeto JSON de um texto que pode vir cercado por ```json ... ``` ou
 * com texto antes/depois (robustez — alguns modelos não respeitam JSON estrito).
 */
export function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new LlmSchemaError("Resposta da LLM não contém um objeto JSON.");
  }
  return candidate.slice(start, end + 1);
}

/**
 * Faz parse + validação (zod) do texto cru da LLM. Lança `LlmSchemaError` em
 * qualquer falha (não repassa dados malformados — §3.5).
 */
export function parseLlmOutput(raw: string): LlmAnalysisOutput {
  let json: unknown;
  try {
    json = JSON.parse(extractJson(raw));
  } catch (err) {
    throw new LlmSchemaError(
      `JSON inválido na resposta da LLM: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const result = llmAnalysisOutputSchema.safeParse(json);
  if (!result.success) {
    throw new LlmSchemaError(
      `Resposta da LLM não casa com o schema: ${result.error.issues
        .map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}

/**
 * Saneia a saída validada contra a `Conversation`: descarta `messageIds`
 * inexistentes e clampa `confidence`/`probability` a [0,1] (§3.5). Tipos
 * desconhecidos são MANTIDOS (a taxonomia é expansível) — o mapeamento usa o
 * fallback de categoria registrado.
 */
export function sanitizeLlmOutput(
  output: LlmAnalysisOutput,
  validMessageIds: Iterable<string>,
): LlmAnalysisOutput {
  const valid = new Set(validMessageIds);
  return {
    signals: output.signals.map((s) => ({
      ...s,
      confidence: clamp01(s.confidence),
      messageIds: s.messageIds.filter((id) => valid.has(id)),
    })),
    categories: output.categories.map((c) => ({
      ...c,
      probability: clamp01(c.probability),
    })),
    progression: output.progression,
    confidence: clamp01(output.confidence),
  };
}

/**
 * JSON Schema "restritivo" para `responseFormat` do modelo (quando suportado):
 * `type` restrito ao enum da taxonomia, `additionalProperties:false`, números
 * em [0,1]. É um guia para o modelo; a validação real acontece no cliente.
 */
export function buildResponseSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["signals", "categories", "confidence"],
    properties: {
      signals: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["type", "confidence", "messageIds", "severity"],
          properties: {
            type: { type: "string", enum: [...KNOWN_SIGNAL_TYPES] },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            messageIds: { type: "array", items: { type: "string" } },
            severity: { type: "string", enum: ["low", "medium", "high"] },
            rationale: { type: "string" },
          },
        },
      },
      categories: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["category", "probability"],
          properties: {
            category: { type: "string", enum: [...CATEGORY_ORDER] },
            probability: { type: "number", minimum: 0, maximum: 1 },
          },
        },
      },
      progression: { type: "string" },
      confidence: { type: "number", minimum: 0, maximum: 1 },
    },
  };
}
