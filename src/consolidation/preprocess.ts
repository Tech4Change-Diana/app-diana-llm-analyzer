/**
 * DIANA — Detecção de PII / relatório de privacidade (P7).
 *
 * Portado de `app-diana-monitoring/src/pipeline/preprocess.ts`. `detectPii`
 * apenas INSPECIONA o texto (não o altera) e produz o `PrivacyReport` +
 * `PiiFinding[]`. `snippet` guarda apenas o marcador redigido — nunca o valor
 * sensível casado (minimização, P7).
 *
 * ⚠️ No fluxo da DIANA, a pseudonimização definitiva roda UMA vez no pipeline
 * do núcleo (ADR 0001); o gateway recebe a `Conversation` já preparada e o
 * orquestrador SOBRESCREVE `privacy`/`audit` do batch. Aqui preenchemos valores
 * "de análise".
 */
import type {
  Conversation,
  ConversationMessage,
  PiiFinding,
  PrivacyReport,
} from "@diana/contracts";

export interface PiiDetection {
  piiFindings: PiiFinding[];
  privacy: PrivacyReport;
}

const normalize = (s: string): string =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

const PII_PATTERNS: { type: string; label: string; regex: RegExp }[] = [
  { type: "phone", label: "Telefone", regex: /(\d{2}[\s-]?\d{5}[\s-]?\d{4}|\d{4}[\s-]?\d{4})/ },
  { type: "email", label: "E-mail", regex: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/ },
  { type: "address", label: "Endereço", regex: /(moro\s+na|rua|avenida|av\.|endere[çc]o)/ },
  { type: "school", label: "Escola", regex: /(escola|col[eé]gio|colegio|estudo\s+em|estuda\s+em)/ },
  { type: "location", label: "Localização", regex: /(bairro|moro|onde\s+voc[eê]\s+mora)/ },
];

const markerFor = (label: string): string => `[${label.toUpperCase()}]`;

export function detectPii(conversation: Conversation): PiiDetection {
  const piiFindings: PiiFinding[] = [];
  const pseudonymizedFields = new Set<string>();

  for (const msg of conversation.messages) {
    const normalizedText = normalize(msg.text);
    for (const pattern of PII_PATTERNS) {
      if (pattern.regex.test(normalizedText)) {
        pseudonymizedFields.add(pattern.type);
        piiFindings.push({
          messageId: msg.id,
          type: pattern.type,
          snippet: markerFor(pattern.label),
          pseudonymized: true,
        });
      }
    }
  }

  const hasPii = piiFindings.length > 0;
  const privacy: PrivacyReport = {
    prepared: true,
    piiMinimized: hasPii,
    pseudonymizedFields: Array.from(pseudonymizedFields),
    protected: true,
  };

  return { piiFindings, privacy };
}

/** Mascara trechos sensíveis por marcadores. Use apenas no que SAI da memória. */
export function pseudonymizeText(text: string): string {
  let out = text;
  for (const pattern of PII_PATTERNS) {
    out = out.replace(new RegExp(pattern.regex.source, "gi"), () => markerFor(pattern.label));
  }
  return out.trim();
}

/** Versão em lote de `pseudonymizeText`. */
export function pseudonymizeMessages(messages: ConversationMessage[]): ConversationMessage[] {
  return messages.map((msg) => ({ ...msg, text: pseudonymizeText(msg.text) }));
}
