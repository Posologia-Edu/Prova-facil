import { describe, expect, it } from "vitest";
import { computeFormScore as noNavegador } from "@/components/forms/types";
import { computeFormScore as noServidor } from "../../supabase/functions/_shared/form-score";

// A nota do observador é recalculada no servidor (sim-aluno). Estas duas implementações precisam dar o mesmo resultado.
const campos: any[] = [
  { id: "a", label: "A", type: "scale", max_score: 4, scale_max: 4, allow_na: true },
  { id: "b", label: "B", type: "radio", max_score: 2, options: ["x", "y", "z"], option_scores: { "0": 0, "1": 1, "2": 2 } },
  { id: "c", label: "C", type: "checkbox", max_score: 3, options: ["p", "q", "r"], correct_answer: [0, 2] },
  { id: "d", label: "D", type: "rating", max_score: 5, rating_max: 5 },
  { id: "e", label: "E", type: "text", max_score: 1 },
  { id: "f", label: "F", type: "textarea" },
];

const casos: Record<string, any>[] = [
  {},
  { a: 3, b: "y", c: ["p", "r"], d: 4, e: 1 },
  { a: "__na__", b: "z", c: ["p"], d: 2 },
  { a: 2, b: "x", c: ["p", "q", "r"], d: 5, e: 7 },
  { a: "__na__", b: "__na__" },
];

describe("nota do formulário: servidor × navegador", () => {
  it.each(casos.map((c, i) => [i, c] as const))("caso %s", (_i, respostas) => {
    expect(noServidor(campos, respostas)).toBe(noNavegador(campos, respostas));
  });
});
