import type { VersaoKey, VpCaseData } from "@/lib/vp-case-schema";

/**
 * Quanto de uma versão por profissão já está pronto, usando as mesmas exigências de `validateCaseData`.
 * Serve só de indicador nas abas: quem decide se o caso pode ser publicado continua sendo a validação.
 */
export function versaoProgress(d: VpCaseData, key: VersaoKey): { done: number; total: number } {
  const v = d.versoes[key];
  if (!v) return { done: 0, total: 0 };
  const fatoIds = (d.nucleo.fatos || []).map((f) => f.id);
  const achadoIds = (d.nucleo.achados || []).map((a) => a.id);
  const revIds = (v.revelacao || []).map((r) => r.id);
  const g = v.gabarito;
  const enc = v.encontros || [];
  const checks = [
    !!v.cenario?.abertura && !!v.cenario?.motivo_da_vinda,
    fatoIds.length > 0 && fatoIds.every((id) => revIds.includes(id)) && revIds.every((id) => fatoIds.includes(id)),
    (v.gatilhos_achados || []).every((x) => achadoIds.includes(x.achado)),
    enc.length === 3,
    enc.length > 0 && enc.every((e) => !!e.cartao?.cenario && !!e.cartao?.tarefa),
    enc.every((e) => !((e.interlocutor === "prescritor" || e.interlocutor === "equipe") && !e.persona_interlocutor)),
    !!g?.problemas_esperados?.length,
    !!g?.informacoes_alvo?.length && g.informacoes_alvo.every((i) => fatoIds.includes(i.id_informacao)),
    !!g?.conduta_esperada?.length,
  ];
  return { done: checks.filter(Boolean).length, total: checks.length };
}
