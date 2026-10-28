import { describe, expect, it } from "vitest";
import { computeFormScore } from "@/components/forms/types";
import { REGISTRO_CRITERIOS, notaDaRodada, notaDoRegistro } from "@/lib/anamnese-registro";

describe("registro escrito", () => {
  it("os 7 critérios somam 10 pontos", () => {
    expect(REGISTRO_CRITERIOS).toHaveLength(7);
    expect(REGISTRO_CRITERIOS.reduce((s, f) => s + (f.max_score || 0), 0)).toBe(10);
  });
  it("tudo 4 vale 10 e tudo 2 vale 5", () => {
    const todos = (v: number) => Object.fromEntries(REGISTRO_CRITERIOS.map((f) => [f.id, v]));
    expect(computeFormScore(REGISTRO_CRITERIOS, todos(4))).toBeCloseTo(10);
    expect(computeFormScore(REGISTRO_CRITERIOS, todos(2))).toBeCloseTo(5);
  });
  it("só conta o registro depois de confirmado", () => {
    expect(notaDoRegistro({ score: 8, answers_json: {} })).toBeNull();
    expect(notaDoRegistro({ score: 8, answers_json: { _avaliacao_registro: { confirmado: false } } })).toBeNull();
    expect(notaDoRegistro({ score: 8, answers_json: { _avaliacao_registro: { confirmado: true } } })).toBe(8);
    expect(notaDoRegistro({ score: 7, registro: { confirmado: true } })).toBe(7);
    expect(notaDoRegistro(null)).toBeNull();
  });
});

describe("nota da rodada", () => {
  it("70% da média de professor e observador + 30% do registro", () => {
    const r = notaDaRodada(8, 6, 10); // média 7 -> 4,9 + 3 = 7,9
    expect(r.nota).toBeCloseTo(7.9);
    expect(r.comRegistro).toBe(true);
  });
  it("sem registro vale só a média, marcada como parcial", () => {
    expect(notaDaRodada(8, 6, null)).toEqual({ nota: 7, comRegistro: false });
  });
  it("com só uma avaliação enviada, usa a que existe", () => {
    expect(notaDaRodada(8, null, null).nota).toBe(8);
    expect(notaDaRodada(null, null, null).nota).toBe(0);
  });
});
