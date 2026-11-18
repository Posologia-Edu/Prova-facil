import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import FormRenderer from "@/components/forms/FormRenderer";
import { tableCellChoices, type FormField } from "@/components/forms/types";
import { anamneseFarmaceuticaTemplate } from "@/lib/form-templates/pharmacy-anamnese-farmaceutica";
import { SOAP_V2, soapV2Template } from "@/lib/form-templates/pharmacy-soap-v2";
import { allNativeTemplates } from "@/lib/form-templates";
import { montarSoapV2, progressoPorParte, verificarCoerencia } from "@/lib/soap-v2";

const campos = anamneseFarmaceuticaTemplate.content_json as FormField[];
const id = (rotulo: string, tipo?: string) => campos.find((f) => f.label === rotulo && (!tipo || f.type === tipo))!.id;

describe("modelo SOAP v2", () => {
  it("está registrado e tem ids únicos", () => {
    expect(allNativeTemplates).toContain(soapV2Template);
    const ids = soapV2Template.content_json.map((f: FormField) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const v of Object.values(SOAP_V2)) expect(ids).toContain(v);
  });

  it("tem as quatro partes S, O, A e P", () => {
    const partes = soapV2Template.content_json.filter((f: FormField) => f.type === "section_header").map((f: FormField) => f.label[0]);
    expect(partes).toEqual(["S", "O", "A", "P"]);
  });

  it("a coluna Problema do plano aponta para a coluna Problema da lista", () => {
    const plano = soapV2Template.content_json.find((f: FormField) => f.id === SOAP_V2.plano) as FormField;
    const ref = plano.table_col_ref![0]!;
    const lista = soapV2Template.content_json.find((f: FormField) => f.id === ref.field) as FormField;
    expect(lista.table_columns![ref.col]).toBe("Problema");
  });
});

describe("tableCellChoices", () => {
  const plano = soapV2Template.content_json.find((f: FormField) => f.id === SOAP_V2.plano) as FormField;
  it("lista só os problemas preenchidos, com o número da linha", () => {
    const resp = { [SOAP_V2.problemas]: [["Uso de AINE", "", "", "", ""], ["", "", "", "", ""], ["Pressão alta", "", "", "", ""]] };
    expect(tableCellChoices(plano, 0, resp).map((o) => o.value)).toEqual(["P1", "P3"]);
  });
  it("coluna de texto livre devolve null", () => {
    expect(tableCellChoices(plano, 1, {})).toBeNull();
  });
});

describe("FormRenderer: coluna de escolha", () => {
  it("troca o problema da ação e guarda o código", () => {
    const resp: Record<string, any> = { [SOAP_V2.problemas]: [["Uso de AINE", "", "", "", ""]] };
    let ultimo: Record<string, any> = resp;
    render(createElement(FormRenderer, {
      fields: [soapV2Template.content_json.find((f: FormField) => f.id === SOAP_V2.plano)],
      answers: resp,
      onChange: (a: Record<string, any>) => { ultimo = a; },
    }));
    const sel = screen.getByLabelText("Linha 1 · Problema") as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: "P1" } });
    expect(ultimo[SOAP_V2.plano][0][0]).toBe("P1");
  });
});

