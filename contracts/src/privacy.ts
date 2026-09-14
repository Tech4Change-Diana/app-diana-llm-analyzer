/**
 * Privacidade (P7 / privacy by design).
 *
 * `PiiFinding.snippet` guarda o marcador redigido, nunca o valor sensível.
 */
export interface PiiFinding {
  messageId: string;
  type: string;
  snippet: string;
  pseudonymized: boolean;
}

export interface PrivacyReport {
  prepared: boolean;
  piiMinimized: boolean;
  pseudonymizedFields: string[];
  protected: boolean;
}
