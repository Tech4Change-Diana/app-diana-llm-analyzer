import { describe, it, expect } from "vitest";
import { OciGenAiRiskAnalyzer } from "../src/analyzer/OciGenAiRiskAnalyzer.js";
import { MockRiskAnalyzer } from "../src/analyzer/MockRiskAnalyzer.js";
import { loadOciConfig } from "../src/config/env.js";
import type { ChatInvoker } from "../src/oci/client.js";
import { groomingConversation, validLlmOutputJson } from "./fixtures.js";

const ociConfig = loadOciConfig({
  ANALYZER_MODE: "oci",
  OCI_COMPARTMENT_OCID: "ocid1.compartment.oc1..exemplo",
  OCI_GENAI_MODEL_ID: "cohere.command-r-plus",
  OCI_GENAI_ENV: "development",
  OCI_MAX_RETRIES: "1",
  LOG_LEVEL: "error",
});

describe("OciGenAiRiskAnalyzer", () => {
  it("caminho feliz: usa a OCI (invoker mockado) e não cai no mock", async () => {
    const invoker: ChatInvoker = {
      chat: async () => validLlmOutputJson(),
    };
    const analyzer = new OciGenAiRiskAnalyzer(ociConfig, { invoker });
    const result = await analyzer.analyzeConversation(groomingConversation);

    expect(result.model.environment).toBe("development");
    expect(result.signals.map((s) => s.type)).toContain("image_request");
  });

  it("fallback: OCI lança erro => resultado com environment 'mock'", async () => {
    const invoker: ChatInvoker = {
      chat: async () => {
        throw new Error("timeout de rede simulado");
      },
    };
    const analyzer = new OciGenAiRiskAnalyzer(ociConfig, { invoker });
    const result = await analyzer.analyzeConversation(groomingConversation);

    expect(result.model.environment).toBe("mock");
    expect(result.conversationId).toBe(groomingConversation.id);
  });

  it("fallback: resposta malformada após retry => mock; tenta maxRetries+1 vezes", async () => {
    let calls = 0;
    const invoker: ChatInvoker = {
      chat: async () => {
        calls += 1;
        return "resposta sem json";
      },
    };
    const analyzer = new OciGenAiRiskAnalyzer(ociConfig, { invoker });
    const result = await analyzer.analyzeConversation(groomingConversation);

    expect(calls).toBe(2); // OCI_MAX_RETRIES=1 => 2 tentativas
    expect(result.model.environment).toBe("mock");
  });

  it("ANALYZER_MODE=mock nunca chama a OCI", async () => {
    let called = false;
    const invoker: ChatInvoker = {
      chat: async () => {
        called = true;
        return validLlmOutputJson();
      },
    };
    const mockConfig = loadOciConfig({ ANALYZER_MODE: "mock" });
    const analyzer = new OciGenAiRiskAnalyzer(mockConfig, { invoker });
    const result = await analyzer.analyzeConversation(groomingConversation);

    expect(called).toBe(false);
    expect(result.model.environment).toBe("mock");
  });

  it("createInvoker que falha => fallback (SDK/credenciais indisponíveis)", async () => {
    const analyzer = new OciGenAiRiskAnalyzer(ociConfig, {
      createInvoker: async () => {
        throw new Error("SDK indisponível");
      },
    });
    const result = await analyzer.analyzeConversation(groomingConversation);
    expect(result.model.environment).toBe("mock");
  });
});

describe("MockRiskAnalyzer (baseline/fallback)", () => {
  it("detecta sinais por regex e consolida", async () => {
    const result = await new MockRiskAnalyzer().analyzeConversation(groomingConversation);
    expect(result.model.environment).toBe("mock");
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.assessment.requiresGuardianAttention).toBe(true);
  });
});
