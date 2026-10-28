import { describe, expect, it } from "vitest";
import { computeFieldScore, type FormField } from "@/components/forms/types";
import { getNativeTemplates } from "@/lib/form-templates";
import { observadorV2Template, professorV2Template } from "@/lib/form-templates/pharmacy-avaliacao-anamnese-v2";

const obs = observadorV2Template.content_json as FormField[];
const prof = professorV2Template.content_json as FormField[];
const pontuaveis = (fs: FormField[]) => fs.filter((f) => f.type !== "section_header" && (f.max_score || 0) > 0);
const soma = (fs: FormField[], resposta: (f: FormField) => any) => pontuaveis(fs).reduce((s, f) => s + computeFieldScore(f, resposta(f)), 0);
const somaPesos = (fs: FormField[]) => pontuaveis(fs).reduce((s, f) => s + (f.max_score || 0), 0);

describe("avaliação da anamnese v2", () => {
  it("cada instrumento soma exatamente 10 (regra para iniciar a sala)", () => {
    expect(somaPesos(obs)).toBe(10);
    expect(somaPesos(prof)).toBe(10);
  });

  it("observador: 15 critérios, Sim = peso cheio, Parcial = metade exata, Não = zero", () => {
    expect(pontuaveis(obs)).toHaveLength(15);
    expect(soma(obs, () => "Sim")).toBeCloseTo(10, 10);
    expect(soma(obs, () => "Parcial")).toBeCloseTo(5, 10);
    expect(soma(obs, () => "Não")).toBe(0);
  });

  it("professor: 11 critérios, escala de 0 a 4 em que 0 vale 0%", () => {
    const itens = pontuaveis(prof);
    expect(itens).toHaveLength(11);
    expect(itens.every((f) => f.type === "scale" && f.scale_max === 4)).toBe(true);
    expect(soma(prof, () => 4)).toBeCloseTo(10, 10);
    expect(soma(prof, () => 2)).toBeCloseTo(5, 10);
    expect(soma(prof, () => 1)).toBeCloseTo(2.5, 10);
    expect(soma(prof, () => 0)).toBe(0);
  });

  it("não há item de registro no professor (ele só vê o formulário do aluno depois)", () => {
    const rotulos = prof.map((f) => f.label.toLowerCase()).join(" | ");
    expect(rotulos).not.toMatch(/registro d[oa] (aluno|formul)/);
    expect(prof[0].description).toMatch(/registro escrito/i);
  });

  it("o retorno ao aluno-paciente não vale nota", () => {
    const fidelidade = obs.find((f) => /momento certo/.test(f.label))!;
    expect(fidelidade.max_score).toBe(0);
  });

  it("ids não se repetem e os modelos aparecem nos nativos da anamnese de Farmácia", () => {
    for (const fs of [obs, prof]) {
      const ids = fs.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    const titulos = getNativeTemplates("pharmacy", "anamnese").map((t) => t.title);
    expect(titulos).toContain("Formulário de avaliação | Observador (v2)");
    expect(titulos).toContain("Instrumento de Avaliação Docente (v2)");
    expect(titulos).toContain("Formulário de avaliação | Observador"); // o antigo continua disponível
  });

  it("cada critério mede uma coisa só: adesão, chás e barreiras são três critérios separados", () => {
    const rotulos = pontuaveis(prof).map((f) => f.label.toLowerCase());
    expect(rotulos.filter((r) => /adesão/.test(r))).toHaveLength(1);
    expect(rotulos.filter((r) => /chás/.test(r))).toHaveLength(1);
    expect(rotulos.filter((r) => /barreiras de acesso/.test(r))).toHaveLength(1);
    // nenhum critério junta adesão com chás ou barreiras
    expect(rotulos.some((r) => /adesão/.test(r) && /(chás|barreiras)/.test(r))).toBe(false);
  });

  it("os critérios que pedem julgamento trazem âncoras (o que significa cada nota)", () => {
    const comAncora = (re: RegExp) => pontuaveis(prof).find((f) => re.test(f.label))!.description || "";
    for (const re of [/adesão/i, /uso real/i, /sinais de alerta/i, /plano e as orientações/i]) {
      const d = comAncora(re);
      expect(d).toMatch(/0:/);
      expect(d).toMatch(/4:/);
    }
    const adesaoObs = pontuaveis(obs).find((f) => /adesão/i.test(f.label))!;
    expect(adesaoObs.description).toMatch(/Sim:.*Parcial:.*Não:/);
  });
});
