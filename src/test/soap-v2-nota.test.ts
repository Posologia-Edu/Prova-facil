import { describe, expect, it } from "vitest";
import { computeFormScore, NA_ANSWER } from "@/components/forms/types";
import { SOAP_V2_CRITERIOS, avaliacaoSoapV2, respostaEhSoapV2 } from "@/lib/soap-v2-rubrica";
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
  it("lê a avaliação guardada em ai_feedback_json", () => {
    expect(avaliacaoSoapV2({ ai_feedback_json: { avaliacao_v2: { confirmado: true, respostas: {} } } })?.confirmado).toBe(true);
    expect(avaliacaoSoapV2({ ai_feedback_json: { feedback: "v1" } })).toBeNull();
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
