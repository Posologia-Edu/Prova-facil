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

import { notaFinalReconV2, parARevisar } from "@/lib/recon-v2-nota";
import { RECON_V2_REVISAO, reconciliationV2PeerTemplate } from "@/lib/form-templates/pharmacy-reconciliation-v2";
import { allNativeTemplates } from "@/lib/form-templates";

describe("nota final e revisão cruzada", () => {
  it("80% rubrica + 20% revisão recebida; sem revisão vale a rubrica; sem rubrica não há nota", () => {
    expect(notaFinalReconV2(8, 6)).toBeCloseTo(7.6, 5);
    expect(notaFinalReconV2(8, null)).toBe(8);
    expect(notaFinalReconV2(null, 9)).toBeNull();
  });
  it("anel: cada dupla revisa a seguinte e a última volta à primeira", () => {
    expect(parARevisar(0, [0, 1, 2])).toBe(1);
    expect(parARevisar(2, [0, 1, 2])).toBe(0);
    expect(parARevisar(3, [3, 0, 7])).toBe(7);
  });
  it("uma dupla sozinha, ou fora da lista, não tem quem revisar", () => {
    expect(parARevisar(0, [0])).toBeNull();
    expect(parARevisar(5, [0, 1])).toBeNull();
    expect(parARevisar(0, [-1, 0])).toBeNull();
  });
  it("o checklist da revisão está registrado, soma 10 e tem 8 itens e 2 comentários", () => {
    expect(allNativeTemplates).toContain(reconciliationV2PeerTemplate);
    const c = reconciliationV2PeerTemplate.content_json as any[];
    expect(c.filter((f) => f.type === "radio")).toHaveLength(8);
    expect(c.filter((f) => f.type === "radio").reduce((s, f) => s + f.max_score, 0)).toBeCloseTo(10, 5);
    expect(c.map((f) => f.id)).toEqual(expect.arrayContaining([...RECON_V2_REVISAO.itens, RECON_V2_REVISAO.comentarioBem, RECON_V2_REVISAO.comentarioDuvida]));
  });
});
