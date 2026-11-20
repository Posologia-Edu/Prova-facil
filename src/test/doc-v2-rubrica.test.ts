import { describe, expect, it } from "vitest";
import { criteriosAplicaveis, DOC_V2_CRITERIOS, notaRubricaDoc, SOMA_PESOS_DOC_V2 } from "@/lib/doc-v2-rubrica";

describe("rubrica da Documentação v2", () => {
  it("os pesos somam 10 e há 10 critérios", () => {
    expect(DOC_V2_CRITERIOS.length).toBe(10);
    expect(SOMA_PESOS_DOC_V2).toBeCloseTo(10, 5);
  });
  it("sem paciente virtual, os dois critérios de aconselhamento ficam de fora", () => {
    const ids = criteriosAplicaveis(false).map((c) => c.id);
    expect(ids).not.toContain("dv-aconselhamento");
    expect(ids).not.toContain("dv-teachback");
    expect(criteriosAplicaveis(true).length).toBe(10);
  });
  it("nota 4 em tudo vale 10 e 0 em tudo vale 0, com ou sem paciente", () => {
    for (const p of [false, true]) {
      const todos = Object.fromEntries(criteriosAplicaveis(p).map((c) => [c.id, 4]));
      const zero = Object.fromEntries(criteriosAplicaveis(p).map((c) => [c.id, 0]));
      expect(notaRubricaDoc(todos, p)).toBe(10);
      expect(notaRubricaDoc(zero, p)).toBe(0);
    }
  });
  it("critério sem nota ou n/a não pesa", () => {
    const base = Object.fromEntries(criteriosAplicaveis(false).map((c) => [c.id, 2]));
    expect(notaRubricaDoc(base, false)).toBe(5);
    expect(notaRubricaDoc({ ...base, "dv-plano": "__na__" }, false)).toBe(5);
  });
  it("ignora nota de critério de paciente quando a sala não usa paciente", () => {
    expect(notaRubricaDoc({ "dv-fidelidade": 4, "dv-aconselhamento": 0 }, false)).toBe(10);
  });
});
