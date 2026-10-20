import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface VpCaseRecord {
  id: string;
  slug: string | null;
  name: string;
  age: number;
  profession: string;
  category: string;
  description: string;
  system_prompt: string;
  baseline_vitals: Record<string, unknown>;
  baseline_context: string;
  clinical_case: Record<string, unknown>;
  case_data: Record<string, unknown> | null;
  is_legacy: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Cadastro único de casos (tabela custom_virtual_patients).
 * Aceita o slug dos casos legados ("pain_helena"), o uuid de um caso gerado e o
 * formato antigo "custom:<uuid>". Devolve null se não achar ou se o banco ainda
 * não tiver as colunas novas, para o chamador usar a cópia em código como reserva.
 */
export async function loadVpCase(patientId: string | null | undefined): Promise<VpCaseRecord | null> {
  if (!patientId) return null;
  const key = patientId.replace(/^custom:/, "");
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const query = admin
      .from("custom_virtual_patients")
      .select("id, slug, name, age, profession, category, description, system_prompt, baseline_vitals, baseline_context, clinical_case, case_data, is_legacy");
    const { data, error } = await (UUID_RE.test(key) ? query.eq("id", key) : query.eq("slug", key)).maybeSingle();
    if (error) {
      console.warn("loadVpCase:", error.message);
      return null;
    }
    return (data as VpCaseRecord | null) ?? null;
  } catch (e) {
    console.warn("loadVpCase failed:", (e as Error).message);
    return null;
  }
}
