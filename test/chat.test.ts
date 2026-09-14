import { describe, it, expect } from "vitest";
import { buildChatDetails, buildServingMode } from "../src/oci/chat.js";
import { buildResponseSchema } from "../src/schema/llmOutput.js";
import { loadOciConfig } from "../src/config/env.js";

const onDemand = loadOciConfig({
  ANALYZER_MODE: "oci",
  OCI_COMPARTMENT_OCID: "ocid1.compartment..x",
  OCI_GENAI_MODEL_ID: "cohere.command-r-plus",
  OCI_GENAI_ENV: "development",
});

describe("buildChatDetails / responseFormat (achado A)", () => {
  it("inclui responseFormat JSON_SCHEMA quando um schema é fornecido", () => {
    const details = buildChatDetails(onDemand, {
      system: "s",
      user: "u",
      temperature: 0.1,
      maxTokens: 512,
      responseSchema: buildResponseSchema(),
    });
    const rf = details.chatRequest.responseFormat;
    expect(rf.type).toBe("JSON_SCHEMA");
    expect(rf.jsonSchema.name).toBe("LlmAnalysisOutput");
    expect(rf.jsonSchema.schema.properties.signals.items.properties.type.enum).toContain(
      "image_request",
    );
  });

  it("omite responseFormat quando nenhum schema é fornecido", () => {
    const details = buildChatDetails(onDemand, {
      system: "s",
      user: "u",
      temperature: 0.1,
      maxTokens: 512,
    });
    expect(details.chatRequest.responseFormat).toBeUndefined();
  });

  it("seleciona on-demand (modelId) vs dedicado (endpointId)", () => {
    expect(buildServingMode(onDemand)).toEqual({
      servingType: "ON_DEMAND",
      modelId: "cohere.command-r-plus",
    });
    const dedicated = loadOciConfig({
      ANALYZER_MODE: "oci",
      OCI_COMPARTMENT_OCID: "ocid1.compartment..x",
      OCI_GENAI_ENDPOINT_ID: "ocid1.endpoint..y",
      OCI_GENAI_ENV: "production",
    });
    expect(buildServingMode(dedicated)).toEqual({
      servingType: "DEDICATED",
      endpointId: "ocid1.endpoint..y",
    });
  });
});
