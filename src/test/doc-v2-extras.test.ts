import { describe, expect, it } from "vitest";
import { categoriaNaranjo, diasEntre, escoreNaranjo, ESQUEMAS_EXTRA, extrasValidos, NARANJO_PERGUNTAS, termosAcusatoriosEncontrados } from "@/lib/doc-v2-extras";
import { normalizarRespostas, resumoDocumentos, respostasEmBranco, verificarTudo } from "@/lib/doc-v2";
import { criteriosAplicaveis, notaRubricaDoc, todosCriterios } from "@/lib/doc-v2-rubrica";
import { itensRevisao, notaRevisao } from "@/lib/doc-v2-nota";

const respostasNar = (v: Record<string, string>) => Object.fromEntries(NARANJO_PERGUNTAS.map((q) => [q.id, v[q.id] ?? "nsei"]));
const ramCompleta = () => ({
  iniciais: "M.S.", idade: "76", sexo: "F", descricao: "Tosse seca persistente", inicio_reacao: "2026-11-10", desfecho: "recuperando", gravidade: "nao_grave",
  suspeitos: [{ medicamento: "Enalapril 10 mg", dose: "10 mg VO", inicio: "2026-11-01", fim: "", indicacao: "HAS" }],
  acao_medicamento: "suspenso", naranjo: respostasNar({ n2: "sim", n3: "sim", n5: "nao" }), nar_escore: "5", nar_categoria: "provavel",
  notificador: "A. Aluno, farmacêutico(a)", data_notificacao: "2026-11-12",
});

describe("Naranjo", () => {
  it("tem 10 perguntas e soma os pontos conforme a tabela", () => {
    expect(NARANJO_PERGUNTAS.length).toBe(10);
    expect(escoreNaranjo(respostasNar({ n2: "sim", n3: "sim", n5: "nao" }))).toEqual({ escore: 5, respondidas: 10 });
    // máximo: tudo "sim" que soma, "não" onde inverte (n5 e n6)
    const maximo = respostasNar({ n1: "sim", n2: "sim", n3: "sim", n4: "sim", n5: "nao", n6: "nao", n7: "sim", n8: "sim", n9: "sim", n10: "sim" });
    expect(escoreNaranjo(maximo).escore).toBe(13);
    // pior caso: perguntas 2 e 4 "não" (-1), 5 e 6 "sim" (-1)
    expect(escoreNaranjo(respostasNar({ n2: "nao", n4: "nao", n5: "sim", n6: "sim" })).escore).toBe(-4);
  });
  it("pergunta sem resposta não soma nem conta", () => {
    expect(escoreNaranjo({ n2: "sim" })).toEqual({ escore: 2, respondidas: 1 });
    expect(escoreNaranjo(null)).toEqual({ escore: 0, respondidas: 0 });
  });
  it("categorias nos limites", () => {
    expect([9, 13].map(categoriaNaranjo)).toEqual(["definida", "definida"]);
    expect([5, 8].map(categoriaNaranjo)).toEqual(["provavel", "provavel"]);
    expect([1, 4].map(categoriaNaranjo)).toEqual(["possivel", "possivel"]);
    expect([0, -3].map(categoriaNaranjo)).toEqual(["duvidosa", "duvidosa"]);
  });
});

describe("verificador da notificação de reação adversa", () => {
  const verificar = (r: any) => ESQUEMAS_EXTRA.ram.verificar(r).map((a) => a.id);
  it("não avisa quando está completa e coerente", () => { expect(verificar(ramCompleta())).toEqual([]); });
  it("avisa de nome completo no lugar das iniciais", () => {
    expect(verificar({ ...ramCompleta(), iniciais: "Marlene Souza" })).toContain("ram-privacidade");
    expect(verificar({ ...ramCompleta(), iniciais: "M.S.A." })).not.toContain("ram-privacidade");
  });
  it("avisa quando o uso começou depois da reação", () => {
    const r = ramCompleta(); r.suspeitos[0].inicio = "2026-11-20";
    expect(verificar(r).some((i) => i.startsWith("ram-temporal"))).toBe(true);
  });
  it("avisa quando o escore informado não bate ou a categoria não corresponde", () => {
    expect(verificar({ ...ramCompleta(), nar_escore: "9" })).toContain("ram-naranjo-categoria-incoerente");
    expect(verificar({ ...ramCompleta(), nar_escore: "7", nar_categoria: "provavel" })).toContain("ram-naranjo-soma");
  });
  it("avisa de Naranjo incompleto", () => {
    expect(verificar({ ...ramCompleta(), naranjo: { n1: "sim" } })).toContain("ram-naranjo-incompleto");
  });
  it("em branco acusa os campos essenciais", () => {
    const ids = verificar({});
    for (const i of ["ram-iniciais", "ram-descricao", "ram-suspeito", "ram-notificador"]) expect(ids).toContain(i);
  });
});

