// Documentos extras da Documentação v2 (fase 2), lado do PROFESSOR: gera o RASCUNHO da ocorrência que dá origem ao documento extra
// (por exemplo, a reação adversa) a partir do caso e da conciliação. A IA só propõe; o professor revisa e salva na tela da sala.
// A ocorrência é o que o aluno lê; o gabarito (medicamento suspeito, respostas esperadas de Naranjo) fica no gabarito privado do caso.
// Ação: "gerar_ocorrencia" ({ case_id, extra }), com extra "ram" (reação adversa), "incidente" (incidente de segurança), "consulta" (informação sobre medicamentos) ou "dispositivo" (orientação de dispositivo). Só o dono da sala.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAiWithFallback } from "../_shared/ai-caller.ts";
import { adminClient, forbidden, getUserId, ownsRoom, unauthorized } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);
const NARANJO_IDS = ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n9", "n10"];

const SISTEMA_RAM = `Você é um professor de Farmácia Clínica criando a OCORRÊNCIA que dará origem a uma notificação de reação adversa a medicamento (VigiMed) feita por alunos.
A partir do caso e da conciliação, escreva um episódio realista e coerente que acontece DEPOIS da transição do paciente: um sinal ou sintoma novo ligado a UM medicamento da conciliação (o suspeito), com a linha do tempo (quando o medicamento começou ou mudou e quando a reação apareceu), o que foi feito e como evoluiu. Inclua dados suficientes para o aluno responder a escala de Naranjo (houve melhora ao suspender? há causa alternativa? há evidência objetiva?), sem dar a resposta pronta.
Use apenas medicamentos que existem na conciliação. Use dados fictícios; não use o nome completo do paciente no texto da ocorrência (use "o paciente" ou "a paciente").

Devolva EXCLUSIVAMENTE JSON válido, sem markdown:
{"ocorrencia": string (4 a 7 frases, em português, escrita para o aluno ler),
 "medicamento_suspeito": string,
 "naranjo": {"n1": "sim"|"nao"|"nsei", "n2": ..., "n3": ..., "n4": ..., "n5": ..., "n6": ..., "n7": ..., "n8": ..., "n9": ..., "n10": ...} (as respostas ESPERADAS, coerentes com a ocorrência que você escreveu),
 "observacoes": string (1 a 2 frases para o professor: o que o aluno precisa perceber)}`;

const SISTEMA_INCIDENTE = `Você é um professor de Farmácia Clínica criando a OCORRÊNCIA que dará origem a uma notificação de incidente de segurança do paciente (NSP/Notivisa) feita por alunos.
A partir do caso e da conciliação, escreva um erro de medicação realista que acontece no circuito do medicamento DEPOIS da transição: em qual etapa (prescrição, transcrição, dispensação, preparo, administração ou monitorização), com qual medicamento da conciliação, quem percebeu, se foi interceptado antes de chegar ao paciente ou chegou, e o que aconteceu com o paciente. Deixe pistas de mais de um fator contribuinte (pessoa, tarefa, comunicação, ambiente, organização) sem nomear o culpado e sem dar a classificação pronta.
Use apenas medicamentos que existem na conciliação. Dados fictícios; não use o nome completo do paciente (use "o paciente" ou "a paciente").

Devolva EXCLUSIVAMENTE JSON válido, sem markdown:
{"ocorrencia": string (4 a 7 frases, em português, escrita para o aluno ler),
 "tipo_esperado": "circunstancia"|"quase_erro"|"sem_dano"|"evento_adverso",
 "dano_esperado": "nenhum"|"leve"|"moderado"|"grave"|"obito",
 "etapa": "prescricao"|"transcricao"|"dispensacao"|"preparo"|"administracao"|"monitorizacao",
 "interceptado": "sim"|"nao",
 "fatores_esperados": string[] (2 a 4 fatores contribuintes, cada um começando pela categoria),
 "observacoes": string (1 a 2 frases para o professor: o que o aluno precisa perceber)}`;

