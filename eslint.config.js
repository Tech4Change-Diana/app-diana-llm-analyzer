// ESLint 9 flat config — Inteligência da DIANA (Node + TypeScript).
// Espelha as convenções do núcleo (app-diana-monitoring): @typescript-eslint
// recomendado, sem regras de React/JSX.
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/coverage/**", "**/node_modules/**", "contracts/schema/**"],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // O cliente OCI faz `import()` dinâmico do SDK oficial (carregado só quando
    // ANALYZER_MODE=oci e as credenciais existem). O SDK não é dependência de
    // build; por isso o módulo é tipado de forma frouxa aqui.
    files: ["src/oci/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // Testes navegam estruturas dinâmicas (JSON Schema) — `any` pontual é ok.
    files: ["test/**/*.ts", "contracts/test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
