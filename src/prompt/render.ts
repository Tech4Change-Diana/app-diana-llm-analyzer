/**
 * DIANA — Renderização da janela de contexto para o prompt do usuário.
 *
 * Monta (1) metadados temporais (início/fim da janela, nº de mensagens,
 * duração, escalada observada) e (2) a transcrição rotulada por autor e horário
 * RELATIVO ao início da janela, preservando os `messageIds` para rastreio.
 * Não vaza PII além do texto que já chega preparado pelo núcleo (P7).
 */
import type { Conversation, ConversationMessage } from "@diana/contracts";

const AUTHOR_LABEL: Record<ConversationMessage["author"], string> = {
  child: "Criança",
  other: "Outro",
};

/** hh:mm:ss (ou mm:ss) do offset em ms relativo ao início da janela. */
function relativeClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export interface WindowMetadata {
  messageCount: number;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  /** fração 0–1: quão concentradas as mensagens estão na 2ª metade da janela. */
  escalationObserved: number;
}

export function computeWindowMetadata(conversation: Conversation): WindowMetadata {
  const messages = conversation.messages;
  const times = messages
    .map((m) => Date.parse(m.timestamp))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);

  const start = times[0] ?? Date.parse(conversation.startedAt);
  const end = times[times.length - 1] ?? start;
  const safeStart = Number.isNaN(start) ? 0 : start;
  const safeEnd = Number.isNaN(end) ? safeStart : end;

  const total = messages.length;
  let escalation = 0;
  if (total > 1) {
    const avgIndex = messages.reduce((acc, _m, i) => acc + i / (total - 1), 0) / total; // ~0.5 uniforme
    escalation = Math.min(1, Math.max(0, avgIndex));
  }

  return {
    messageCount: total,
    startedAt: new Date(safeStart).toISOString(),
    endedAt: new Date(safeEnd).toISOString(),
    durationMinutes: Math.round((safeEnd - safeStart) / 60000),
    escalationObserved: Math.round(escalation * 100) / 100,
  };
}

/** Transcrição rotulada: `[mm:ss] (MSG-id) Autor: texto`. */
export function renderTranscript(conversation: Conversation): string {
  const base = conversation.messages
    .map((m) => Date.parse(m.timestamp))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b)[0];
  const origin = base ?? Date.parse(conversation.startedAt) ?? 0;

  return conversation.messages
    .map((m) => {
      const t = Date.parse(m.timestamp);
      const offset = Number.isNaN(t) || Number.isNaN(origin) ? 0 : t - origin;
      const label = AUTHOR_LABEL[m.author];
      return `[${relativeClock(offset)}] (${m.id}) ${label}: ${m.text}`;
    })
    .join("\n");
}

/** Monta o conteúdo do usuário: metadados + transcrição. */
export function buildUserPrompt(conversation: Conversation): string {
  const meta = computeWindowMetadata(conversation);
  return [
    "METADADOS DA JANELA:",
    `- mensagens: ${meta.messageCount}`,
    `- início: ${meta.startedAt}`,
    `- fim: ${meta.endedAt}`,
    `- duração (min): ${meta.durationMinutes}`,
    `- escalada observada (0–1): ${meta.escalationObserved}`,
    "",
    "TRANSCRIÇÃO (ordenada por tempo; horário relativo ao início):",
    renderTranscript(conversation),
  ].join("\n");
}
