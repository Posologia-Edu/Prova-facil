import { describe, expect, it } from "vitest";
import { allNativeTemplates } from "@/lib/form-templates";
import { RECON_V2, reconciliationV2Template } from "@/lib/form-templates/pharmacy-reconciliation-v2";
import type { FormField } from "@/components/forms/types";
import {
  chaveMedicamento, clearanceCreatinina, medicamentosBpmh, montarConciliacao, validarCaso, verificarCoerenciaRecon,
  type CasoCompleto,
} from "@/lib/recon-v2";

const base = (): CasoCompleto => ({
  caso: {
    versao: 2, titulo: "Caso", resumo: "Resumo", transicao: "admissao", nivel: "intermediario",
    paciente: { nome: "Marlene", idade: 76, sexo: "F", peso_kg: 58, creatinina_mg_dl: 1.9, alergias_registradas: "nenhuma", motivo: "ITU" },
    fontes: [
      { id: "f1", tipo: "relato", titulo: "Relato", texto: "Toma o remédio da pressão." },
      { id: "f2", tipo: "caixa", titulo: "Caixa", texto: "Ibuprofeno 600 mg." },
      { id: "f3", tipo: "exames", titulo: "Exames", texto: "Creatinina 1,9." },
    ],
  },
  prescricao: [{ medicamento: "Losartana 50 mg", dose: "50 mg", via: "VO", frequencia: "12/12 h" }],
  gabarito: {
    discrepancias: [
      { id: "d1", medicamento: "Losartana", tipo: "ajuste_renal", intencionalidade: "nao_intencional", risco: "grave", critica: true, fontes: ["f3"], descricao: "Mantida com lesão renal", acao_esperada: "Suspender" },
      { id: "d2", medicamento: "Ibuprofeno", tipo: "omissao", intencionalidade: "nao_intencional", risco: "leve", critica: false, fontes: ["f2"], descricao: "Uso próprio", acao_esperada: "Suspender" },
    ],
    bpmh: [{ medicamento: "Ibuprofeno 600 mg", uso_real: "3 por dia", fontes: ["f1", "f2"] }],
    outros_problemas: [],
  },
});

describe("modelo da Reconciliação v2", () => {
  it("está registrado e tem ids únicos e as quatro partes", () => {
    expect(allNativeTemplates).toContain(reconciliationV2Template);
    const campos = reconciliationV2Template.content_json as FormField[];
    const ids = campos.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const v of Object.values(RECON_V2)) expect(ids).toContain(v);
    expect(campos.filter((f) => f.type === "section_header").map((f) => f.label[0])).toEqual(["1", "2", "3", "4"]);
  });
  it("a conciliação tem uma coluna de escolha para cada classificação", () => {
    const f = (reconciliationV2Template.content_json as FormField[]).find((c) => c.id === RECON_V2.conciliacao)!;
    expect(f.table_columns).toHaveLength(7);
    expect(f.table_col_options!.map((o) => !!o)).toEqual([false, true, true, true, true, false, true]);
  });
});

describe("clearance de creatinina", () => {
  it("calcula Cockcroft-Gault", () => {
    expect(clearanceCreatinina(76, 58, 1.9, "F")!).toBeCloseTo(((64 * 58) / (72 * 1.9)) * 0.85, 5);
    expect(clearanceCreatinina(70, 80, 1, "M")!).toBeCloseTo(((70 * 80) / 72), 5);
  });
  it("devolve null sem dado válido", () => {
    expect(clearanceCreatinina(70, 80, 0, "M")).toBeNull();
    expect(clearanceCreatinina(NaN, 80, 1, "M")).toBeNull();
  });
});

describe("validação do caso", () => {
  it("aceita um caso completo", () => {
    expect(validarCaso(base()).filter((a) => a.nivel === "erro")).toEqual([]);
  });
  it("exige fonte que existe, discrepância não intencional e uma grave", () => {
    const c = base();
    c.gabarito.discrepancias[0].fontes = ["zzz"];
    c.gabarito.discrepancias.forEach((d) => { d.intencionalidade = "intencional_documentada"; d.risco = "leve"; });
    const erros = validarCaso(c).filter((a) => a.nivel === "erro").map((a) => a.texto).join("|");
    expect(erros).toMatch(/fonte que não existe/);
    expect(erros).toMatch(/não intencional/);
    expect(erros).toMatch(/risco grave/);
  });
  it("exige creatinina quando a discrepância é de função renal", () => {
    const c = base();
    c.caso.paciente.creatinina_mg_dl = undefined;
    expect(validarCaso(c).some((a) => a.nivel === "erro" && /função renal/.test(a.texto))).toBe(true);
  });
  it("avisa se uma fonte cita o gabarito", () => {
    const c = base();
    c.caso.fontes[0].texto = "DISCREPÂNCIAS PARA IDENTIFICAÇÃO";
    expect(validarCaso(c).some((a) => /cita discrep/.test(a.texto))).toBe(true);
  });
});

