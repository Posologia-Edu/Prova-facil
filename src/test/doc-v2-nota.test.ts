import { describe, expect, it } from "vitest";
import { ITENS_REVISAO, notaFinalDocV2, notaRevisao, parARevisar, revisaoCompleta } from "@/lib/doc-v2-nota";

describe("notaFinalDocV2", () => {
  it("80% rubrica + 20% revisão", () => { expect(notaFinalDocV2(8, 5)).toBeCloseTo(7.4, 5); });
  it("sem revisão recebida vale só a rubrica; sem rubrica não há nota", () => {
    expect(notaFinalDocV2(8, null)).toBe(8);
    expect(notaFinalDocV2(null, 9)).toBeNull();
  });
});

describe("parARevisar", () => {
  it("anel: cada dupla revisa a seguinte e a última volta à primeira", () => {
    expect(parARevisar(0, [0, 1, 2])).toBe(1);
    expect(parARevisar(2, [0, 1, 2])).toBe(0);
  });
  it("não há revisão com uma dupla só, nem com dupla fora da lista ou índice -1", () => {
    expect(parARevisar(0, [0])).toBeNull();
    expect(parARevisar(5, [0, 1])).toBeNull();
    expect(parARevisar(0, [0, -1, -1])).toBeNull();
  });
});

describe("notaRevisao", () => {
  const todas = (v: string) => Object.fromEntries(ITENS_REVISAO.map((i) => [i.id, v]));
  it("sim em tudo vale 10, não em tudo 0, em parte vale a metade", () => {
    expect(notaRevisao(todas("sim"))).toBe(10);
    expect(notaRevisao(todas("nao"))).toBe(0);
    expect(notaRevisao(todas("parcial"))).toBe(5);
  });
  it("revisão incompleta não tem nota", () => {
    const r = todas("sim"); delete (r as any)["rv-usaria"];
    expect(notaRevisao(r)).toBeNull();
    expect(notaRevisao(null)).toBeNull();
    expect(revisaoCompleta({ respostas: r as any, comentario: "" })).toBe(false);
    expect(revisaoCompleta({ respostas: todas("sim") as any, comentario: "" })).toBe(true);
  });
});
