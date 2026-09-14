/**
 * Contadores derivados da conversa, insumo da consolidação determinística.
 */
export interface ConversationFeatures {
  secrecyRequests: number;
  imageRequests: number;
  personalInfoRequests: number;
  isolationAttempts: number;
  threats: number;
  insults: number;
  blackmailAttempts: number;
  sexualContentSignals: number;
  emotionalDistressSignals: number;
  selfHarmSignals: number;
  messageCount: number;
  suspiciousMessageCount: number;
  conversationEscalation: number;
}
