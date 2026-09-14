# app-diana-llm-analyzer — Inteligência da DIANA

Componente de **interpretação** da DIANA. Recebe uma janela de conversa
(`Conversation`) e devolve uma **interpretação estruturada** (`AnalysisResult`)
implementando a interface congelada `RiskAnalyzer`. Usa **OCI Generative AI**
com **saída estruturada (JSON Schema)** e **cai para um mock** quando a OCI está
indisponível — a demo/MVP nunca trava.

> Princípio congelado (P2): **a LLM interpreta, o Risk Engine consolida.** A LLM
> produz indicadores/hipóteses com confiança; a consolidação determinística
> (`src/consolidation/`) transforma isso em `score`/`priority`. A LLM nunca
> decide o score final nem acusa.

Fonte da verdade do contrato: `app-diana-monitoring/docs/contracts.md`. Plano
de implementação: [`docs/analise-llm-analyzer.md`](docs/analise-llm-analyzer.md).

## Estrutura

```text
contracts/            # @diana/contracts — tipos de domínio + JSON Schema (ZERO deps de runtime)
  src/                # tipos por arquivo + taxonomia da LLM (§2.1)
  schema/             # JSON Schema GERADO (não editar à mão)
  scripts/            # geração de schema (dev-only)
src/                  # gateway (runtime)
  analyzer/           # OciGenAiRiskAnalyzer (+ fallback MockRiskAnalyzer) + mapeamento
  oci/                # cliente OCI (auth + chat) — SDK carregado por import() dinâmico
  prompt/             # system prompt + render da janela (metadados + transcrição)
  schema/             # validação/saneamento (zod) da saída da LLM + responseFormat
  consolidation/      # P2: risk-engine, contexto, explicabilidade, features (portado)
  config/             # env.ts (zod, fail-fast das OCI_*)
  index.ts            # superfície pública da lib (@diana/llm-analyzer)
test/                 # Vitest: schema, mapeamento, fallback, prompt, config
```

## Requisitos

- Node.js **>= 22** (usa npm workspaces).

## Instalação

```bash
npm install
```

## Scripts

```bash
npm run build          # compila @diana/contracts e o gateway
npm run build:schema   # regenera contracts/schema/*.json a partir dos tipos
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit (contracts + gateway)
npm test               # Vitest (build de contracts + testes)
npm run check          # lint + typecheck + test (o que a CI roda)
```

> Sem credenciais, o modo padrão (`ANALYZER_MODE=mock`) roda inteiramente local.
> **Os testes nunca chamam a OCI de verdade** — a chamada é injetada/mockada.

## Configuração

Copie `.env.example` para `.env`. Variáveis em [`.env.example`](.env.example):
modo (`ANALYZER_MODE`), OCI (`OCI_COMPARTMENT_OCID`, `OCI_GENAI_MODEL_ID` **ou**
`OCI_GENAI_ENDPOINT_ID`, `OCI_REGION`), autenticação (`OCI_AUTH` =
`config_file` | `instance_principal` | `resource_principal`), ambiente
(`OCI_GENAI_ENV`) e inferência (temperatura, tokens, timeout, retries).

> **Segredos (doc 06):** em produção preferir **resource/instance principal** —
> a credencial da OCI nunca vai ao repositório. Em dev, `~/.oci/config` fora do git.

## Uso (biblioteca importável)

O núcleo pluga o gateway em uma linha na fábrica `createAnalyzer()` (ADR 0001):

```ts
import { OciGenAiRiskAnalyzer, loadOciConfig } from "app-diana-llm-analyzer";

const analyzer = new OciGenAiRiskAnalyzer(loadOciConfig());
const result = await analyzer.analyzeConversation(conversation);
// OCI real; se indisponível, result.model.environment === "mock" (fallback).
```

`createRiskAnalyzer(config)` é um atalho: devolve o mock em `ANALYZER_MODE=mock`
e o gateway OCI em `ANALYZER_MODE=oci`.

## Fluxo da análise (OCI)

1. `prompt/` monta system prompt (instruções + taxonomia + política P2/P3 +
   guardrail anti-injection) e a janela (metadados temporais + transcrição com
   `messageIds`).
2. `oci/` chama a OCI Generative AI (GenericChatRequest) com **saída estruturada
   nativa** (`responseFormat: JSON_SCHEMA`, quando `OCI_STRUCTURED_OUTPUT=true`);
   o zod no cliente segue como guardrail independente do suporte do modelo (R2).
3. `schema/llmOutput.ts` valida (zod) e saneia a resposta (descarta `messageIds`
   inexistentes, clampa confiança/probabilidade); 1 retry em falha de schema.
4. `analyzer/mapOutput.ts` mapeia para `DetectedSignal[]` e roda a consolidação
   determinística (`src/consolidation/`) → `AnalysisResult`.
5. Falha de OCI (rede/auth/quota/timeout) ou schema após retry → **fallback**
   para `MockRiskAnalyzer` (`environment: "mock"`).
