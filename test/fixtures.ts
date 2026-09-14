/**
 * Fixtures compartilhadas dos testes (janela de grooming com progressão).
 */
import type { Conversation } from "@diana/contracts";

export const groomingConversation: Conversation = {
  id: "conv-001",
  childId: "child-1",
  childName: "Ana",
  contactId: "contact-9",
  contactName: "Desconhecido",
  startedAt: "2026-09-13T14:00:00.000Z",
  messages: [
    { id: "MSG-1", author: "child", text: "Oi", timestamp: "2026-09-13T14:00:10.000Z" },
    {
      id: "MSG-2",
      author: "other",
      text: "Quantos anos você tem?",
      timestamp: "2026-09-13T14:00:42.000Z",
    },
    { id: "MSG-3", author: "child", text: "13", timestamp: "2026-09-13T14:01:05.000Z" },
    {
      id: "MSG-7",
      author: "other",
      text: "Não precisa contar tudo para seus pais, fica entre nós",
      timestamp: "2026-09-13T14:03:10.000Z",
    },
    {
      id: "MSG-9",
      author: "other",
      text: "Me manda uma foto sua",
      timestamp: "2026-09-13T14:05:22.000Z",
    },
  ],
};

/** Saída estruturada válida da LLM para `groomingConversation`. */
export function validLlmOutputJson(): string {
  return JSON.stringify({
    signals: [
      {
        type: "secrecy_request",
        confidence: 0.67,
        messageIds: ["MSG-7"],
        severity: "high",
        rationale: "pediu para não contar aos pais",
      },
      {
        type: "image_request",
        confidence: 0.6,
        messageIds: ["MSG-9"],
        severity: "high",
        rationale: "solicitou foto pessoal",
      },
    ],
    categories: [
      { category: "grooming", probability: 0.9 },
      { category: "personal_information", probability: 0.48 },
    ],
    progression: "escalada de comportamento comum para invasivo ao longo da janela",
    confidence: 0.7,
  });
}
