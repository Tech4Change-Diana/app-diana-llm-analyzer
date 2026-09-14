import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../src/prompt/system.js";
import { buildUserPrompt, computeWindowMetadata, renderTranscript } from "../src/prompt/render.js";
import { groomingConversation } from "./fixtures.js";

describe("system prompt", () => {
  const system = buildSystemPrompt();
  it("inclui a taxonomia e a política P2/P3", () => {
    expect(system).toContain("secrecy_request");
    expect(system).toContain("image_request");
    expect(system).toContain("NÃO calcule score final");
  });
  it("inclui o guardrail anti prompt-injection (R6)", () => {
    expect(system).toContain("DADO");
  });
});

describe("render da janela", () => {
  it("metadados temporais corretos", () => {
    const meta = computeWindowMetadata(groomingConversation);
    expect(meta.messageCount).toBe(5);
    expect(meta.durationMinutes).toBe(5);
    expect(meta.startedAt).toBe("2026-09-13T14:00:10.000Z");
  });

  it("transcrição ordenada com messageIds e horário relativo", () => {
    const t = renderTranscript(groomingConversation);
    const lines = t.split("\n");
    expect(lines[0]).toContain("(MSG-1)");
    expect(lines[0]).toContain("00:00");
    expect(lines[0]).toContain("Criança");
    expect(t).toContain("(MSG-9)");
    expect(t).toContain("Outro: Me manda uma foto sua");
  });

  it("user prompt combina metadados + transcrição", () => {
    const user = buildUserPrompt(groomingConversation);
    expect(user).toContain("METADADOS DA JANELA");
    expect(user).toContain("TRANSCRIÇÃO");
    expect(user).toContain("(MSG-7)");
  });
});
