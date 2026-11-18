import { describe, expect, it } from "vitest";
import { computeFormScore, NA_ANSWER } from "@/components/forms/types";
import { SOAP_V2_CRITERIOS, respostaEhSoapV2 } from "@/lib/soap-v2-rubrica";
import { calculateSoapStudentGrade } from "@/lib/soap-grades";
import { SOAP_V2 } from "@/lib/form-templates/pharmacy-soap-v2";

const tudo = (n: number) => Object.fromEntries(SOAP_V2_CRITERIOS.map((c) => [c.id, n]));

describe("rubrica do SOAP v2", () => {
  it("tem 10 critérios com ids únicos, pesos que somam 10 e âncoras escritas", () => {
    expect(SOAP_V2_CRITERIOS).toHaveLength(10);
    expect(new Set(SOAP_V2_CRITERIOS.map((c) => c.id)).size).toBe(10);
    expect(SOAP_V2_CRITERIOS.reduce((s, c) => s + (c.max_score || 0), 0)).toBe(10);
    for (const c of SOAP_V2_CRITERIOS) expect(c.description).toMatch(/0:.*4:/);
  });
  it("nota 4 em tudo vale 10 e nota 0 vale 0", () => {
    expect(computeFormScore(SOAP_V2_CRITERIOS, tudo(4))).toBe(10);
    expect(computeFormScore(SOAP_V2_CRITERIOS, tudo(0))).toBe(0);
  });
  it("critério marcado não se aplica sai da conta e a nota é recalculada", () => {
    const r = { ...tudo(4), "sv-alerta": NA_ANSWER };
    expect(computeFormScore(SOAP_V2_CRITERIOS, r)).toBe(10);
    const meio = { ...tudo(2), "sv-alerta": NA_ANSWER };
    expect(computeFormScore(SOAP_V2_CRITERIOS, meio)).toBe(5);
  });
  it("só os critérios de sinais de alerta e de seguimento aceitam não se aplica", () => {
    expect(SOAP_V2_CRITERIOS.filter((c) => c.allow_na).map((c) => c.id)).toEqual(["sv-alerta", "sv-p-seguimento"]);
  });
});

describe("detecção e leitura do SOAP v2", () => {
  it("reconhece resposta v2 pelos ids dos campos", () => {
    expect(respostaEhSoapV2({ [SOAP_V2.queixa]: "x" })).toBe(true);
    expect(respostaEhSoapV2({ "sf-55": "x" })).toBe(false);
    expect(respostaEhSoapV2(null)).toBe(false);
  });
});

describe("nota final do SOAP v2", () => {
  const soapV2 = { answers_json: { [SOAP_V2.queixa]: "x" } };
  const par = { answers_json: { a: "Sim" } };
  const campos = [{ id: "a", label: "item", type: "radio" as const, options: ["Sim", "Não"], max_score: 10, correct_answer: "0" }];

  it("80% professor + 20% revisão por pares", () => {
    const r = calculateSoapStudentGrade({ peerEvaluation: par, soapResponse: { ...soapV2, admin_score: 8 }, evaluationFields: campos });
    expect(r.peerScore).toBe(10);
    expect(r.finalScore).toBeCloseTo(0.8 * 8 + 0.2 * 10, 5);
  });
  it("sem a revisão do par, vale a nota do professor", () => {
    expect(calculateSoapStudentGrade({ soapResponse: { ...soapV2, admin_score: 7 }, evaluationFields: campos }).finalScore).toBe(7);
  });
  it("sem nota confirmada do professor, a nota final não existe (a sugestão da IA não vale)", () => {
    const r = calculateSoapStudentGrade({ peerEvaluation: par, soapResponse: { ...soapV2, ai_score: 9 }, evaluationFields: campos });
    expect(r.finalScore).toBeNull();
  });
  it("SOAP v1 continua como média de professor e par", () => {
    const v1 = { answers_json: { "sf-55": "x" }, admin_score: 6 };
    const r = calculateSoapStudentGrade({ peerEvaluation: par, soapResponse: v1, evaluationFields: campos });
    expect(r.finalScore).toBe(8);
  });
});

import { soapV2PeerTemplate, soapV2Template } from "@/lib/form-templates/pharmacy-soap-v2";
import { allNativeTemplates } from "@/lib/form-templates";
import type { FormField } from "@/components/forms/types";

describe("revisão por pares do SOAP v2", () => {
  const campos = soapV2PeerTemplate.content_json as FormField[];
  const itens = campos.filter((f) => f.type === "radio");

  it("está registrada e é uma avaliação entre pares do módulo SOAP", () => {
    expect(allNativeTemplates).toContain(soapV2PeerTemplate);
    expect(soapV2PeerTemplate.form_type).toBe("peer_evaluation");
    expect(soapV2PeerTemplate.module_type).toBe("soap");
    expect(soapV2Template.form_type).toBe("soap");
  });
  it("tem 8 itens que somam 10 e Parcial vale exatamente metade", () => {
    expect(itens).toHaveLength(8);
    expect(itens.reduce((s, f) => s + (f.max_score || 0), 0)).toBe(10);
    for (const f of itens) expect(f.option_scores!["1"]).toBe(f.option_scores!["0"] / 2);
  });
  it("só o item de fidelidade ao paciente aceita não se aplica, e há dois comentários obrigatórios", () => {
    expect(itens.filter((f) => f.allow_na).map((f) => f.id)).toEqual(["sp2-2"]);
    expect(campos.filter((f) => f.type === "textarea").every((f) => f.required)).toBe(true);
    expect(campos.filter((f) => f.type === "textarea")).toHaveLength(2);
  });
  it("tudo Sim vale 10; Parcial em tudo vale 5", () => {
    const sim = Object.fromEntries(itens.map((f) => [f.id, "Sim"]));
    const parcial = Object.fromEntries(itens.map((f) => [f.id, "Parcial"]));
    expect(calculateSoapStudentGrade({ peerEvaluation: { answers_json: sim }, evaluationFields: campos }).peerScore).toBe(10);
    expect(calculateSoapStudentGrade({ peerEvaluation: { answers_json: parcial }, evaluationFields: campos }).peerScore).toBe(5);
  });
  it("quem não foi o paciente marca não se aplica e a nota é calculada sobre os outros itens", () => {
    const resp = Object.fromEntries(itens.map((f) => [f.id, "Sim"]));
    resp["sp2-2"] = NA_ANSWER;
    expect(calculateSoapStudentGrade({ peerEvaluation: { answers_json: resp }, evaluationFields: campos }).peerScore).toBe(10);
    resp["sp2-4"] = "Não";
    // 10 - 2 (item 4) de 8,5 pontos aplicáveis: 6,5/8,5 de 10
    expect(calculateSoapStudentGrade({ peerEvaluation: { answers_json: resp }, evaluationFields: campos }).peerScore).toBeCloseTo((6.5 / 8.5) * 10, 5);
  });
  it("a revisão v1 continua igual (sem item não se aplica)", () => {
    const v1 = [{ id: "a", label: "x", type: "radio" as const, options: ["Sim", "Não"], max_score: 4, correct_answer: "0" }];
    expect(calculateSoapStudentGrade({ peerEvaluation: { answers_json: { a: "Não" } }, evaluationFields: v1 }).peerScore).toBe(0);
  });
});
