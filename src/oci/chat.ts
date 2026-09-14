/**
 * DIANA — Construção do payload de chat da OCI Generative AI e extração do texto.
 *
 * Funções puras (sem SDK) que montam o `ChatDetails` (GenericChatRequest,
 * on-demand OU dedicado) e extraem o texto da resposta. Tipadas de forma frouxa
 * porque o SDK é carregado por `import()` dinâmico (ver `client.ts`).
 */
import type { OciConfig } from "../config/env.js";

export interface ChatRequestParams {
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
}

/** Modo de serviço: on-demand (modelId) OU dedicado (endpointId). */
export function buildServingMode(config: OciConfig): any {
  if (config.modelId) {
    return { servingType: "ON_DEMAND", modelId: config.modelId };
  }
  return { servingType: "DEDICATED", endpointId: config.endpointId };
}

/** Monta o `ChatDetails` (apiFormat GENERIC), com SYSTEM + USER. */
export function buildChatDetails(config: OciConfig, params: ChatRequestParams): any {
  return {
    compartmentId: config.compartmentOcid,
    servingMode: buildServingMode(config),
    chatRequest: {
      apiFormat: "GENERIC",
      messages: [
        { role: "SYSTEM", content: [{ type: "TEXT", text: params.system }] },
        { role: "USER", content: [{ type: "TEXT", text: params.user }] },
      ],
      maxTokens: params.maxTokens,
      temperature: params.temperature,
      topP: 0.9,
      numGenerations: 1,
      isStream: false,
    },
  };
}

/**
 * Extrai o texto da resposta de chat (GenericChatResponse):
 * `chatResult.chatResponse.choices[0].message.content[0].text`. Defensivo a
 * variações de shape entre modelos.
 */
export function extractResponseText(response: any): string {
  const choices = response?.chatResult?.chatResponse?.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("Resposta da OCI sem choices.");
  }
  const content = choices[0]?.message?.content;
  if (!Array.isArray(content) || content.length === 0) {
    throw new Error("Resposta da OCI sem conteúdo de mensagem.");
  }
  const text = content
    .map((c: any) => (typeof c?.text === "string" ? c.text : ""))
    .join("")
    .trim();
  if (!text) throw new Error("Resposta da OCI com conteúdo vazio.");
  return text;
}