describe("pré-montagem e verificador", () => {
  it("chaveMedicamento ignora concentração", () => {
    expect(chaveMedicamento("Losartana potássica 50 mg")).toBe("losartana potassica");
    expect(chaveMedicamento("Dipirona 1 g EV")).toBe("dipirona");
  });
  it("monta a conciliação com BPMH e prescrição sem repetir", () => {
    const m = montarConciliacao(["Losartana 50 mg", "Ibuprofeno 600 mg"], [
      { medicamento: "Losartana", dose: "50 mg", via: "VO", frequencia: "12/12 h" },
      { medicamento: "Dipirona", dose: "1 g", via: "EV", frequencia: "6/6 h" },
    ]);
    expect(m.slice(0, 3).map((l) => [l[0], l[1]])).toEqual([
      ["Losartana 50 mg", "BPMH e prescrição"], ["Ibuprofeno 600 mg", "Só BPMH"], ["Dipirona 1 g", "Só prescrição"],
    ]);
    expect(m.length).toBeGreaterThanOrEqual(16);
  });
  it("lê os medicamentos da BPMH", () => {
    expect(medicamentosBpmh({ [RECON_V2.bpmh]: [["Losartana", "x", "y", ""], ["", "", "", ""], ["Ibuprofeno", "", "", ""]] })).toEqual(["Losartana", "Ibuprofeno"]);
  });
  it("avisa de linha sem classificação, risco incoerente e SBAR em branco com dano grave", () => {
    const conc = [
      ["Losartana", "BPMH e prescrição", "Mantido", "Não intencional", "Sem dano", "", "Manter"],
      ["Ibuprofeno", "Só BPMH", "Mantido", "Não intencional", "Grave", "", "Manter"],
      ["Dipirona", "Só prescrição", "", "", "", "", ""],
    ];
    const texto = verificarCoerenciaRecon({ [RECON_V2.conciliacao]: conc }, []).map((a) => a.texto).join("|");
    expect(texto).toMatch(/não intencional e sem dano/);
    expect(texto).toMatch(/Omitido/);
    expect(texto).toMatch(/falta classificar/);
    expect(texto).toMatch(/SBAR/);
  });
  it("avisa de medicamento da prescrição sem linha", () => {
    const av = verificarCoerenciaRecon({ [RECON_V2.alergias]: "nenhuma", [RECON_V2.conciliacao]: [] }, [{ medicamento: "Enoxaparina", dose: "40 mg", via: "SC", frequencia: "1x/dia" }]);
    expect(av.some((a) => /Enoxaparina/.test(a.texto))).toBe(true);
  });
});

import { CASOS_SEMENTE } from "@/lib/recon-v2-seeds";

describe("casos-semente", () => {
  it("são 3, de transições diferentes", () => {
    expect(CASOS_SEMENTE).toHaveLength(3);
    expect(CASOS_SEMENTE.map((c) => c.caso.transicao).sort()).toEqual(["admissao", "alta", "transferencia"]);
  });
  for (const c of CASOS_SEMENTE) {
    it(`passam na validação sem erro nem aviso: ${c.caso.titulo}`, () => {
      expect(validarCaso(c)).toEqual([]);
    });
    it(`o dossiê não vaza o gabarito: ${c.caso.titulo}`, () => {
      const texto = JSON.stringify(c.caso).toLowerCase();
      expect(texto).not.toMatch(/discrep|gabarito|armadilha/);
    });
  }
  it("a conta de clearance dos comentários confere", () => {
    const [a, b, c] = CASOS_SEMENTE.map((x) => x.caso.paciente);
    expect(clearanceCreatinina(a.idade, a.peso_kg, a.creatinina_mg_dl!, a.sexo)!).toBeCloseTo(23, 0);
    expect(clearanceCreatinina(b.idade, b.peso_kg, b.creatinina_mg_dl!, b.sexo)!).toBeCloseTo(59, 0);
    expect(clearanceCreatinina(c.idade, c.peso_kg, c.creatinina_mg_dl!, c.sexo)!).toBeCloseTo(49, 0);
  });
});
