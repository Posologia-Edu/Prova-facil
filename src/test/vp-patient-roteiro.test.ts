import { describe, expect, it } from "vitest";
import caso from "../../docs/exemplo-caso-marta-v2.json";
import type { VpCaseData } from "@/lib/vp-case-schema";
import { buildPatientRoteiro, isPatientRoteiro, roteiroToText } from "@/lib/vp-patient-roteiro";

const d = caso as unknown as VpCaseData;

describe("roteiro do paciente padronizado", () => {
  const r = buildPatientRoteiro(d, "farmaceutico")!;

  it("monta o roteiro da versão Farmácia", () => {
    expect(isPatientRoteiro(r)).toBe(true);
    expect(r.identidade.nome).toBe("Marta");
    expect(r.fatos.length).toBeGreaterThan(0);
    expect(r.medicamentos.length).toBe(d.nucleo.medicamentos.length);
    expect(r.abertura).toBe(d.versoes.farmaceutico!.cenario.abertura);
  });

  it("ordena os fatos do mais fácil ao mais difícil de revelar", () => {
    const ordem = ["espontanea", "pergunta_aberta", "direta", "vinculo"];
    const idx = r.fatos.map((f) => ordem.indexOf(f.nivel));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });

  it("não leva gabarito, penalidades nem a observação clínica dos medicamentos", () => {
    const json = JSON.stringify(r);
    const text = roteiroToText(r);
    const g = d.versoes.farmaceutico!.gabarito;
    for (const p of g.problemas_esperados) expect(json).not.toContain(p.justificativa);
    for (const o of g.objetivos_aprendizagem) expect(json).not.toContain(o);
    for (const m of d.nucleo.medicamentos) {
      if (m.observacao_clinica) {
        expect(json).not.toContain(m.observacao_clinica);
        expect(text).not.toContain(m.observacao_clinica);
      }
    }
    expect(json).not.toContain("gabarito");
    expect(json).not.toContain("penalidades");
  });

  it("devolve null para versão inexistente", () => {
    expect(buildPatientRoteiro(d, "medico")).toBeNull();
  });
});
