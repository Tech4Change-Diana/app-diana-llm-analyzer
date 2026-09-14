/**
 * DIANA — Cliente OCI Generative AI (auth + invocação de chat).
 *
 * O SDK oficial da Oracle é carregado por `import()` DINÂMICO (especificador
 * computado), de modo que ele NÃO é dependência de build/typecheck: se estiver
 * ausente ou a autenticação falhar, lançamos `OciUnavailableError` e o
 * `OciGenAiRiskAnalyzer` cai para o mock (§3.7). Providers de auth conforme
 * `OCI_AUTH` (doc 06): config_file (dev) | instance_principal | resource_principal.
 */
import type { OciConfig } from "../config/env.js";
import type { Logger } from "../logger.js";
import { buildChatDetails, extractResponseText, type ChatRequestParams } from "./chat.js";

/** Abstração injetável: recebe os textos, devolve o texto cru da LLM. */
export interface ChatInvoker {
  chat(params: ChatRequestParams): Promise<string>;
}

/** OCI indisponível (SDK ausente, auth/rede/quota) — gatilho de fallback. */
export class OciUnavailableError extends Error {
  readonly reason?: unknown;
  constructor(message: string, reason?: unknown) {
    super(message);
    this.name = "OciUnavailableError";
    this.reason = reason;
  }
}

/** `import()` com especificador computado: tsc não resolve o módulo em build. */
async function importOptional(moduleName: string): Promise<any> {
  const specifier = moduleName;
  try {
    return await import(specifier);
  } catch (err) {
    throw new OciUnavailableError(`SDK OCI "${moduleName}" indisponível.`, err);
  }
}

/** Constrói o provider de autenticação conforme `OCI_AUTH`. */
async function buildAuthProvider(common: any, config: OciConfig): Promise<any> {
  switch (config.auth) {
    case "config_file":
      return new common.ConfigFileAuthenticationDetailsProvider(
        config.configFile,
        config.configProfile,
      );
    case "instance_principal":
      return common.InstancePrincipalsAuthenticationDetailsProvider.builder().build();
    case "resource_principal":
      return common.ResourcePrincipalAuthenticationDetailsProvider.builder().build();
    default:
      throw new OciUnavailableError(`OCI_AUTH desconhecido: ${String(config.auth)}`);
  }
}

/**
 * Cria um `ChatInvoker` ligado à OCI Generative AI real. Lança
 * `OciUnavailableError` se o SDK/credenciais não estiverem disponíveis.
 */
export async function createOciChatInvoker(
  config: OciConfig,
  logger: Logger,
): Promise<ChatInvoker> {
  const common = await importOptional("oci-common");
  const genai = await importOptional("oci-generativeaiinference");

  let provider: any;
  try {
    provider = await buildAuthProvider(common, config);
  } catch (err) {
    throw new OciUnavailableError("Falha ao construir provider de autenticação OCI.", err);
  }

  let client: any;
  try {
    client = new genai.GenerativeAiInferenceClient({
      authenticationDetailsProvider: provider,
    });
    if (config.region) client.regionId = config.region;
  } catch (err) {
    throw new OciUnavailableError("Falha ao inicializar GenerativeAiInferenceClient.", err);
  }

  logger.debug(`OCI client pronto (region=${config.region}, auth=${config.auth}).`);

  return {
    async chat(params: ChatRequestParams): Promise<string> {
      try {
        const chatDetails = buildChatDetails(config, params);
        const response = await client.chat({ chatDetails });
        return extractResponseText(response);
      } catch (err) {
        throw new OciUnavailableError("Falha na chamada de chat da OCI.", err);
      }
    },
  };
}
