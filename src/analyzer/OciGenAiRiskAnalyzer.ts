/**
 * DIANA — Gateway OCI Generative AI (`OciGenAiRiskAnalyzer`).
 *
 * Implementa a interface `RiskAnalyzer`: monta o prompt (janela + metadados),
 * chama a OCI com política de saída em JSON estrito, valida/saneia a resposta,
 * mapeia para `AnalysisResult` via consolidação determinística e devolve. Se a
 * OCI estiver indisponível (rede/auth/quota/timeout) OU a resposta falhar o
 * schema após retry, cai para o `MockRiskAnalyzer` (§3.7), carimbando
 * `ModelMetadata.environment = "mock"`.
 *
 * Injeção de dependências: `deps.invoker` permite testar sem tocar a OCI real;
 * `deps.createInvoker` adia a criação do cliente para a 1ª análise (lazy).
 */
import type { AnalysisResult, Conversation, RiskAnalyzer } from "@diana/contracts";
import type { OciConfig } from "../config/env.js";
import { createLogger, type Logger } from "../logger.js";
import { createOciChatInvoker, OciUnavailableError, type ChatInvoker } from "../oci/client.js";
import { buildSystemPrompt } from "../prompt/system.js";
import { buildUserPrompt } from "../prompt/render.js";
import {
  parseLlmOutput,
  sanitizeLlmOutput,
  buildResponseSchema,
  LlmSchemaError,
} from "../schema/llmOutput.js";
import type { ChatRequestParams } from "../oci/chat.js";
import { mapLlmOutputToAnalysisResult } from "./mapOutput.js";
import { MockRiskAnalyzer } from "./MockRiskAnalyzer.js";

export interface OciAnalyzerDeps {
  logger?: Logger;
  /** Invoker pronto (testes) — tem precedência sobre `createInvoker`. */
  invoker?: ChatInvoker;
  /** Fábrica do invoker (default: OCI real via SDK). */
  createInvoker?: (config: OciConfig, logger: Logger) => Promise<ChatInvoker>;
  /** Fallback (default: `MockRiskAnalyzer`). */
  fallback?: RiskAnalyzer;
}

class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Chamada à OCI excedeu ${ms}ms.`);
    this.name = "TimeoutError";
  }
}

export class OciGenAiRiskAnalyzer implements RiskAnalyzer {
  private readonly logger: Logger;
  private readonly fallback: RiskAnalyzer;
  private readonly createInvoker: (config: OciConfig, logger: Logger) => Promise<ChatInvoker>;
  private invoker: ChatInvoker | null;
  private invokerFailed = false;

  constructor(
    private readonly config: OciConfig,
    deps: OciAnalyzerDeps = {},
  ) {
    this.logger = deps.logger ?? createLogger(config.logLevel);
    this.fallback = deps.fallback ?? new MockRiskAnalyzer();
    this.createInvoker = deps.createInvoker ?? createOciChatInvoker;
    this.invoker = deps.invoker ?? null;
  }

  async analyzeConversation(conversation: Conversation): Promise<AnalysisResult> {
    // Modo mock forçado, ou cliente já marcado como indisponível: fallback direto.
    if (this.config.analyzerMode === "mock") {
      return this.fallback.analyzeConversation(conversation);
    }

    try {
      const invoker = await this.getInvoker();
      const output = await this.callWithRetry(invoker, conversation);
      const validIds = conversation.messages.map((m) => m.id);
      const sanitized = sanitizeLlmOutput(output, validIds);
      return mapLlmOutputToAnalysisResult(conversation, sanitized, this.config);
    } catch (err) {
      this.logger.warn(`OCI indisponível — fallback para mock. Motivo: ${describeError(err)}`, {
        conversationId: conversation.id,
      });
      return this.fallback.analyzeConversation(conversation);
    }
  }

  /** Obtém (e memoiza) o invoker; erro de criação marca indisponibilidade. */
  private async getInvoker(): Promise<ChatInvoker> {
    if (this.invoker) return this.invoker;
    if (this.invokerFailed) throw new OciUnavailableError("Cliente OCI previamente indisponível.");
    try {
      this.invoker = await this.createInvoker(this.config, this.logger);
      return this.invoker;
    } catch (err) {
      this.invokerFailed = true;
      throw err;
    }
  }

  /**
   * Chama a OCI com timeout e re-tenta uma vez (`OCI_MAX_RETRIES`) em caso de
   * falha de schema, reforçando "responda apenas o JSON válido". Erros de
   * indisponibilidade (rede/auth) propagam para o fallback sem novas tentativas.
   */
  private async callWithRetry(invoker: ChatInvoker, conversation: Conversation) {
    const system = buildSystemPrompt();
    const baseUser = buildUserPrompt(conversation);
    // Saída estruturada nativa (JSON Schema) quando habilitada — o zod segue
    // como guardrail independente do suporte do modelo (R2).
    const responseSchema = this.config.structuredOutput ? buildResponseSchema() : undefined;
    const attempts = this.config.maxRetries + 1;

    let lastSchemaError: unknown;
    for (let i = 0; i < attempts; i++) {
      const user =
        i === 0
          ? baseUser
          : `${baseUser}\n\nATENÇÃO: responda EXCLUSIVAMENTE com o objeto JSON válido, sem texto extra.`;
      const raw = await this.invokeWithTimeout(invoker, {
        system,
        user,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        responseSchema,
      });
      try {
        return parseLlmOutput(raw);
      } catch (err) {
        if (err instanceof LlmSchemaError) {
          lastSchemaError = err;
          this.logger.warn(`Resposta da LLM inválida (tentativa ${i + 1}/${attempts}).`);
          continue;
        }
        throw err;
      }
    }
    throw lastSchemaError ?? new LlmSchemaError("Falha ao validar a saída da LLM.");
  }

  /**
   * Chama o invoker com timeout, abortando o `signal` no estouro (cancelamento
   * cooperativo — ver `ChatInvoker`). O timeout cai direto no fallback.
   */
  private invokeWithTimeout(invoker: ChatInvoker, params: ChatRequestParams): Promise<string> {
    const ms = this.config.requestTimeoutMs;
    const controller = new AbortController();
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        controller.abort();
        reject(new TimeoutError(ms));
      }, ms);
      invoker.chat(params, controller.signal).then(
        (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }
}

function describeError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}