const SISTEMA_CONSULTA = `Você é um professor de Farmácia Clínica criando a OCORRÊNCIA que dará origem à resposta a uma consulta de informação sobre medicamentos feita por alunos.
A partir do caso e da conciliação, escreva a pergunta que um prescritor ou a enfermagem faz sobre UM medicamento da conciliação, com o contexto do paciente e a urgência (por exemplo: pode triturar por sonda? pode diluir e em quê? interage com outro medicamento do paciente? há problema na gestação ou na lactação? qual dose com a função renal do paciente?). A pergunta deve ter uma resposta que existe na literatura, e não deve vir com a resposta pronta.
Use apenas medicamentos que existem na conciliação. Dados fictícios; não use o nome completo do paciente.

Devolva EXCLUSIVAMENTE JSON válido, sem markdown:
{"ocorrencia": string (3 a 6 frases, em português, a pergunta como o solicitante a faz, com o contexto),
 "urgencia": "urgente"|"prioritaria"|"rotina",
 "pergunta_chave": string (a pergunta reformulada de forma objetiva),
 "resposta_esperada": string (os pontos que uma boa resposta precisa conter, em 2 a 4 frases),
 "fontes_sugeridas": string[] (2 a 4 tipos de fonte que respondem bem, por exemplo "bula e monografia do medicamento", "diretriz de ...", sem inventar referências),
 "observacoes": string (1 a 2 frases para o professor: o que o aluno precisa perceber)}`;

const SISTEMA_DISPOSITIVO = `Você é um professor de Farmácia Clínica criando a OCORRÊNCIA que dará origem a uma orientação escrita de dispositivo (para o paciente) feita por alunos.
Escolha UM dispositivo plausível para o paciente do caso: "inalador_espacador" (inalador dosimetrado com espaçador), "inalador_po" (inalador de pó seco) ou "caneta_insulina" (caneta de insulina). Se algum medicamento da conciliação já usa um desses dispositivos, use-o; senão, escolha o mais plausível para uma condição do paciente e diga, na ocorrência, que o médico está iniciando esse tratamento agora. Descreva o que o paciente já sabe, suas dificuldades (visão, destreza, memória, crenças) e um erro de técnica que ele costuma cometer, SEM dar o passo a passo pronto.
Dados fictícios; não use o nome completo do paciente.

Devolva EXCLUSIVAMENTE JSON válido, sem markdown:
{"ocorrencia": string (4 a 7 frases, em português, escrita para o aluno ler),
 "dispositivo_esperado": "inalador_espacador"|"inalador_po"|"caneta_insulina",
 "medicamento": string,
 "etapas_criticas": string[] (as etapas que não podem faltar, na ordem, cada uma em poucas palavras),
 "erros_comuns": string[] (2 a 4 erros comuns de técnica deste dispositivo),
 "observacoes": string (1 a 2 frases para o professor: o que o aluno precisa perceber)}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return unauthorized(corsHeaders);
    const { action, case_id, extra } = await req.json();
    if (action !== "gerar_ocorrencia") return json({ error: "Ação inválida" }, 400);
    if (!case_id || !["ram", "incidente", "consulta", "dispositivo"].includes(extra)) return json({ error: "Dados incompletos" }, 400);

    const db = adminClient();
    const { data: caso } = await db.from("documentation_clinical_cases").select("id, room_id, caso_json").eq("id", case_id).maybeSingle();
    if (!caso) return json({ error: "Caso não encontrado" }, 404);
    if (!(await ownsRoom("documentation_rooms", caso.room_id, userId))) return forbidden(corsHeaders);
    const cj: any = caso.caso_json;
    if (!cj) return json({ error: "O caso não tem dossiê." }, 400);
    const { data: priv } = await db.from("documentation_v2_privado").select("referencia").eq("case_id", case_id).maybeSingle();
    const ref: any[] = Array.isArray(priv?.referencia) ? priv!.referencia : [];
    if (!ref.length) return json({ error: "Cadastre a conciliação de referência do caso antes." }, 400);

    const usr = `Caso: ${cj.titulo}. ${cj.resumo}
Paciente: ${JSON.stringify(cj.paciente)}
Transição: ${cj.transicao}

