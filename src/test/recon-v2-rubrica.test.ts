import { describe, expect, it } from "vitest";
import { computeFormScore, NA_ANSWER } from "@/components/forms/types";
import { RECON_V2_CRITERIOS, SOMA_PESOS_RECON_V2, criticasEmRisco, type LinhaMatriz } from "@/lib/recon-v2-rubrica";

const linha = (p: Partial<LinhaMatriz>): LinhaMatriz => ({
  id: "d1", medicamento: "X", tipo: "omissao", risco: "grave", critica: true, descricao: "", acao_esperada: "", fontes: [], fonte_aberta: true,
  achou: "sim", classificou: "sim", risco_avaliado: "sim", acao: "sim", comentario: "", ...p,
});

describe("rubrica da Reconciliação v2", () => {
  it("tem 10 critérios de ids únicos e pesos que somam 10", () => {
    expect(RECON_V2_CRITERIOS).toHaveLength(10);
    expect(new Set(RECON_V2_CRITERIOS.map((c) => c.id)).size).toBe(10);
    expect(SOMA_PESOS_RECON_V2).toBeCloseTo(10, 5);
  });
  it("só a lista final aceita não se aplica", () => {
    expect(RECON_V2_CRITERIOS.filter((c) => c.allow_na).map((c) => c.id)).toEqual(["rv-lista-final"]);
  });
  it("nota máxima é 10 e a lista final como NA não derruba a nota", () => {
    const todos = Object.fromEntries(RECON_V2_CRITERIOS.map((c) => [c.id, 4]));
    expect(computeFormScore(RECON_V2_CRITERIOS, todos)).toBeCloseTo(10, 5);
    expect(computeFormScore(RECON_V2_CRITERIOS, { ...todos, "rv-lista-final": NA_ANSWER })).toBeCloseTo(10, 5);
  });
  it("nota zero com tudo zero", () => {
    expect(computeFormScore(RECON_V2_CRITERIOS, Object.fromEntries(RECON_V2_CRITERIOS.map((c) => [c.id, 0])))).toBe(0);
  });
});

describe("discrepâncias críticas em risco", () => {
  it("lista as críticas não achadas ou com ação fraca, e ignora as outras", () => {
    const m = [
      linha({ id: "a" }),
      linha({ id: "b", achou: "nao", classificou: "na", risco_avaliado: "na", acao: "na" }),
      linha({ id: "c", acao: "parcial" }),
      linha({ id: "d", critica: false, achou: "nao" }),
    ];
    expect(criticasEmRisco(m).map((l) => l.id)).toEqual(["b", "c"]);
    expect(criticasEmRisco(undefined)).toEqual([]);
  });
});
