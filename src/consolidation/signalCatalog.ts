/**
 * DIANA — Catálogo de sinais (título/descrição/severidade por tipo).
 *
 * Portado de `SIGNAL_CATALOG` do `MockRiskAnalyzer` do núcleo e ESTENDIDO com a
 * taxonomia da LLM (§2.1). Enriquece cada indicador cru (LLM ou mock) em um
 * `DetectedSignal` legível ao responsável. Para tipos desconhecidos, o título é
 * derivado do próprio `type` (a taxonomia é expansível — §2.1).
 */
import type { SignalSeverity } from "@diana/contracts";

export interface SignalCatalogEntry {
  title: string;
  description: string;
  severity: SignalSeverity;
}

export const SIGNAL_CATALOG: Record<string, SignalCatalogEntry> = {
  // --- legados (protótipo/mock) ---
  secrecy_request: {
    title: "Pedido de segredo",
    description:
      "A outra pessoa pediu que a criança mantivesse a conversa escondida dos responsáveis.",
    severity: "high",
  },
  image_request: {
    title: "Solicitação de imagem",
    description: "Foi identificada uma solicitação para que a criança envie uma foto pessoal.",
    severity: "high",
  },
  isolation_attempt: {
    title: "Tentativa de isolamento",
    description:
      "A conversa contém linguagem que pode desencorajar a criança de conversar com os responsáveis.",
    severity: "high",
  },
  personal_information_request: {
    title: "Solicitação de dados pessoais",
    description: "Perguntas por informações que permitem identificar ou localizar a criança.",
    severity: "medium",
  },
  personal_information_shared: {
    title: "Dados pessoais compartilhados",
    description: "A criança compartilhou informações pessoais na conversa.",
    severity: "low",
  },
  threat: {
    title: "Ameaça",
    description: "Mensagens com tom de intimidação ou ameaça.",
    severity: "medium",
  },
  insult: {
    title: "Insulto / agressão verbal",
    description: "Linguagem depreciativa ou hostil direcionada à criança.",
    severity: "medium",
  },
  blackmail: {
    title: "Chantagem",
    description: "Tentativa de pressionar a criança usando segredos ou informações.",
    severity: "high",
  },
  sexual_language: {
    title: "Linguagem de conotação sexual",
    description: "Conteúdo ou linguagem sexualizada inadequada para a faixa etária.",
    severity: "high",
  },
  emotional_distress: {
    title: "Sinais de sofrimento emocional",
    description: "A criança demonstra desconforto, tristeza ou angústia.",
    severity: "low",
  },
  self_harm: {
    title: "Linguagem de automutilação",
    description: "Menções a automutilação ou desesperança.",
    severity: "high",
  },

  // --- taxonomia da LLM (§2.1): grooming ---
  age_probing: {
    title: "Sondagem de idade",
    description: "Perguntas insistentes sobre a idade da criança.",
    severity: "medium",
  },
  rapport_building: {
    title: "Construção de vínculo",
    description: "Tentativa de criar proximidade/afinidade rápida com a criança.",
    severity: "low",
  },
  intimate_content_request: {
    title: "Pedido de conteúdo íntimo",
    description: "Solicitação de conteúdo íntimo ou sexualizado.",
    severity: "high",
  },
  meeting_request: {
    title: "Pedido de encontro",
    description: "Tentativa de marcar um encontro presencial com a criança.",
    severity: "high",
  },
  platform_migration: {
    title: "Migração de plataforma",
    description: "Convite para mudar a conversa para outro aplicativo, longe de supervisão.",
    severity: "medium",
  },
  coercion: {
    title: "Coerção",
    description: "Uso de pressão ou coação para obter algo da criança.",
    severity: "high",
  },

  // --- taxonomia da LLM (§2.1): cyberbullying ---
  humiliation: {
    title: "Humilhação",
    description: "Mensagens que humilham ou expõem a criança.",
    severity: "medium",
  },
  repetition: {
    title: "Repetição / perseguição",
    description: "Ataques repetidos ao longo do tempo, caracterizando recorrência.",
    severity: "medium",
  },
  targeting: {
    title: "Direcionamento",
    description: "Ataques direcionados especificamente à criança.",
    severity: "medium",
  },
  exclusion: {
    title: "Exclusão social",
    description: "Tentativa de excluir a criança de um grupo.",
    severity: "low",
  },
  denigration: {
    title: "Difamação",
    description: "Espalhar boatos ou informações depreciativas sobre a criança.",
    severity: "medium",
  },
  identity_attack: {
    title: "Ataque à identidade",
    description: "Ataques a características de identidade da criança.",
    severity: "high",
  },
  doxxing: {
    title: "Exposição de dados (doxxing)",
    description: "Divulgação de dados pessoais da criança sem consentimento.",
    severity: "high",
  },

  // --- taxonomia da LLM (§2.1): captura de informação pessoal ---
  name_request: {
    title: "Pedido de nome",
    description: "Solicitação do nome completo da criança.",
    severity: "medium",
  },
  school_request: {
    title: "Pedido de escola",
    description: "Solicitação da escola onde a criança estuda.",
    severity: "medium",
  },
  address_request: {
    title: "Pedido de endereço",
    description: "Solicitação do endereço da criança.",
    severity: "high",
  },
  phone_request: {
    title: "Pedido de telefone",
    description: "Solicitação do telefone da criança.",
    severity: "medium",
  },
  location_request: {
    title: "Pedido de localização",
    description: "Solicitação da localização atual da criança.",
    severity: "high",
  },
  routine_request: {
    title: "Pedido de rotina",
    description: "Perguntas sobre a rotina/horários da criança.",
    severity: "medium",
  },
  parent_information_request: {
    title: "Pedido de dados dos responsáveis",
    description: "Solicitação de informações sobre os pais/responsáveis.",
    severity: "medium",
  },
  password_request: {
    title: "Pedido de senha",
    description: "Solicitação de senha ou credenciais.",
    severity: "high",
  },
  identity_document_request: {
    title: "Pedido de documento",
    description: "Solicitação de documento de identidade.",
    severity: "high",
  },
  financial_information_request: {
    title: "Pedido de dados financeiros",
    description: "Solicitação de informações financeiras.",
    severity: "high",
  },
};

/** Humaniza um `type` desconhecido em um título legível (fallback). */
function humanizeType(type: string): string {
  const words = type.replace(/[_-]+/g, " ").trim();
  if (!words) return "Indicador";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Resolve título/descrição/severidade de um tipo de sinal, com fallback
 * registrado para tipos fora do catálogo. `severityHint` (severidade vinda da
 * LLM) tem precedência sobre a do catálogo quando informada.
 */
export function enrichSignal(type: string, severityHint?: SignalSeverity): SignalCatalogEntry {
  const entry = SIGNAL_CATALOG[type];
  if (entry) {
    return { ...entry, severity: severityHint ?? entry.severity };
  }
  const title = humanizeType(type);
  return {
    title,
    description: `Indicador "${title}" identificado pela análise.`,
    severity: severityHint ?? "medium",
  };
}
