import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  contractsRoot,
  generateSchemas,
  serializeSchema,
  SCHEMA_TARGETS,
} from "../scripts/generate.ts";

/**
 * Guardrail anti-drift: os `schema/*.json` commitados devem ser idênticos ao
 * que `build-schema` gera a partir dos tipos. Regenere com
 * `npm run build:schema` se este teste falhar.
 */
describe("JSON Schema anti-drift", () => {
  const generated = generateSchemas();

  for (const file of Object.keys(SCHEMA_TARGETS)) {
    it(`${file} está atualizado em relação aos tipos`, () => {
      const committed = readFileSync(join(contractsRoot, "schema", file), "utf8");
      expect(serializeSchema(generated[file])).toBe(committed);
    });
  }
});
