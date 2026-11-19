// Módulos de saúde (Enfermagem, Nutrição, Odontologia, Medicina, Fisioterapia, Biomedicina), lado do ALUNO.
// Os seis módulos têm as mesmas tabelas (<modulo>_rooms, _participants, _forms, _clinical_cases, _responses) e a mesma tela,
// então uma função só atende todos; o módulo vem no pedido e é validado contra uma lista fixa.
// Ações:
//  - "entrar": devolve a sala (campos públicos), o participante, o parceiro, o formulário padrão, o caso da dupla e se já foi enviado.
//  - "enviar": grava a resposta da dupla e marca a dupla como concluída.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MODULOS = ["nursing", "nutrition", "dentistry", "medicine", "physiotherapy", "biomedicine"];

// Casos podem trazer a seção de uso exclusivo do professor. O aluno nunca a recebe.
const TEACHER_SECTION = /(^|\n)\s*DISCREP[ÂA]NCIAS PARA IDENTIFICA[ÇC][ÃA]O[\s\S]*$/i;
const semSecaoDoProfessor = (c: unknown) => (typeof c === "string" ? c : "").replace(TEACHER_SECTION, "").trim();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { modulo, action, access_code, email, answers } = await req.json();
    if (!MODULOS.includes(modulo)) return json({ error: "Módulo inválido" }, 400);
    if (!["entrar", "enviar"].includes(action)) return json({ error: "Ação inválida" }, 400);
    if (typeof access_code !== "string" || access_code.trim().length < 4 || typeof email !== "string" || !email.trim()) return json({ error: "Dados incompletos" }, 400);

    const t = (sufixo: string) => `${modulo}_${sufixo}`;
    const db = adminClient();
    const { data: salas } = await db.from(t("rooms")).select("*")
      .eq("access_code", access_code.trim().toLowerCase()).eq("status", "active").limit(1);
    const sala = salas?.[0];
    if (!sala) return json({ ok: false, motivo: "sala" });

    const { data: todos } = await db.from(t("participants"))
      .select("id, student_name, student_email, pair_index, pair_position, status").eq("room_id", sala.id);
    const alvo = email.trim().toLowerCase();
    const eu = (todos || []).find((p: any) => (p.student_email || "").trim().toLowerCase() === alvo);
    if (!eu) return json({ ok: false, motivo: "email" });

    const { data: forms } = await db.from(t("forms")).select("id, form_type, title, content_json").eq("room_id", sala.id);
    const padrao = (forms || []).find((f: any) => f.form_type === "standard") || null;
    const { data: casos } = await db.from(t("clinical_cases")).select("id, title, content")
      .eq("room_id", sala.id).order("position", { ascending: true });
    const caso = casos?.length && eu.pair_index >= 0 ? casos[eu.pair_index % casos.length] : null;

    const { data: resps } = await db.from(t("responses")).select("id, form_id, submitted_at")
      .eq("room_id", sala.id).eq("pair_index", eu.pair_index);
    const enviada = !!resps?.some((r: any) => r.submitted_at);

    if (action === "entrar") {
      if (eu.status !== "done") await db.from(t("participants")).update({ status: "ready" }).eq("id", eu.id);
      let parceiro: { student_name: string } | null = null;
      if (eu.pair_index >= 0 && eu.pair_position !== "S") {
        const p = (todos || []).find((x: any) => x.id !== eu.id && x.pair_index === eu.pair_index);
        if (p) parceiro = { student_name: p.student_name };
      }
      return json({
        ok: true,
        sala: { id: sala.id, access_code: sala.access_code, title: sala.title, module_type: sala.module_type },
        participante: { id: eu.id, student_name: eu.student_name, student_email: eu.student_email, pair_index: eu.pair_index, pair_position: eu.pair_position, status: eu.status },
        parceiro, formulario: padrao,
        caso: caso ? { id: caso.id, title: caso.title, content: semSecaoDoProfessor(caso.content) } : null,
        enviada,
      });
    }

    // enviar
    if (eu.pair_index < 0) return json({ error: "Você ainda não está em uma dupla. Avise o professor." }, 409);
    if (!padrao) return json({ error: "A sala não tem formulário." }, 409);
    if (enviada) return json({ error: "A resposta desta dupla já foi enviada." }, 409);
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) return json({ error: "Respostas inválidas" }, 400);
    if (JSON.stringify(answers).length > 500_000) return json({ error: "Resposta grande demais" }, 413);

    const linha = { answers_json: answers, submitted_at: new Date().toISOString(), form_id: padrao.id, clinical_case_id: caso?.id || null };
    const existente = resps?.find((r: any) => r.form_id === padrao.id);
    const { error } = existente
      ? await db.from(t("responses")).update(linha).eq("id", existente.id)
      : await db.from(t("responses")).insert({ room_id: sala.id, pair_index: eu.pair_index, ...linha });
    if (error) return json({ error: error.message }, 500);
    await db.from(t("participants")).update({ status: "done" }).eq("room_id", sala.id).eq("pair_index", eu.pair_index);
    return json({ ok: true });
  } catch (e) {
    console.error("area-aluno error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
