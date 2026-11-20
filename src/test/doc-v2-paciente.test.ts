import { describe, expect, it } from "vitest";
import {
  acumularEntendimento, checklistCompleto, ITENS_CHECKLIST, papelNaDupla, personaEmBranco, resumoCompreensao, validarPersona,
  type PersonaPaciente,
} from "@/lib/doc-v2-paciente";

const persona = (): PersonaPaciente => ({
  perfil: "Aposentado, fala pouco, confia no médico.", letramento: "baixo",
  barreiras: [{ id: "b1", descricao: "Parte o comprimido para economizar", como_revela: "Se perguntarem como toma" }, { id: "b2", descricao: "Esquece a dose da noite", como_revela: "Se perguntarem do dia a dia" }],
  mensagens_chave: [{ id: "m1", texto: "Parar o ibuprofeno" }, { id: "m2", texto: "Losartana de manhã e à noite" }, { id: "m3", texto: "Procurar o posto se urinar pouco" }],
});

describe("validarPersona", () => {
  it("aceita uma persona completa", () => { expect(validarPersona(persona())).toEqual([]); });
  it("recusa persona em branco e ausente", () => {
    expect(validarPersona(personaEmBranco()).filter((x) => x.nivel === "erro").length).toBeGreaterThanOrEqual(3);
    expect(validarPersona(null)[0].nivel).toBe("erro");
  });
  it("acusa id repetido", () => {
    const p = persona(); p.barreiras[1].id = "b1";
    expect(validarPersona(p).some((x) => /repetido/.test(x.texto))).toBe(true);
  });
});

describe("compreensão", () => {
  const ids = ["m1", "m2", "m3"];
  it("acumula: abordada não volta atrás e a última evidência de teach-back vale", () => {
    let e = acumularEntendimento([], [{ id: "m1", abordada: true, entendida: null }], ids);
    e = acumularEntendimento(e, [{ id: "m1", abordada: false, entendida: "parcial" }, { id: "m2", abordada: true, entendida: null }], ids);
    e = acumularEntendimento(e, [{ id: "m1", abordada: true, entendida: "correto" }], ids);
    expect(e.find((x) => x.id === "m1")).toEqual({ id: "m1", abordada: true, entendida: "correto" });
    expect(e.find((x) => x.id === "m2")).toEqual({ id: "m2", abordada: true, entendida: null });
    expect(e.find((x) => x.id === "m3")).toEqual({ id: "m3", abordada: false, entendida: null });
  });
  it("resume a compreensão e as barreiras reveladas", () => {
    const r = resumoCompreensao([
      { id: "m1", abordada: true, entendida: "correto" }, { id: "m2", abordada: true, entendida: "parcial" }, { id: "m3", abordada: false, entendida: null },
    ], ["b1", "b1", "b9"], 2);
    expect(r).toMatchObject({ total: 3, abordadas: 2, corretas: 1, parciais: 1, comTeachback: 2, totalBarreiras: 2, pontos: 50 });
    expect(r.barreiras).toBe(2);
  });
});

describe("checklist e papéis", () => {
  it("só está completo com os 8 itens respondidos", () => {
    const respostas = Object.fromEntries(ITENS_CHECKLIST.map((i) => [i.id, "sim" as const]));
    expect(checklistCompleto({ respostas, comentario: "" })).toBe(true);
    delete (respostas as any)["ck-fecho"];
    expect(checklistCompleto({ respostas, comentario: "" })).toBe(false);
    expect(checklistCompleto(null)).toBe(false);
  });
  it("A conduz, B observa, individual faz os dois", () => {
    expect(papelNaDupla("A")).toBe("conduz");
    expect(papelNaDupla("B")).toBe("observa");
    expect(papelNaDupla("S")).toBe("ambos");
  });
});
