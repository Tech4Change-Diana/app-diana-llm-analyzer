/**
 * DIANA — Configuração do gateway OCI Generative AI (zod, fail-fast).
 *
 * Valida as `OCI_*` no boot com mensagem clara. Espelha o padrão de
 * `app-diana-monitoring/src/config/env.ts`. Segredos (doc 06): em produção
 * preferir resource/instance principal — a credencial NUNCA vai ao repositório.
 */
import { z } from "zod";

export type AnalyzerMode = "oci" | "mock";
export type OciAuthMode = "config_file" | "instance_principal" | "resource_principal";
export type ModelEnvironment = "mock" | "development" | "production";
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface OciConfig {
  /** oci = tenta a OCI real (com fallback p/ mock); mock = força o mock. */
  analyzerMode: AnalyzerMode;
  logLevel: LogLevel;

  compartmentOcid: string | null;
  /** Modelo on-demand (OCID/nome) — usar este OU o endpoint dedicado. */
  modelId: string | null;
  /** Endpoint dedicado (OCID) — `DedicatedServingMode`. */
  endpointId: string | null;
  region: string;

  auth: OciAuthMode;
  configFile: string;
  configProfile: string;

  /** Reportado em `ModelMetadata.environment` no caminho OCI real. */
  environment: ModelEnvironment;

  temperature: number;
  maxTokens: number;
  requestTimeoutMs: number;
  maxRetries: number;
}

const rawSchema = z.object({
  ANALYZER_MODE: z.enum(["oci", "mock"]).default("mock"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  OCI_COMPARTMENT_OCID: z.string().trim().min(1).optional(),
  OCI_GENAI_MODEL_ID: z.string().trim().min(1).optional(),
  OCI_GENAI_ENDPOINT_ID: z.string().trim().min(1).optional(),
  OCI_REGION: z.string().trim().min(1).default("sa-saopaulo-1"),

  OCI_AUTH: z
    .enum(["config_file", "instance_principal", "resource_principal"])
    .default("config_file"),
  OCI_CONFIG_FILE: z.string().trim().min(1).default("~/.oci/config"),
  OCI_CONFIG_PROFILE: z.string().trim().min(1).default("DEFAULT"),

  OCI_GENAI_ENV: z.enum(["mock", "development", "production"]).default("development"),

  OCI_GENAI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.1),
  OCI_GENAI_MAX_TOKENS: z.coerce.number().int().positive().default(1024),
  OCI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  OCI_MAX_RETRIES: z.coerce.number().int().min(0).default(1),
});

/**
 * Carrega e valida a configuração do gateway a partir de um objeto de env
 * (default: `process.env`). Lança `Error` legível se inválido.
 */
export function loadOciConfig(env: NodeJS.ProcessEnv = process.env): OciConfig {
  const parsed = rawSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(raiz)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Configuração OCI inválida:\n${issues}`);
  }
  const e = parsed.data;

  const config: OciConfig = {
    analyzerMode: e.ANALYZER_MODE,
    logLevel: e.LOG_LEVEL,
    compartmentOcid: e.OCI_COMPARTMENT_OCID ?? null,
    modelId: e.OCI_GENAI_MODEL_ID ?? null,
    endpointId: e.OCI_GENAI_ENDPOINT_ID ?? null,
    region: e.OCI_REGION,
    auth: e.OCI_AUTH,
    configFile: e.OCI_CONFIG_FILE,
    configProfile: e.OCI_CONFIG_PROFILE,
    environment: e.OCI_GENAI_ENV,
    temperature: e.OCI_GENAI_TEMPERATURE,
    maxTokens: e.OCI_GENAI_MAX_TOKENS,
    requestTimeoutMs: e.OCI_REQUEST_TIMEOUT_MS,
    maxRetries: e.OCI_MAX_RETRIES,
  };

  if (config.analyzerMode === "oci") validateOciFields(config);
  return config;
}

/**
 * Regras cruzadas exigidas apenas quando `ANALYZER_MODE=oci`. Em `mock` o
 * gateway nunca toca a OCI, então nada disso é obrigatório (CI/dev sem
 * credenciais).
 */
function validateOciFields(config: OciConfig): void {
  const errors: string[] = [];

  if (!config.compartmentOcid) {
    errors.push("ANALYZER_MODE=oci exige OCI_COMPARTMENT_OCID.");
  }
  if (!config.modelId && !config.endpointId) {
    errors.push(
      "ANALYZER_MODE=oci exige OCI_GENAI_MODEL_ID (on-demand) OU OCI_GENAI_ENDPOINT_ID (dedicado).",
    );
  }
  if (config.auth === "config_file" && !config.configFile) {
    errors.push("OCI_AUTH=config_file exige OCI_CONFIG_FILE.");
  }
  if (config.environment === "mock") {
    errors.push(
      "OCI_GENAI_ENV=mock não faz sentido com ANALYZER_MODE=oci (use development|production).",
    );
  }

  if (errors.length > 0) {
    throw new Error(`Configuração OCI inválida:\n${errors.map((x) => `  - ${x}`).join("\n")}`);
  }
}