describe("integração com o núcleo", () => {
  it("sem extras, nada muda: o formulário em branco continua sem avisos de extra", () => {
    expect(verificarTudo(respostasEmBranco(), []).some((a) => a.documento.startsWith("extra:"))).toBe(false);
    expect(verificarTudo(respostasEmBranco(), [], ["ram"]).some((a) => a.documento === "extra:ram")).toBe(true);
  });
  it("normalizar aceita rascunho antigo sem extras e descarta extras inválidos", () => {
    expect(normalizarRespostas({ plano: { metas: "x" } }).extras).toEqual({});
    expect(normalizarRespostas({ extras: { ram: { iniciais: "A.B." }, lixo: "texto", lista: [] } }).extras).toEqual({ ram: { iniciais: "A.B." } });
  });
  it("o resumo do professor inclui o documento extra", () => {
    const r = normalizarRespostas({ extras: { ram: ramCompleta() } });
    expect(resumoDocumentos(r, ["ram"])).toContain("NOTIFICAÇÃO DE REAÇÃO ADVERSA");
    expect(resumoDocumentos(r)).not.toContain("NOTIFICAÇÃO DE REAÇÃO ADVERSA");
  });
  it("extra ativo acrescenta um critério (peso 1) e um item de revisão; a nota continua de 0 a 10", () => {
    expect(criteriosAplicaveis(false, ["ram"]).length).toBe(criteriosAplicaveis(false).length + 1);
    expect(todosCriterios().some((c) => c.id === "dx-ram")).toBe(true);
    const tudo4 = Object.fromEntries(criteriosAplicaveis(true, ["ram"]).map((c) => [c.id, 4]));
    expect(notaRubricaDoc(tudo4, true, ["ram"])).toBe(10);
    // sem nota no critério extra, ele não pesa
    const semExtra = Object.fromEntries(criteriosAplicaveis(true).map((c) => [c.id, 4]));
    expect(notaRubricaDoc(semExtra, true, ["ram"])).toBe(10);
    expect(itensRevisao(["ram"]).length).toBe(itensRevisao().length + 1);
  });
  it("revisão com extra exige o item extra", () => {
    const base = Object.fromEntries(itensRevisao().map((i) => [i.id, "sim"]));
    expect(notaRevisao(base)).toBe(10);
    expect(notaRevisao(base, ["ram"])).toBeNull();
    expect(notaRevisao({ ...base, "rv-ram": "parcial" }, ["ram"])).toBeCloseTo((8.5 / 9) * 10, 1);
  });
  it("extrasValidos ignora ids desconhecidos", () => {
    expect(extrasValidos(["ram", "futuro", 3])).toEqual(["ram"]);
    expect(extrasValidos(null)).toEqual([]);
  });
});

describe("verificador da notificação de incidente", () => {
  const completa = () => ({
    iniciais: "J.P.", data_incidente: "2026-11-10", local: "Enfermaria B", descricao: "A dose de heparina foi preparada com o frasco errado e a técnica percebeu antes de administrar.",
    medicamento: "Heparina 5000 UI/mL, SC", etapa: "preparo", interceptado: "sim", tipo: "quase_erro", dano: "nenhum",
    fatores: [{ categoria: "organização", descricao: "Frascos com rótulos parecidos lado a lado" }, { categoria: "tarefa", descricao: "Preparo feito sem dupla checagem" }],
    acao_imediata: "Frasco recolhido e o paciente monitorado.", analise: "Rótulos parecidos e ausência de checagem favoreceram a troca.", prevencao: "Separar as concentrações e exigir dupla checagem no preparo.",
    notificador: "A. Aluno, farmacêutico(a)", data_notificacao: "2026-11-11",
  });
  const verificar = (r: any) => ESQUEMAS_EXTRA.incidente.verificar(r).map((a) => a.id);

  it("não avisa quando está completa e coerente", () => { expect(verificar(completa())).toEqual([]); });
  it("avisa de tipo incoerente com o dano e com a interceptação", () => {
    expect(verificar({ ...completa(), dano: "leve" })).toContain("inc-tipo-dano");
    expect(verificar({ ...completa(), interceptado: "nao" })).toContain("inc-quase-erro-interceptado");
    expect(verificar({ ...completa(), tipo: "evento_adverso", dano: "nenhum", interceptado: "nao" })).toContain("inc-evento-sem-dano");
    expect(verificar({ ...completa(), tipo: "sem_dano", dano: "nenhum", interceptado: "sim" })).toContain("inc-chegou-interceptado");
  });
  it("exige prazo de 72 horas quando há óbito", () => {
    const base = { ...completa(), tipo: "evento_adverso", dano: "obito", interceptado: "nao" };
    expect(verificar({ ...base, data_notificacao: "2026-11-12" })).not.toContain("inc-prazo-obito");
    expect(verificar({ ...base, data_notificacao: "2026-11-20" })).toContain("inc-prazo-obito");
  });
  it("pede mais de um fator contribuinte e acusa linguagem que culpa pessoas", () => {
    expect(verificar({ ...completa(), fatores: [{ categoria: "pessoa", descricao: "Distração" }] })).toContain("inc-fatores");
    expect(verificar({ ...completa(), analise: "Houve negligência da técnica." })).toContain("inc-culpa");
    expect([...termosAcusatoriosEncontrados("Foi um descuido, culpa dele e negligência")].sort()).toEqual(["culpa", "descuido", "negligência"]);
    expect(termosAcusatoriosEncontrados("Frascos com rótulos parecidos")).toEqual([]);
  });
  it("a data da notificação não pode ser anterior à do incidente, e dias entre datas", () => {
    expect(verificar({ ...completa(), data_notificacao: "2026-11-01" })).toContain("inc-data-ordem");
    expect(diasEntre("2026-11-10", "2026-11-13")).toBe(3);
    expect(diasEntre("x", "2026-11-13")).toBeNull();
  });
  it("entra na rubrica e na revisão como extra", () => {
    expect(criteriosAplicaveis(false, ["ram", "incidente"]).length).toBe(criteriosAplicaveis(false).length + 2);
    expect(itensRevisao(["incidente"]).some((i) => i.id === "rv-incidente")).toBe(true);
    expect(extrasValidos(["incidente", "ram", "x"])).toEqual(["ram", "incidente"]);
  });
});
