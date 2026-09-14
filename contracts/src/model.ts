/**
 * Metadados do modelo — rastreabilidade (RF-14).
 *
 * `environment` distingue resultado real (`development`/`production`) de
 * fallback mock (`mock`).
 */
export interface ModelMetadata {
  modelName: string;
  version: string;
  environment: "mock" | "development" | "production";
}
