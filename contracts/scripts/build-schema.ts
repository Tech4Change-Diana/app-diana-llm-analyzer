/**
 * Escreve os JSON Schemas gerados em `contracts/schema/`.
 *
 * Uso: `npm run --workspace @diana/contracts build:schema`
 * (roda com `node --experimental-strip-types`). NÃO editar `schema/*.json` à
 * mão — regenerar por aqui; o teste anti-drift falha se houver divergência.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { contractsRoot, generateSchemas, serializeSchema } from "./generate.ts";

const schemas = generateSchemas();
const schemaDir = join(contractsRoot, "schema");
mkdirSync(schemaDir, { recursive: true });

for (const [file, schema] of Object.entries(schemas)) {
  writeFileSync(join(schemaDir, file), serializeSchema(schema));
  console.log(`✓ schema/${file}`);
}
console.log(`Gerados ${Object.keys(schemas).length} schema(s) em contracts/schema/.`);
