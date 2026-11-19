// Gerador de casos da Reconciliação v2. Só o professor (usuário autenticado) chama.
// Duas ações:
//  - "gerar": devolve { caso, prescricao, gabarito } em campos estruturados (nada de texto corrido). O front valida e o professor revisa.
//  - "derivar": monta o mesmo caso a partir de um PACIENTE VIRTUAL v2 do professor (a mesma pessoa, os mesmos medicamentos); guarda origem_vp_id.
//  - "revisar": recebe o caso completo e lista contradições entre as fontes que NÃO foram propositais e discrepâncias do gabarito
//    que o aluno não conseguiria descobrir nas fontes citadas.
// Só Gemini (ver _shared/ai-caller.ts).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAiWithFallback } from "../_shared/ai-caller.ts";
import { adminClient, getUserId, unauthorized } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SYSTEM_GERAR = `Você é professor de Farmácia Clínica e cria casos de reconciliação medicamentosa para simulação com alunos brasileiros.
O caso é um DOSSIÊ com FONTES QUE SE CONTRADIZEM, como a prática real. Você devolve SOMENTE um objeto JSON válido (sem Markdown, sem comentários) com este formato:

{
  "titulo": "título curto e específico",
  "resumo": "2 frases de contexto, sem revelar discrepâncias",
  "transicao": "admissao" | "transferencia" | "alta",
  "nivel": "iniciante" | "intermediario" | "avancado",
  "paciente": { "nome": "...", "idade": 0, "sexo": "F" | "M", "peso_kg": 0, "altura_m": 0, "creatinina_mg_dl": 0, "alergias_registradas": "o que CONSTA como alergia no prontuário (ou 'nenhuma registrada')", "motivo": "motivo da transição" },
  "fontes": [ { "id": "f1", "tipo": "relato" | "caixa" | "receita" | "retiradas" | "sumario" | "exames" | "outro", "titulo": "...", "texto": "...", "nota": "opcional, dica de leitura neutra" } ],
  "prescricao": [ { "medicamento": "DCB, só o nome, sem a dose", "dose": "concentração e dose", "via": "VO|EV|SC|...", "frequencia": "...", "observacao": "opcional" } ],
  "gabarito": {
    "discrepancias": [ { "id": "d1", "medicamento": "...", "tipo": "omissao" | "comissao" | "dose" | "duplicidade" | "interacao" | "alergia" | "ajuste_renal" | "via" | "outro", "intencionalidade": "intencional_documentada" | "intencional_sem_documentacao" | "nao_intencional", "risco": "sem_dano" | "leve" | "moderado" | "grave", "critica": true | false, "fontes": ["f2"], "descricao": "o que acontece", "acao_esperada": "o que o farmacêutico deve propor" } ],
    "bpmh": [ { "medicamento": "DCB, concentração e forma", "uso_real": "como realmente usa", "fontes": ["f1", "f2"] } ],
    "outros_problemas": [ "problema de segurança que não é discrepância, em uma frase" ],
    "prescritor": { "nome": "Dr(a). Nome Sobrenome", "perfil": "quem é e em que situação atende o telefone", "temperamento": "como reage a argumento", "resistencias": ["fala típica de resistência, uma por discrepância importante"], "criterios_para_ceder": ["o que o farmacêutico precisa dizer (dado do caso, risco e proposta) para o prescritor ceder, um por discrepância importante"] }
  }
}

REGRAS OBRIGATÓRIAS
1. O ALUNO LÊ só "paciente" e "fontes". NUNCA escreva nas fontes, no resumo ou no título as palavras "discrepância", "gabarito", "armadilha" nem a conclusão da análise. As fontes mostram fatos brutos, no tom de quem os produziu: relato leigo ("o remédio da pressão"), caixa com nomes comerciais e contagem de comprimidos, receita com abreviações, extrato de retiradas com datas, prontuário, exames.
2. As fontes devem se CONTRADIZER em pelo menos dois pontos, e a contradição deve revelar a verdade sobre o uso real (ex.: relato diz que toma, extrato mostra uma retirada em 6 meses).
3. TODA discrepância do gabarito tem de poder ser descoberta pelo aluno em pelo menos uma das fontes listadas em "fontes" dela (use os ids). Nada pode depender de informação que o dossiê não traz.
4. Pelo menos: 1 discrepância "nao_intencional", 1 de risco "grave" (com "critica": true), 1 de risco "sem_dano" ou "leve". Para "ajuste_renal", o paciente precisa de creatinina, peso e idade coerentes (a conta de Cockcroft-Gault deve sustentar o ajuste). Para "alergia", a alergia aparece em uma fonte (ex.: relato) e NÃO consta em "alergias_registradas".
5. Medicamentos, doses, apresentações e posologias devem existir no mercado brasileiro. Use DCB; use nome comercial só quando for parte da armadilha (duplicidade por nome comercial). Prefira a RENAME quando fizer sentido.
6. A "prescricao" é a prescrição do serviço na transição (admissão: prescrição do hospital; transferência: do setor que recebe; alta: prescrição de alta). Ela não explica nada: só lista. A "bpmh" do gabarito é a melhor história medicamentosa possível (o que o paciente realmente usa), incluindo uso sem receita.
7. Contexto brasileiro: UBS, farmácia popular, receita azul/amarela, caderneta, e-SUS. Português do Brasil.
8. Quantidade de itens: o número de medicamentos na BPMH e na prescrição segue o pedido. Os ids são f1, f2... e d1, d2...
9. "critica" = a discrepância pode causar dano importante se não for resolvida.
10. "prescritor" é o médico que recebe a ligação do farmacêutico (SBAR). Tem resistência plausível e crítica realista a cada discrepância importante, e cede quando o argumento traz dado do caso, risco e proposta específica. Não é vilão nem é capacho.`;