Conciliação de referência (o que o paciente deve usar depois da transição):
${ref.map((m) => `- ${m.medicamento} | ${m.conduta}${m.frequencia ? ` | ${m.frequencia}` : ""}`).join("\n")}`;

    let response: Response | null = null;
    for (let t = 0; t <= 2; t++) {
      ({ response } = await callAiWithFallback(
        { model: "google/gemini-2.5-flash", temperature: 0.7, messages: [{ role: "system", content: ({ ram: SISTEMA_RAM, incidente: SISTEMA_INCIDENTE, consulta: SISTEMA_CONSULTA, dispositivo: SISTEMA_DISPOSITIVO } as Record<string, string>)[extra] }, { role: "user", content: usr }] },
        { userId, promptType: `doc-v2-extras-${extra}` },
      ));
      if (response.status !== 429 || t === 2) break;
      const ra = Number(response.headers.get("Retry-After"));
      await new Promise((r) => setTimeout(r, (ra > 0 ? Math.min(ra, 30) : 4 * 2 ** t) * 1000));
    }
    if (!response || !response.ok) return json({ error: `IA indisponível (${response?.status})` }, 502);
    const ai = await response.json();
    let conteudo: string = ai.choices?.[0]?.message?.content || "";
    const m = conteudo.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) conteudo = m[1].trim();
    let g: any;
    try { g = JSON.parse(conteudo); } catch { return json({ error: "A IA devolveu uma resposta inválida. Tente de novo." }, 502); }

    const oneOf = (v: unknown, lista: string[], padrao: string) => (lista.includes(String(v)) ? String(v) : padrao);
    const lista = (v: unknown, max: number, n: number) => (Array.isArray(v) ? v : []).slice(0, max).map((x: unknown) => clip(x, n)).filter(Boolean);

    if (extra === "consulta") {
      const oc = clip(g?.ocorrencia, 1500);
      if (!oc) return json({ error: "A IA não escreveu a ocorrência. Tente de novo." }, 502);
      return json({
        ocorrencia: oc,
        gabarito: {
          urgencia: oneOf(g?.urgencia, ["urgente", "prioritaria", "rotina"], "prioritaria"),
          pergunta_chave: clip(g?.pergunta_chave, 400),
          resposta_esperada: clip(g?.resposta_esperada, 800),
          fontes_sugeridas: lista(g?.fontes_sugeridas, 5, 200),
          observacoes: clip(g?.observacoes, 400),
        },
      });
    }

    if (extra === "dispositivo") {
      const oc = clip(g?.ocorrencia, 1500);
      if (!oc) return json({ error: "A IA não escreveu a ocorrência. Tente de novo." }, 502);
      return json({
        ocorrencia: oc,
        gabarito: {
          dispositivo_esperado: oneOf(g?.dispositivo_esperado, ["inalador_espacador", "inalador_po", "caneta_insulina"], "inalador_espacador"),
          medicamento: clip(g?.medicamento, 200),
          etapas_criticas: lista(g?.etapas_criticas, 10, 160),
          erros_comuns: lista(g?.erros_comuns, 5, 200),
          observacoes: clip(g?.observacoes, 400),
        },
      });
    }

    if (extra === "incidente") {
      const ocorrenciaInc = clip(g?.ocorrencia, 1500);
      if (!ocorrenciaInc) return json({ error: "A IA não escreveu a ocorrência. Tente de novo." }, 502);
      return json({
        ocorrencia: ocorrenciaInc,
        gabarito: {
          tipo_esperado: oneOf(g?.tipo_esperado, ["circunstancia", "quase_erro", "sem_dano", "evento_adverso"], "sem_dano"),
          dano_esperado: oneOf(g?.dano_esperado, ["nenhum", "leve", "moderado", "grave", "obito"], "nenhum"),
          etapa: oneOf(g?.etapa, ["prescricao", "transcricao", "dispensacao", "preparo", "administracao", "monitorizacao"], "administracao"),
          interceptado: oneOf(g?.interceptado, ["sim", "nao"], "nao"),
          fatores_esperados: (Array.isArray(g?.fatores_esperados) ? g.fatores_esperados : []).slice(0, 5).map((x: unknown) => clip(x, 200)).filter(Boolean),
          observacoes: clip(g?.observacoes, 400),
        },
      });
    }

    const naranjo: Record<string, string> = {};
    for (const id of NARANJO_IDS) naranjo[id] = ["sim", "nao", "nsei"].includes(g?.naranjo?.[id]) ? g.naranjo[id] : "nsei";
    const ocorrencia = clip(g?.ocorrencia, 1500);
    if (!ocorrencia) return json({ error: "A IA não escreveu a ocorrência. Tente de novo." }, 502);
    return json({ ocorrencia, gabarito: { medicamento_suspeito: clip(g?.medicamento_suspeito, 200), naranjo, observacoes: clip(g?.observacoes, 400) } });
  } catch (e) {
    console.error("doc-v2-extras error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
