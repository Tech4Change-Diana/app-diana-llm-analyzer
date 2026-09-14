import { describe, it, expect } from "vitest";
import { loadOciConfig } from "../src/config/env.js";

describe("loadOciConfig", () => {
  it("default é mock, sem exigir credenciais (CI/dev)", () => {
    const config = loadOciConfig({});
    expect(config.analyzerMode).toBe("mock");
    expect(config.region).toBe("sa-saopaulo-1");
  });

  it("ANALYZER_MODE=oci exige compartment", () => {
    expect(() => loadOciConfig({ ANALYZER_MODE: "oci" })).toThrow(/OCI_COMPARTMENT_OCID/);
  });

  it("ANALYZER_MODE=oci exige model id OU endpoint", () => {
    expect(() => loadOciConfig({ ANALYZER_MODE: "oci", OCI_COMPARTMENT_OCID: "ocid1..x" })).toThrow(
      /OCI_GENAI_MODEL_ID/,
    );
  });

  it("aceita configuração OCI on-demand completa", () => {
    const config = loadOciConfig({
      ANALYZER_MODE: "oci",
      OCI_COMPARTMENT_OCID: "ocid1.compartment..x",
      OCI_GENAI_MODEL_ID: "cohere.command-r-plus",
      OCI_GENAI_ENV: "production",
      OCI_AUTH: "instance_principal",
    });
    expect(config.environment).toBe("production");
    expect(config.auth).toBe("instance_principal");
    expect(config.modelId).toBe("cohere.command-r-plus");
  });
});
