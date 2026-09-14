/**
 * Geração de JSON Schema a partir dos tipos de `@diana/contracts` (dev-only).
 *
 * Ferramenta: `ts-json-schema-generator` (resolve tipos por AST). Fica em
 * `devDependencies` — não entra no bundle publicado (a regra "zero runtime
 * deps" vale para o pacote publicado, não para as ferramentas de build).
 *
 * Este módulo é compartilhado pelo script `build-schema.ts` (escreve os
 * arquivos) e pelo teste anti-drift (gera em memória e compara ao commitado).
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createGenerator } from "ts-json-schema-generator";

/** Raiz do pacote `contracts/` (…/contracts), a partir deste arquivo. */
export const contractsRoot = dirname(dirname(fileURLToPath(import.meta.url)));

/** Shapes de fronteira -> nome do arquivo de schema gerado. */
export const SCHEMA_TARGETS: Record<string, string> = {
  "Conversation.schema.json": "Conversation",
  "AnalysisResult.schema.json": "AnalysisResult",
  "LlmAnalysisOutput.schema.json": "LlmAnalysisOutput",
};

/** Gera os JSON Schemas em memória (chave = nome do arquivo). */
export function generateSchemas() {
  const generator = createGenerator({
    path: join(contractsRoot, "src", "*.ts"),
    tsconfig: join(contractsRoot, "tsconfig.json"),
    type: "*",
    expose: "export",
    topRef: true,
    jsDoc: "extended",
    additionalProperties: false,
    skipTypeCheck: true,
    sortProps: true,
  });

  const out: Record<string, unknown> = {};
  for (const [file, typeName] of Object.entries(SCHEMA_TARGETS)) {
    out[file] = generator.createSchema(typeName);
  }
  return out;
}

/** Serialização canônica usada tanto na escrita quanto na comparação. */
export function serializeSchema(schema: unknown): string {
  return JSON.stringify(schema, null, 2) + "\n";
}
