import { describe, expect, it } from "vitest";
import { NA_ANSWER, computeFormScore, type FormField } from "@/components/forms/types";
import { observadorV2Template, professorV2Template } from "@/lib/form-templates/pharmacy-avaliacao-anamnese-v2";

const obs = observadorV2Template.content_json as FormField[];
const prof = professorV2Template.content_json as FormField[];
const pont = (fs: FormField[]) => fs.filter((f) => (f.max_score || 0) > 0);

describe("Não se aplica nos modelos reais", () => {
  it("observador: tudo Sim = 10; um critério N/A e o resto Sim continua 10", () => {
    const todos = Object.fromEntries(pont(obs).map((f) => [f.id, "Sim"]));
    expect(computeFormScore(obs, todos)).toBeCloseTo(10);
    const [primeiro, ...resto] = pont(obs);
    expect(computeFormScore(obs, { ...todos, [primeiro.id]: NA_ANSWER })).toBeCloseTo(10);
  });
  it("observador: Parcial em tudo = 5, mesmo com um critério N/A", () => {
    const todos = Object.fromEntries(pont(obs).map((f) => [f.id, "Parcial"]));
    expect(computeFormScore(obs, todos)).toBeCloseTo(5);
    expect(computeFormScore(obs, { ...todos, [pont(obs)[0].id]: NA_ANSWER })).toBeCloseTo(5);
  });
  it("observador: sem N/A, errar um critério de 1,0 tira 1,0; com ele N/A o critério deixa de pesar", () => {
    const todos = Object.fromEntries(pont(obs).map((f) => [f.id, "Sim"]));
    const um = pont(obs).find((f) => f.max_score === 1)!;
    expect(computeFormScore(obs, { ...todos, [um.id]: "Não" })).toBeCloseTo(9);
    expect(computeFormScore(obs, { ...todos, [um.id]: NA_ANSWER })).toBeCloseTo(10);
  });
  it("professor (escala 0–4): tudo 4 = 10, tudo 2 = 5, e N/A não puxa a nota para baixo", () => {
    const tudo = (v: number) => Object.fromEntries(pont(prof).map((f) => [f.id, v]));
    expect(computeFormScore(prof, tudo(4))).toBeCloseTo(10);
    expect(computeFormScore(prof, tudo(2))).toBeCloseTo(5);
    expect(computeFormScore(prof, { ...tudo(4), [pont(prof)[0].id]: NA_ANSWER })).toBeCloseTo(10);
    expect(computeFormScore(prof, { ...tudo(2), [pont(prof)[1].id]: NA_ANSWER })).toBeCloseTo(5);
  });
});
