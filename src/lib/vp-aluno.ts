import { supabase } from "@/integrations/supabase/client";

/**
 * Chamada única à função vp-aluno (sala e feedback do Paciente Virtual do aluno).
 * A identidade é o PIN da sala + o e-mail, guardados na sessão do navegador quando o aluno entra pela tela de login.
 * Lança erro se a sessão do navegador expirou ou se a função falhar; devolve o corpo (que pode ter ok:false e um motivo).
 */
export async function vpAluno(cvpId: string, body: Record<string, unknown>): Promise<any> {
  let email = "";
  let pin = "";
  try {
    email = (sessionStorage.getItem("vp_email") || "").trim().toLowerCase();
    pin = (sessionStorage.getItem("vp_pin") || "").trim();
  } catch { /* sem armazenamento */ }
  if (!email || !pin) throw new Error("sessao_expirada");
  const { data, error } = await supabase.functions.invoke("vp-aluno", { body: { cvp_id: cvpId, pin, email, ...body } });
  if (error) throw new Error(error.message || "erro");
  if (data?.error) throw new Error(data.error);
  return data;
}
