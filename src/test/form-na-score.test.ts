import { describe, it, expect } from "vitest";
import { computeFormScore, NA_ANSWER, type FormField } from "@/components/forms/types";

const radio = (id: string, peso: number): FormField => ({
  id, label: id, type: "radio", options: ["Sim", "Parcial", "Não"], max_score: peso,
  option_scores: { "0": peso, "1": peso / 2 }, correct_answer: "0", allow_na: true,
});

describe("computeFormScore com Não se aplica", () => {
  const fields = [radio("a", 5), radio("b", 3), radio("c", 2)];
  it("sem N/A é a soma simples", () => {
    expect(computeFormScore(fields, { a: "Sim", b: "Parcial", c: "Não" })).toBe(6.5);
  });
  it("N/A sai da conta e a nota é recalculada sobre o total", () => {
    // fez 5 de 8 aplicáveis, total 10 → 6,25
    expect(computeFormScore(fields, { a: "Sim", b: "Não", c: NA_ANSWER })).toBe(6.25);
  });
  it("tudo N/A vale 0", () => {
    expect(computeFormScore(fields, { a: NA_ANSWER, b: NA_ANSWER, c: NA_ANSWER })).toBe(0);
  });
});
