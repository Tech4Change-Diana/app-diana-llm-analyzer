/**
 * Taxonomia de indicadores da LLM (visão funcional §33 / `regras-de-negocio.md`
 * §2.1), por pilar. É auxiliar do contrato: dá tipagem e validação à saída da
 * LLM SEM enrijecer `DetectedSignal.type` (que permanece `string`, expansível).
 *
 * `SIGNAL_TAXONOMY` e `SignalType` alimentam (a) o JSON Schema da saída da LLM
 * e (b) o mapeamento sinal -> categoria, com fallback explícito registrado para
 * tipos novos/desconhecidos (não inflar `grooming` silenciosamente).
 */
import type { RiskCategory } from "./risk.js";

export const SIGNAL_TAXONOMY = {
  grooming: [
    "age_probing",
    "rapport_building",
    "secrecy_request",
    "isolation_attempt",
    "image_request",
    "intimate_content_request",
    "meeting_request",
    "platform_migration",
    "coercion",
    "threat",
  ],
  cyberbullying: [
    "insult",
    "humiliation",
    "threat",
    "repetition",
    "targeting",
    "exclusion",
    "denigration",
    "identity_attack",
    "doxxing",
  ],
  personal_information: [
    "name_request",
    "school_request",
    "address_request",
    "phone_request",
    "location_request",
    "routine_request",
    "parent_information_request",
    "password_request",
    "identity_document_request",
    "financial_information_request",
  ],
} as const;

/** União de todos os indicadores conhecidos da taxonomia (sem duplicatas). */
export type SignalType = (typeof SIGNAL_TAXONOMY)[keyof typeof SIGNAL_TAXONOMY][number];

/** Lista achatada e deduplicada dos tipos conhecidos (para enum de schema). */
export const KNOWN_SIGNAL_TYPES: readonly string[] = Array.from(
  new Set(Object.values(SIGNAL_TAXONOMY).flat()),
);

/**
 * Ordem canônica das categorias de risco (portada do `risk-engine` do núcleo).
 */
export const CATEGORY_ORDER: RiskCategory[] = [
  "grooming",
  "image_request",
  "cyberbullying",
  "blackmail",
  "threat",
  "personal_information",
  "isolation",
  "sexual_content",
  "emotional_distress",
  "self_harm",
];

/** Categoria de fallback quando o tipo de sinal não está mapeado. */
export const DEFAULT_SIGNAL_CATEGORY: RiskCategory = "grooming";

/**
 * Mapa sinal -> categoria de risco (`regras-de-negocio.md` §4).
 *
 * Inclui os tipos legados do protótipo/mock (mantidos idênticos para paridade
 * numérica com o núcleo) e os tipos da taxonomia da LLM (§2.1).
 */
export const SIGNAL_CATEGORY: Record<string, RiskCategory> = {
  // --- tipos legados (protótipo/mock) — não alterar (paridade com o núcleo) ---
  secrecy_request: "grooming",
  image_request: "image_request",
  isolation_attempt: "grooming",
  personal_information_request: "personal_information",
  personal_information_shared: "personal_information",
  threat: "threat",
  insult: "cyberbullying",
  blackmail: "blackmail",
  sexual_language: "sexual_content",
  emotional_distress: "emotional_distress",
  self_harm: "self_harm",

  // --- taxonomia da LLM (§2.1): grooming ---
  age_probing: "grooming",
  rapport_building: "grooming",
  intimate_content_request: "image_request",
  meeting_request: "grooming",
  platform_migration: "grooming",
  coercion: "blackmail",

  // --- taxonomia da LLM (§2.1): cyberbullying ---
  humiliation: "cyberbullying",
  repetition: "cyberbullying",
  targeting: "cyberbullying",
  exclusion: "cyberbullying",
  denigration: "cyberbullying",
  identity_attack: "cyberbullying",
  doxxing: "cyberbullying",

  // --- taxonomia da LLM (§2.1): captura de informação pessoal ---
  name_request: "personal_information",
  school_request: "personal_information",
  address_request: "personal_information",
  phone_request: "personal_information",
  location_request: "personal_information",
  routine_request: "personal_information",
  parent_information_request: "personal_information",
  password_request: "personal_information",
  identity_document_request: "personal_information",
  financial_information_request: "personal_information",
};

/** Resolve a categoria de um tipo de sinal, com fallback explícito registrado. */
export function categoryForSignalType(type: string): RiskCategory {
  return SIGNAL_CATEGORY[type] ?? DEFAULT_SIGNAL_CATEGORY;
}