const ADENDO_DERIVAR = `

MODO DERIVAÇÃO: o caso NÃO é inventado do zero. Ele é a versão de reconciliação de um paciente que os alunos já atenderam na anamnese e no SOAP. Você recebe o NÚCLEO CLÍNICO desse paciente (identidade, fatos, medicamentos com "prescrito" e "uso_real", exames, achados) e o gabarito farmacêutico dele.
- "paciente": use EXATAMENTE a identidade do núcleo (nome, idade, sexo, peso, altura). Creatinina só se constar nos exames; senão omita. "alergias_registradas": o que o prontuário registra, que pode ser menos do que o paciente tem.
- BPMH do gabarito: os medicamentos do núcleo com o "uso_real" verdadeiro. Não invente medicamento que não esteja no núcleo, a não ser a prescrição do serviço (regra 6) quando a transição exigir itens novos.
- A diferença entre "prescrito" e "uso_real" do núcleo é a matéria-prima das discrepâncias. As fontes (relato, caixa, receita, retiradas, sumário, exames) devem MOSTRAR esses fatos brutos, sem entregar a conclusão.
- Não copie falas do paciente virtual: reescreva como documentos e registros do mundo real.
- Todas as regras obrigatórias acima continuam valendo.`;

const SYSTEM_REVISAR = `Você revisa um caso de reconciliação medicamentosa (dossiê, prescrição e gabarito) antes de ele ser usado com alunos.
Devolva SOMENTE um objeto JSON: { "problemas": [ { "tipo": "contradicao_involuntaria" | "nao_descobrivel" | "dado_implausivel" | "vazamento", "onde": "fonte ou discrepância", "texto": "uma frase" } ] }
- "contradicao_involuntaria": duas fontes se contradizem sem que o gabarito use isso como discrepância ou como pista (erro do autor).
- "nao_descobrivel": uma discrepância do gabarito que o aluno não consegue descobrir nas fontes citadas por ela.
- "dado_implausivel": dose, apresentação, posologia, exame ou conta (ex.: Cockcroft-Gault) que não existe ou não fecha.
- "vazamento": uma fonte ou o resumo entrega a resposta (diz o que está errado em vez de mostrar o fato).
Liste só problemas reais, no máximo 10. Se o caso estiver bom, devolva { "problemas": [] }.`;

function extrairJson(texto: string): any {
  let c = texto || "";
  const m = c.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) c = m[1];
  const ini = c.indexOf("{");
  const fim = c.lastIndexOf("}");
  if (ini < 0 || fim < 0) throw new Error("A IA não devolveu um JSON.");
  return JSON.parse(c.slice(ini, fim + 1));
}

async function chamarIa(userId: string, system: string, user: string, temperature: number, tipo: string) {
  let response: Response | null = null;
  for (let tentativa = 0; tentativa <= 3; tentativa++) {
    ({ response } = await callAiWithFallback(
      { model: "google/gemini-2.5-pro", temperature, messages: [{ role: "system", content: system }, { role: "user", content: user }] },
      { userId, promptType: tipo },
    ));
    if (response.status !== 429 || tentativa === 3) break;
    const retryAfter = Number(response.headers.get("Retry-After"));
    await new Promise((r) => setTimeout(r, (retryAfter > 0 ? Math.min(retryAfter, 40) : 8 * 2 ** tentativa) * 1000));
  }
  if (!response || !response.ok) throw new Error(`IA indisponível (${response?.status})`);
  const ai = await response.json();
  return extrairJson(ai.choices?.[0]?.message?.content || "");
}