describe("montarSoapV2", () => {
  const registro = {
    fields: campos,
    answers: {
      [id("Motivo principal da consulta nas palavras do paciente")]: "Meu joelho dói quando subo escada.",
      [id("Queixa/sintoma")]: "Dor no joelho",
      [id("Início e evolução")]: "Há 1 ano, piora aos poucos",
      [id("Sinais de alerta")]: "Presentes",
      [id("Medicamentos em uso", "table")]: [
        ["Enalapril 10 mg", "1 comprimido, oral", "Manhã", "Hipertensão", "Toma 5 dias por semana"],
        ["", "", "", "", ""],
        ["Diclofenaco 50 mg", "", "", "Dor", "3 vezes ao dia"],
      ],
      [id("Parâmetros clínicos")]: [["148/92", "Sentado"], ["", ""]],
      [id("Problema prioritário 1")]: "Uso de anti-inflamatório sem prescrição",
      [id("Plano pactuado", "table")]: [["Suspender o diclofenaco", "Paciente", "7 dias"]],
    } as Record<string, any>,
  };
  const out = montarSoapV2(registro);

  it("leva o relato do paciente para o S, com as palavras dele", () => {
    expect(out[SOAP_V2.queixa]).toBe("Meu joelho dói quando subo escada.");
    expect(out[SOAP_V2.historia]).toContain("Queixa/sintoma: Dor no joelho");
    expect(out[SOAP_V2.historia]).toContain("Início e evolução: Há 1 ano");
  });
  it("reorganiza medicamentos em prescrito x uso real e pula linhas vazias", () => {
    expect(out[SOAP_V2.farmaco]).toEqual([
      ["Enalapril 10 mg", "1 comprimido, oral, Manhã", "Toma 5 dias por semana", ""],
      ["Diclofenaco 50 mg", "", "3 vezes ao dia", ""],
    ]);
  });
  it("copia o sinal de alerta e os problemas prioritários", () => {
    expect(out[SOAP_V2.alerta]).toBe("Presentes");
    expect(out[SOAP_V2.problemas][0][0]).toBe("Uso de anti-inflamatório sem prescrição");
  });
  it("monta o plano sem ligar a nenhum problema (essa decisão é do aluno)", () => {
    expect(out[SOAP_V2.plano][0]).toEqual(["", "Suspender o diclofenaco", "", "Paciente", "7 dias"]);
  });
  it("não cria campo quando o registro não tem nada", () => {
    expect(out[SOAP_V2.perspectiva]).toBeUndefined();
    expect(montarSoapV2({ fields: campos, answers: {} })).toEqual({});
  });
});

describe("verificarCoerencia", () => {
  const base = (): Record<string, any> => ({
    [SOAP_V2.queixa]: "Dor",
    [SOAP_V2.sintese]: "Resumo",
    [SOAP_V2.problemas]: [
      ["Uso de AINE", "Segurança", "S: toma diariamente", "Alta", "Alta"],
      ["Pressão alta", "Efetividade", "O: 148/92", "Média", "Média"],
    ],
    [SOAP_V2.plano]: [
      ["P1", "Suspender o AINE", "Sem AINE em 7 dias", "Paciente", "7 dias"],
      ["P2", "Reavaliar a pressão", "", "Farmacêutico", "14 dias"],
    ],
  });
  const textos = (a: Record<string, any>) => verificarCoerencia(a).filter((x) => x.nivel === "aviso").map((x) => x.texto);

  it("não avisa quando tudo se sustenta", () => {
    const r = verificarCoerencia(base());
    expect(r).toHaveLength(1);
    expect(r[0].nivel).toBe("ok");
  });
  it("avisa problema sem ação no plano", () => {
    const a = base();
    a[SOAP_V2.plano] = [["P1", "Suspender o AINE", "Meta", "Paciente", "7 dias"]];
    expect(textos(a)).toContain("P2 não tem ação no plano.");
  });
  it("avisa ação sem problema e ação que aponta para problema removido", () => {
    const a = base();
    a[SOAP_V2.plano][1][0] = "";
    a[SOAP_V2.plano][0][0] = "P5";
    const t = textos(a);
    expect(t).toContain("A ação da linha 2 não está ligada a um problema.");
    expect(t).toContain("A ação da linha 1 aponta para P5, que não está na lista de problemas.");
  });
  it("avisa prioridade alta sem meta", () => {
    const a = base();
    a[SOAP_V2.plano][0][2] = "";
    expect(textos(a)).toContain("P1 é de prioridade alta e nenhuma ação dele tem meta.");
  });
  it("avisa problema sem evidência", () => {
    const a = base();
    a[SOAP_V2.problemas][1][2] = "";
    expect(textos(a)).toContain("P2 não tem evidência do S ou do O.");
  });
  it("cobra conduta quando há sinais de alerta", () => {
    const a = base();
    a[SOAP_V2.alerta] = "Presentes";
    const t = textos(a);
    expect(t).toContain("Você marcou sinais de alerta presentes, mas não descreveu os sinais nem a conduta.");
    expect(t).toContain("Há sinais de alerta e o encaminhamento e seguimento estão em branco.");
  });
  it("lista vazia de problemas", () => {
    expect(textos({})).toContain("A lista de problemas está vazia.");
  });
});

describe("progressoPorParte", () => {
  it("conta campos preenchidos por parte", () => {
    const p = progressoPorParte(soapV2Template.content_json as FormField[], { [SOAP_V2.queixa]: "x", [SOAP_V2.problemas]: [["a", "", "", "", ""]] });
    expect(p).toHaveLength(4);
    expect(p[0].feitos).toBe(1);
    expect(p[2].feitos).toBe(1);
    expect(p[1].feitos).toBe(0);
  });
});
