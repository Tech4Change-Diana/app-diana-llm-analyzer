/**
 * DIANA — Derivação de `ConversationFeatures` a partir dos sinais da LLM.
 *
 * No caminho OCI, a interpretação já vem da LLM (não re-extraímos por regex —
 * §3.6.6). Este módulo converte os `DetectedSignal[]` mapeados + a `Conversation`
 * nos contadores que a consolidação determinística (`riskEngine`) espera,
 * reproduzindo a lógica de escalada do `featureExtractor` (posição relativa das
 * mensagens suspeitas na janela).
 */
import type { Conversation, ConversationFeatures, DetectedSignal } from "@diana/contracts";

/** Tipo de sinal (taxonomia/legado) -> contador de feature. */
const TYPE_TO_FEATURE: Record<string, keyof ConversationFeatures> = {
  secrecy_request: "secrecyRequests",

  image_request: "imageRequests",
  intimate_content_request: "imageRequests",

  isolation_attempt: "isolationAttempts",

  personal_information_request: "personalInfoRequests",
  personal_information_shared: "personalInfoRequests",
  name_request: "personalInfoRequests",
  school_request: "personalInfoRequests",
  address_request: "personalInfoRequests",
  phone_request: "personalInfoRequests",
  location_request: "personalInfoRequests",
  routine_request: "personalInfoRequests",
  parent_information_request: "personalInfoRequests",
  password_request: "personalInfoRequests",
  identity_document_request: "personalInfoRequests",
  financial_information_request: "personalInfoRequests",

  threat: "threats",
  coercion: "threats",

  insult: "insults",
  humiliation: "insults",
  repetition: "insults",
  targeting: "insults",
  exclusion: "insults",
  denigration: "insults",
  identity_attack: "insults",
  doxxing: "insults",

  blackmail: "blackmailAttempts",

  sexual_language: "sexualContentSignals",

  emotional_distress: "emotionalDistressSignals",

  self_harm: "selfHarmSignals",
};

export function deriveFeaturesFromSignals(
  conversation: Conversation,
  signals: DetectedSignal[],
): ConversationFeatures {
  const features: ConversationFeatures = {
    secrecyRequests: 0,
    imageRequests: 0,
    personalInfoRequests: 0,
    isolationAttempts: 0,
    threats: 0,
    insults: 0,
    blackmailAttempts: 0,
    sexualContentSignals: 0,
    emotionalDistressSignals: 0,
    selfHarmSignals: 0,
    messageCount: conversation.messages.length,
    suspiciousMessageCount: 0,
    conversationEscalation: 0,
  };

  for (const signal of signals) {
    const key = TYPE_TO_FEATURE[signal.type];
    if (key) features[key] += 1;
  }

  // Mensagens suspeitas = mensagens citadas por qualquer sinal.
  const orderedIds = conversation.messages.map((m) => m.id);
  const suspiciousPositions = new Set<number>();
  for (const signal of signals) {
    for (const messageId of signal.messageIds) {
      const pos = orderedIds.indexOf(messageId);
      if (pos !== -1) suspiciousPositions.add(pos);
    }
  }
  features.suspiciousMessageCount = suspiciousPositions.size;

  // Escalada: concentração das mensagens suspeitas na 2ª metade da janela
  // (mesma fórmula de `featureExtractor`).
  const total = features.messageCount;
  if (suspiciousPositions.size > 0 && total > 1) {
    let posSum = 0;
    for (const pos of suspiciousPositions) posSum += pos / (total - 1);
    const avgPos = posSum / suspiciousPositions.size;
    features.conversationEscalation = Math.min(1, Math.max(0, avgPos * 1.6 - 0.3));
  }

  return features;
}
