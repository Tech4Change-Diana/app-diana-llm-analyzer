/**
 * Janela de contexto (entrada da análise).
 *
 * Portado de `app-diana-monitoring-lading-page/src/ml/types.ts`, espelhado em
 * `app-diana-monitoring/src/contracts/types.ts`. Descrição canônica em
 * `app-diana-monitoring/docs/contracts.md`.
 */
export type MessageAuthor = "child" | "other";

export interface ConversationMessage {
  id: string;
  author: MessageAuthor;
  text: string;
  /** ISO 8601. */
  timestamp: string;
}

export interface Conversation {
  id: string;
  childId: string;
  childName: string;
  contactId: string;
  contactName: string;
  messages: ConversationMessage[];
  /** ISO 8601. */
  startedAt: string;
}