const lista = (v: unknown) => (Array.isArray(v) ? v : []);
const txt = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Garante a forma do que o front espera, sem inventar conteúdo. */
function normalizar(raw: any, transicao: string, nivel: string, origemVpId?: string) {
  const p = raw?.paciente || {};
  const caso = {
    versao: 2,
    ...(origemVpId ? { origem_vp_id: origemVpId } : {}),
    titulo: txt(raw?.titulo),
    resumo: txt(raw?.resumo),
    transicao: ["admissao", "transferencia", "alta"].includes(raw?.transicao) ? raw.transicao : transicao,
    nivel: ["iniciante", "intermediario", "avancado"].includes(raw?.nivel) ? raw.nivel : nivel,
    paciente: {
      nome: txt(p.nome), idade: num(p.idade), sexo: p.sexo === "M" ? "M" : "F", peso_kg: num(p.peso_kg),
      ...(num(p.altura_m) > 0 ? { altura_m: num(p.altura_m) } : {}),
      ...(num(p.creatinina_mg_dl) > 0 ? { creatinina_mg_dl: num(p.creatinina_mg_dl) } : {}),
      alergias_registradas: txt(p.alergias_registradas), motivo: txt(p.motivo),
    },
    fontes: lista(raw?.fontes).map((f: any, i: number) => ({
      id: txt(f?.id) || `f${i + 1}`,
      tipo: ["relato", "caixa", "receita", "retiradas", "sumario", "exames", "outro"].includes(f?.tipo) ? f.tipo : "outro",
      titulo: txt(f?.titulo), texto: txt(f?.texto), ...(txt(f?.nota) ? { nota: txt(f.nota) } : {}),
    })),
  };
  const prescricao = lista(raw?.prescricao).map((m: any) => ({
    medicamento: txt(m?.medicamento), dose: txt(m?.dose), via: txt(m?.via), frequencia: txt(m?.frequencia),
    ...(txt(m?.observacao) ? { observacao: txt(m.observacao) } : {}),
  }));
  const g = raw?.gabarito || {};
  const gabarito = {
    discrepancias: lista(g.discrepancias).map((d: any, i: number) => ({
      id: txt(d?.id) || `d${i + 1}`,
      medicamento: txt(d?.medicamento),
      tipo: ["omissao", "comissao", "dose", "duplicidade", "interacao", "alergia", "ajuste_renal", "via", "outro"].includes(d?.tipo) ? d.tipo : "outro",
      intencionalidade: ["intencional_documentada", "intencional_sem_documentacao", "nao_intencional"].includes(d?.intencionalidade) ? d.intencionalidade : "nao_intencional",
      risco: ["sem_dano", "leve", "moderado", "grave"].includes(d?.risco) ? d.risco : "leve",
      critica: d?.critica === true,
      fontes: lista(d?.fontes).map(txt).filter(Boolean),
      descricao: txt(d?.descricao), acao_esperada: txt(d?.acao_esperada),
    })),
    bpmh: lista(g.bpmh).map((b: any) => ({ medicamento: txt(b?.medicamento), uso_real: txt(b?.uso_real), fontes: lista(b?.fontes).map(txt).filter(Boolean) })),
    outros_problemas: lista(g.outros_problemas).map(txt).filter(Boolean),
    prescritor: {
      nome: txt(g.prescritor?.nome), perfil: txt(g.prescritor?.perfil), temperamento: txt(g.prescritor?.temperamento),
      resistencias: lista(g.prescritor?.resistencias).map(txt).filter(Boolean),
      criterios_para_ceder: lista(g.prescritor?.criterios_para_ceder).map(txt).filter(Boolean),
    },
  };
  return { caso, prescricao, gabarito };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return unauthorized(corsHeaders);
    const body = await req.json();

    if (body.action === "derivar") {
      const vpId = txt(body.vp_id);
      if (!vpId) return json({ error: "Escolha um paciente virtual." }, 400);
      const db = adminClient();
      const { data: vp } = await db.from("custom_virtual_patients").select("id, name, user_id, case_data, schema_version").eq("id", vpId).maybeSingle();
      if (!vp || vp.user_id !== userId) return json({ error: "Paciente virtual não encontrado." }, 404);
      const cd: any = vp.case_data;
      if (!cd?.nucleo || cd.schema_version !== 2) return json({ error: "Este paciente virtual não é da versão 2 (sem núcleo clínico)." }, 400);
      const farm = cd.versoes?.farmaceutico;
      const persona = (farm?.encontros || []).find((e: any) => e?.tipo === "discussao_prescritor" && e?.persona_interlocutor)?.persona_interlocutor;

      const transicao = ["admissao", "transferencia", "alta"].includes(body.transicao) ? body.transicao : "admissao";
      const nivel = ["iniciante", "intermediario", "avancado"].includes(body.nivel) ? body.nivel : "intermediario";
      const tema = txt(body.tema).slice(0, 300);
      const nuc = cd.nucleo;
      const entrada = [
        `Tipo de transição: ${transicao}. Nível: ${nivel}.`,
        tema ? `Cenário pedido pelo professor: ${tema}.` : "",
        `
[NÚCLEO CLÍNICO DO PACIENTE VIRTUAL]
${JSON.stringify({ identidade: nuc.identidade, fatos: nuc.fatos, medicamentos: nuc.medicamentos, achados: nuc.achados, exames: nuc.exames }).slice(0, 30000)}`,
        farm?.gabarito ? `
[GABARITO FARMACÊUTICO DO PACIENTE VIRTUAL]
${JSON.stringify({ problemas_esperados: farm.gabarito.problemas_esperados, penalidades_criticas: farm.gabarito.penalidades_criticas }).slice(0, 8000)}` : "",
      ].filter(Boolean).join("\n");

      const raw = await chamarIa(userId, SYSTEM_GERAR + ADENDO_DERIVAR, entrada, 0.5, "derive-recon-v2-case");
      const r = normalizar(raw, transicao, nivel, vp.id);
      // A persona do prescritor já escrita no paciente virtual (encontro 2) vale mais que a gerada agora.
      if (persona?.nome) {
        r.gabarito.prescritor = {
          nome: txt(persona.nome), perfil: txt(persona.perfil), temperamento: txt(persona.temperamento),
          resistencias: lista(persona.resistencias).map(txt).filter(Boolean),
          criterios_para_ceder: lista(persona.criterios_para_ceder).map(txt).filter(Boolean),
        };
      }
      return json({ ...r, persona_do_paciente: !!persona?.nome });
    }

    if (body.action === "revisar") {
      if (!body.caso || !body.prescricao || !body.gabarito) return json({ error: "Caso incompleto" }, 400);
      const entrada = JSON.stringify({ caso: body.caso, prescricao: body.prescricao, gabarito: body.gabarito }).slice(0, 60000);
      const r = await chamarIa(userId, SYSTEM_REVISAR, entrada, 0.1, "recon-v2-revisar");
      const problemas = lista(r?.problemas).slice(0, 10).map((p: any) => ({ tipo: txt(p?.tipo), onde: txt(p?.onde), texto: txt(p?.texto) })).filter((p: any) => p.texto);
      return json({ problemas });
    }

    const transicao = ["admissao", "transferencia", "alta"].includes(body.transicao) ? body.transicao : "admissao";
    const nivel = ["iniciante", "intermediario", "avancado"].includes(body.nivel) ? body.nivel : "intermediario";
    const tema = txt(body.tema).slice(0, 300);
    const armadilhas = lista(body.armadilhas).map(txt).filter(Boolean).slice(0, 10);
    const nMeds = Math.min(12, Math.max(3, Math.round(num(body.n_medicamentos) || 6)));

    const pedido = [
      `Tipo de transição: ${transicao}.`,
      `Nível: ${nivel} (iniciante: 2 a 3 discrepâncias claras; intermediário: 4 a 5, com fontes que se contradizem; avançado: 6 ou mais, com alergia, função renal e alta vigilância juntas).`,
      `Número aproximado de medicamentos na BPMH e na prescrição: ${nMeds}.`,
      tema ? `Tema ou cenário pedido: ${tema}.` : "Escolha um cenário clínico realista e comum.",
      armadilhas.length ? `Armadilhas que o professor quer trabalhar (use todas): ${armadilhas.join("; ")}.` : "Escolha as armadilhas que fizerem sentido para o nível.",
    ].join("\n");

    const raw = await chamarIa(userId, SYSTEM_GERAR, pedido, 0.7, "generate-recon-v2-case");
    return json(normalizar(raw, transicao, nivel));
  } catch (e) {
    console.error("generate-recon-v2-case error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
