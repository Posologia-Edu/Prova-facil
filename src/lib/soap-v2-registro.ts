import { supabase } from "@/integrations/supabase/client";
import type { FormField } from "@/components/forms/types";

export type RegistroAnamnese = {
  fields: FormField[];
  answers: Record<string, any>;
  roomId: string;
  submittedAt: string | null;
};

/**
 * Registro (formulário de anamnese preenchido) do aluno, pelo vínculo explícito com o participante da anamnese.
 * Diferente da busca do SOAP v1, NÃO varre outras salas por e-mail ou nome: sem vínculo, devolve null e a tela avisa.
 * Se o aluno enviou mais de um registro (reposição, outro ciclo), vale o último enviado.
 */
export async function carregarRegistroAnamnese(anamnesisParticipantId: string | null | undefined): Promise<RegistroAnamnese | null> {
  if (!anamnesisParticipantId) return null;
  const { data: part } = await supabase
    .from("simulation_participants")
    .select("id, room_id")
    .eq("id", anamnesisParticipantId)
    .maybeSingle();
  if (!part?.room_id) return null;

  const { data: forms } = await supabase
    .from("simulation_forms")
    .select("id, form_type, content_json")
    .eq("room_id", part.room_id)
    .in("form_type", ["anamnesis", "standard"]);
  if (!forms?.length) return null;

  const { data: resps } = await (supabase.from("simulation_responses") as any)
    .select("form_id, answers_json, submitted_at")
    .eq("participant_id", anamnesisParticipantId)
    .in("form_id", forms.map((f: any) => f.id))
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(1);
  const resp = resps?.[0];
  if (!resp?.answers_json) return null;

  const form = forms.find((f: any) => f.id === resp.form_id);
  if (!form) return null;
  const answers: Record<string, any> = {};
  for (const [k, v] of Object.entries(resp.answers_json as Record<string, any>)) {
    if (!k.startsWith("_")) answers[k] = v; // _feedback, _avaliacao_registro etc. não fazem parte do registro
  }
  return {
    fields: Array.isArray(form.content_json) ? (form.content_json as unknown as FormField[]) : [],
    answers,
    roomId: part.room_id,
    submittedAt: resp.submitted_at ?? null,
  };
}
