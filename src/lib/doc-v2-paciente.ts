// Paciente virtual de aconselhamento da Documentação v2 (sem rede): persona, checklist do observador e medida de compreensão.
// A persona (barreiras escondidas e mensagens-chave) fica na tabela PRIVADA documentation_v2_privado.gabarito.paciente_virtual.
// O aluno só recebe as falas do paciente; a conversa e a medida de compreensão ficam em documentation_v2_paciente (privada).

export const MAX_TURNOS_PACIENTE = 12;

export type Letramento = "baixo" | "medio" | "alto";
export const ROTULO_LETRAMENTO: Record<Letramento, string> = { baixo: "Baixo", medio: "Médio", alto: "Alto" };

/** Algo que atrapalha o uso correto e que o paciente só conta se o farmacêutico perguntar bem. */
export type Barreira = { id: string; descricao: string; como_revela: string };
/** O que o paciente precisa ter entendido ao fim da conversa. */
export type MensagemChave = { id: string; texto: string };

export type PersonaPaciente = {
  perfil: string;
  letramento: Letramento;
  barreiras: Barreira[];
  mensagens_chave: MensagemChave[];
};

export const personaEmBranco = (): PersonaPaciente => ({ perfil: "", letramento: "medio", barreiras: [], mensagens_chave: [] });

/** Avisos do editor do professor sobre a persona. */
export function validarPersona(p: PersonaPaciente | null | undefined): { nivel: "erro" | "aviso"; texto: string }[] {
  const out: { nivel: "erro" | "aviso"; texto: string }[] = [];
  if (!p) return [{ nivel: "erro", texto: "O caso não tem persona do paciente." }];
  if (!p.perfil?.trim()) out.push({ nivel: "erro", texto: "Falta o perfil do paciente (como fala, o que valoriza, o que teme)." });
  if ((p.barreiras || []).length < 2) out.push({ nivel: "erro", texto: "Cadastre ao menos 2 barreiras escondidas." });
  if ((p.mensagens_chave || []).length < 3) out.push({ nivel: "erro", texto: "Cadastre ao menos 3 mensagens-chave." });
  const ids = new Set<string>();
  for (const b of p.barreiras || []) {
    if (!b.id || ids.has(b.id)) out.push({ nivel: "erro", texto: `Barreira com id repetido ou em branco (${b.descricao || "sem texto"}).` });
    ids.add(b.id);
    if (!b.descricao?.trim() || !b.como_revela?.trim()) out.push({ nivel: "erro", texto: `A barreira ${b.id || "?"} precisa de descrição e de como o paciente a revela.` });
  }
  const mids = new Set<string>();
  for (const m of p.mensagens_chave || []) {
    if (!m.id || mids.has(m.id)) out.push({ nivel: "erro", texto: `Mensagem-chave com id repetido ou em branco (${m.texto || "sem texto"}).` });
    mids.add(m.id);
    if (!m.texto?.trim()) out.push({ nivel: "erro", texto: `A mensagem-chave ${m.id || "?"} está sem texto.` });
  }
  if ((p.mensagens_chave || []).length > 8) out.push({ nivel: "aviso", texto: "Mais de 8 mensagens-chave é muito para 12 mensagens de conversa." });
  return out;
}

export type EstadoMensagem = "correto" | "parcial" | "errado";
/** Julgamento do paciente virtual sobre cada mensagem-chave, acumulado ao longo da conversa. */
export type Entendimento = { id: string; abordada: boolean; entendida: EstadoMensagem | null };

/** Atualiza o acumulado: "abordada" nunca volta atrás; "entendida" vale a última evidência de teach-back. */
export function acumularEntendimento(anterior: Entendimento[], novo: Entendimento[], ids: string[]): Entendimento[] {
  const a = new Map(anterior.map((x) => [x.id, x]));
  const n = new Map(novo.map((x) => [x.id, x]));
  return ids.map((id) => {
    const ant = a.get(id) || { id, abordada: false, entendida: null };
    const nv = n.get(id);
    if (!nv) return ant;
    return { id, abordada: ant.abordada || nv.abordada === true, entendida: nv.entendida ?? ant.entendida };
  });
}

/** Resumo objetivo para a correção: quantas mensagens-chave foram abordadas e entendidas, e quantas barreiras apareceram. */
export function resumoCompreensao(entendimento: Entendimento[], barreirasReveladas: string[], totalBarreiras: number) {
  const total = entendimento.length;
  const abordadas = entendimento.filter((e) => e.abordada).length;
  const corretas = entendimento.filter((e) => e.entendida === "correto").length;
  const parciais = entendimento.filter((e) => e.entendida === "parcial").length;
  const comTeachback = entendimento.filter((e) => e.entendida !== null).length;
  return {
    total, abordadas, corretas, parciais, comTeachback,
    barreiras: Math.min(new Set(barreirasReveladas).size, totalBarreiras), totalBarreiras,
    pontos: total > 0 ? Math.round(((corretas + 0.5 * parciais) / total) * 100) : 0,
  };
}

// ---------- checklist de quem observa ----------

export type RespostaChecklist = "sim" | "parcial" | "nao";
export const ITENS_CHECKLIST: { id: string; texto: string }[] = [
  { id: "ck-abertura", texto: "Se apresentou e abriu com pergunta aberta (como o(a) senhor(a) usa seus remédios hoje?)" },
  { id: "ck-uso-real", texto: "Perguntou como o paciente realmente toma cada medicamento, sem supor" },
  { id: "ck-barreiras", texto: "Investigou dificuldades (esquecimento, custo, efeitos, crenças, rotina)" },
  { id: "ck-linguagem", texto: "Usou linguagem simples, sem jargão" },
  { id: "ck-mudancas", texto: "Explicou o que mudou e o que deve parar de usar" },
  { id: "ck-teachback", texto: "Pediu para o paciente explicar com as próprias palavras (teach-back)" },
  { id: "ck-corrigiu", texto: "Corrigiu o que o paciente repetiu errado ou incompleto" },
  { id: "ck-fecho", texto: "Combinou retorno e disse a quem recorrer em caso de dúvida ou sinal de alerta" },
];
export type ChecklistObservador = { respostas: Record<string, RespostaChecklist>; comentario: string; enviado_em?: string };

export function checklistCompleto(c: ChecklistObservador | null | undefined): boolean {
  return !!c && ITENS_CHECKLIST.every((i) => ["sim", "parcial", "nao"].includes(c.respostas?.[i.id] as string));
}

/** Na dupla, quem conduz o aconselhamento e quem observa. Individual conduz e observa a si mesmo. */
export function papelNaDupla(pairPosition: string): "conduz" | "observa" | "ambos" {
  if (pairPosition === "S") return "ambos";
  return pairPosition === "B" ? "observa" : "conduz";
}
