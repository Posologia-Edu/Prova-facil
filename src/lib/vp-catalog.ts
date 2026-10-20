import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VP_CLINICAL_CASES, type VPClinicalCase } from "@/lib/vp-clinical-cases";

// Catálogo único de casos de Pacientes Virtuais para o docente.
// Fonte: tabela custom_virtual_patients (casos legados + gerados pelo docente).
// Enquanto a migração não estiver aplicada, ou se a consulta falhar, os 10 casos
// legados continuam disponíveis pela cópia em código abaixo.

export interface VpCatalogEntry {
  /** slug dos casos legados ("pain_helena") ou uuid dos casos gerados; é o que vai em class_virtual_patients.patient_id */
  id: string;
  name: string;
  age: number;
  /** categoria exibida (ex.: "Dor", "Inflamação") */
  module: string;
  desc: string;
  isLegacy: boolean;
  /** "Dona Helena, 67 anos" */
  label: string;
  clinicalCase?: VPClinicalCase;
}

const label = (name: string, age: number) => `${name}, ${age} anos`;

const STATIC_LEGACY: Array<{ id: string; name: string; age: number; module: string; desc: string }> = [
  { id: "pain_helena", name: "Dona Helena", age: 67, module: "Dor", desc: "Dor neuropática pós-herpética" },
  { id: "pain_luciana", name: "Luciana", age: 42, module: "Dor", desc: "Fibromialgia" },
  { id: "pain_rogerio", name: "Rogério", age: 58, module: "Dor", desc: "Lombalgia crônica" },
  { id: "pain_pedro", name: "Pedro", age: 65, module: "Dor", desc: "Dor oncológica" },
  { id: "pain_ana", name: "Ana", age: 36, module: "Dor", desc: "Cefaleia por uso excessivo" },
  { id: "inflammation_maria", name: "Dona Maria", age: 72, module: "Inflamação", desc: "Osteoartrite de joelho" },
  { id: "inflammation_antonio", name: "Seu Antônio", age: 66, module: "Inflamação", desc: "Osteoartrite de quadril" },
  { id: "inflammation_renata", name: "Renata", age: 39, module: "Inflamação", desc: "Artrite reumatoide inicial" },
  { id: "inflammation_wilson", name: "Seu Wilson", age: 57, module: "Inflamação", desc: "AR refratária" },
  { id: "inflammation_jose", name: "José", age: 57, module: "Inflamação", desc: "Complicações do corticoide" },
];

export const STATIC_VP_CATALOG: VpCatalogEntry[] = STATIC_LEGACY.map((p) => ({
  ...p,
  isLegacy: true,
  label: label(p.name, p.age),
  clinicalCase: VP_CLINICAL_CASES[p.id],
}));

/** Valor gravado em virtual_patient_sessions.module a partir da categoria do caso. */
export function sessionModuleFor(category: string | null | undefined): string {
  const c = (category || "").toLowerCase();
  if (c.startsWith("inflam")) return "inflammation";
  if (c === "dor" || c === "pain") return "pain";
  return c || "pain";
}

export async function fetchVpCatalog(): Promise<VpCatalogEntry[]> {
  const { data, error } = await supabase
    .from("custom_virtual_patients")
    .select("id, slug, name, age, category, description, is_legacy, clinical_case, created_at")
    .order("created_at", { ascending: true });
  if (error || !data) return STATIC_VP_CATALOG;

  const fromDb: VpCatalogEntry[] = (data as any[]).map((r) => {
    const id = r.slug || r.id;
    return {
      id,
      name: r.name,
      age: r.age,
      module: r.category,
      desc: r.description,
      isLegacy: !!r.is_legacy,
      label: label(r.name, r.age),
      clinicalCase: (r.clinical_case && Object.keys(r.clinical_case).length > 0 ? r.clinical_case : VP_CLINICAL_CASES[id]) as VPClinicalCase | undefined,
    };
  });
  // Casos legados que ainda não estejam no banco continuam aparecendo (migração parcial).
  const ids = new Set(fromDb.map((e) => e.id));
  return [...STATIC_VP_CATALOG.filter((e) => !ids.has(e.id)), ...fromDb];
}

export function useVpCatalog() {
  const [entries, setEntries] = useState<VpCatalogEntry[]>(STATIC_VP_CATALOG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchVpCatalog()
      .then((list) => { if (active) setEntries(list); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const byId = useMemo(() => {
    const m: Record<string, VpCatalogEntry> = {};
    entries.forEach((e) => { m[e.id] = e; });
    return m;
  }, [entries]);

  return { entries, byId, loading };
}

/** Dados mínimos para a sala do aluno (sem login). Usa a função pública do banco; nunca expõe roteiro/gabarito. */
export async function fetchPublicVpCase(patientId: string): Promise<{ name: string; age: number; module: string } | null> {
  const legacy = STATIC_VP_CATALOG.find((e) => e.id === patientId);
  try {
    const { data, error } = await (supabase as any).rpc("get_vp_case_public", { _patient_id: patientId });
    const row = Array.isArray(data) ? data[0] : data;
    if (!error && row) return { name: row.name, age: row.age, module: row.category };
  } catch {
    // cai na cópia em código
  }
  return legacy ? { name: legacy.name, age: legacy.age, module: legacy.module } : null;
}
