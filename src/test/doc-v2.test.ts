import { describe, expect, it } from "vitest";
import {
  contarSilabas, derivarReferencia, dosesPorDia, indiceFlesch, jargaoEncontrado, linhaCartaoVazia, normalizarRespostas, respostasEmBranco,
  verificarCartao, verificarEncaminhamento, verificarLinguagemCartao, verificarTudo,
  type Cartao, type ItemReferencia,
} from "@/lib/doc-v2";

const ref: ItemReferencia[] = [
  { medicamento: "Losartana 50 mg", conduta: "alterado" },
  { medicamento: "Ibuprofeno 600 mg", conduta: "suspenso" },
];
const cartaoOk = (): Cartao => ({
  linhas: [{ ...linhaCartaoVazia(), medicamento: "Losartana 25 mg", para_que: "Controla a pressão", como_tomar: "Com água", frequencia: "12/12 h", manha: true, noite: true, mudou: "alterado" }],
  pare: [{ medicamento: "Ibuprofeno", motivo: "Faz mal aos rins" }],
  se_esquecer: "Tome quando lembrar.", procure_atendimento: "Se urinar pouco.", onde_conseguir: "Posto de saúde.",
});

describe("dosesPorDia", () => {
  it.each([["12/12 h", 2], ["8/8h", 3], ["a cada 6 horas", 4], ["2x ao dia", 2], ["duas vezes ao dia", 2], ["1 vez ao dia", 1], ["pela manhã", 1], ["à noite", 1], ["se dor", null], ["", null]])("%s", (t, n) => {
    expect(dosesPorDia(t as string)).toBe(n);
  });
});

describe("verificarCartao", () => {
  it("não avisa quando o cartão está coerente", () => {
    expect(verificarCartao(cartaoOk(), ref).every((a) => a.nivel === "ok")).toBe(true);
  });
  it("avisa de medicamento da conciliação ausente do cartão", () => {
    const c = cartaoOk(); c.linhas = [];
    c.linhas.push({ ...linhaCartaoVazia(), medicamento: "Vitamina D", para_que: "x", como_tomar: "y", mudou: "novo", manha: true });
    expect(verificarCartao(c, ref).some((a) => a.id.startsWith("falta-losartana"))).toBe(true);
  });
  it("avisa quando o suspenso não está em 'pare de usar'", () => {
    const c = cartaoOk(); c.pare = [];
    expect(verificarCartao(c, ref).some((a) => a.id.startsWith("pare-ibuprofeno"))).toBe(true);
  });
  it("avisa quando o suspenso está na grade", () => {
    const c = cartaoOk();
    c.linhas.push({ ...linhaCartaoVazia(), medicamento: "Ibuprofeno 600 mg", para_que: "dor", como_tomar: "x", mudou: "mantido", manha: true });
    expect(verificarCartao(c, ref).some((a) => a.id.startsWith("suspenso-na-grade"))).toBe(true);
  });
  it("avisa quando frequência e grade discordam", () => {
    const c = cartaoOk(); c.linhas[0].noite = false;
    expect(verificarCartao(c, ref).some((a) => a.id === "dose-0")).toBe(true);
  });
});

describe("verificarEncaminhamento", () => {
  it("exige prazo no urgente e SBAR completo", () => {
    const e = respostasEmBranco().encaminhamento;
    e.prioridade = "urgente"; e.s = "x";
    const ids = verificarEncaminhamento(e).map((a) => a.id);
    expect(ids).toContain("prazo"); expect(ids).toContain("sbar"); expect(ids).toContain("dest");
  });
});

describe("legibilidade", () => {
  it("conta sílabas", () => {
    expect(contarSilabas("pressão")).toBe(2);
    expect(contarSilabas("remédio")).toBeGreaterThanOrEqual(2);
    expect(contarSilabas("a")).toBe(1);
  });
  it("Flesch dá nota alta para texto simples e baixa para texto técnico", () => {
    const simples = "Tome um comprimido de manhã. Tome com água. Se esquecer, tome quando lembrar. Não tome dois de uma vez. Guarde longe do sol.";
    const tecnico = "A administração concomitante de anti-inflamatórios não esteroidais contraindicada, considerando a nefrotoxicidade cumulativa decorrente da hipoperfusão renal persistente em pacientes idosos polimedicados.";
    expect(indiceFlesch(simples)!).toBeGreaterThan(indiceFlesch(tecnico)!);
    expect(indiceFlesch("curto demais")).toBeNull();
  });
  it("acha jargão sem acento ou caixa", () => {
    expect(jargaoEncontrado("Verifique a POSOLOGIA e a Adesão")).toEqual(["posologia", "adesão"]);
    expect(verificarLinguagemCartao({ ...cartaoOk(), se_esquecer: "Respeite a posologia." }).some((a) => a.id === "jargao")).toBe(true);
  });
});

describe("derivarReferencia", () => {
  it("usa a prescrição e a ação esperada de cada discrepância", () => {
    const r = derivarReferencia(
      [{ medicamento: "Losartana", dose: "50 mg", frequencia: "12/12 h" }, { medicamento: "Sinvastatina", dose: "20 mg", frequencia: "à noite" }],
      [{ medicamento: "Losartana", acao_esperada: "Suspender até melhorar a função renal" }, { medicamento: "Ibuprofeno", acao_esperada: "Parar o uso" }],
    );
    expect(r.find((x) => x.medicamento.startsWith("Losartana"))?.conduta).toBe("suspenso");
    expect(r.find((x) => x.medicamento.startsWith("Sinvastatina"))?.conduta).toBe("mantido");
    expect(r.find((x) => x.medicamento === "Ibuprofeno")?.conduta).toBe("suspenso");
  });
});

describe("normalizarRespostas", () => {
  it("aceita rascunho vazio, antigo ou parcial", () => {
    expect(normalizarRespostas(null).cartao.linhas.length).toBe(1);
    const r = normalizarRespostas({ cartao: { linhas: [{ medicamento: "X" }] }, plano: { metas: "m" } });
    expect(r.cartao.linhas[0].manha).toBe(false);
    expect(r.cartao.linhas[0].medicamento).toBe("X");
    expect(r.plano.retorno).toBe("");
    expect(r.encaminhamento.problemas.length).toBe(1);
  });
  it("verificarTudo roda sobre o formulário em branco sem quebrar", () => {
    expect(verificarTudo(respostasEmBranco(), ref).length).toBeGreaterThan(0);
  });
});
