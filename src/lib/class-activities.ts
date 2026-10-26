import { supabase } from "@/integrations/supabase/client";

// Atividades que podem ser ligadas a uma turma pela tabela class_activity_links.
// Provas online e pacientes virtuais têm vínculo próprio e não passam por aqui.
export type ClassActivityType =
  | "osce"
  | "simulation_anamnese" | "simulation_soap" | "simulation_reconciliation" | "simulation_documentation"
  | "nursing" | "nutrition" | "dentistry" | "medicine" | "physiotherapy" | "biomedicine"
  | "sct" | "kfe" | "sjt" | "progress_test" | "clinical_observation"
  | "mock_trial";

export type ClassActivityGroup = "OSCE" | "Simulação" | "Formulários" | "Júri Simulado";

interface ActivityTypeConfig {
  label: string;
  group: ClassActivityGroup;
  table: string;
  // true quando a tabela tem is_archived e a lista deve esconder os arquivados
  hasArchive?: boolean;
  // true quando a tabela usa deleted_at (lixeira)
  hasSoftDelete?: boolean;
  // true quando a rota depende de module_type (áreas de simulação)
  hasModuleType?: boolean;
  route: (id: string, moduleType?: string) => string;
}

export const CLASS_ACTIVITY_TYPES: Record<ClassActivityType, ActivityTypeConfig> = {
  osce: { label: "OSCE", group: "OSCE", table: "osce_exams", hasSoftDelete: true, route: (id) => `/osce/${id}/edit` },
  simulation_anamnese: { label: "Anamnese", group: "Simulação", table: "simulation_rooms", hasSoftDelete: true, hasArchive: true, route: (id) => `/simulations/${id}/edit` },
  simulation_soap: { label: "SOAP", group: "Simulação", table: "soap_rooms", hasSoftDelete: true, hasArchive: true, route: (id) => `/simulations/soap/editor/${id}` },
  simulation_reconciliation: { label: "Reconciliação", group: "Simulação", table: "reconciliation_rooms", hasSoftDelete: true, hasArchive: true, route: (id) => `/simulations/reconciliation/editor/${id}` },
  simulation_documentation: { label: "Documentação", group: "Simulação", table: "documentation_rooms", hasSoftDelete: true, hasArchive: true, route: (id) => `/simulations/documentation/editor/${id}` },
  nursing: { label: "Enfermagem", group: "Simulação", table: "nursing_rooms", hasSoftDelete: true, hasModuleType: true, route: (id, m) => `/nursing/${m}/editor/${id}` },
  nutrition: { label: "Nutrição", group: "Simulação", table: "nutrition_rooms", hasSoftDelete: true, hasModuleType: true, route: (id, m) => `/nutrition/${m}/editor/${id}` },
  dentistry: { label: "Odontologia", group: "Simulação", table: "dentistry_rooms", hasSoftDelete: true, hasModuleType: true, route: (id, m) => `/dentistry/${m}/editor/${id}` },
  medicine: { label: "Medicina", group: "Simulação", table: "medicine_rooms", hasSoftDelete: true, hasModuleType: true, route: (id, m) => `/medicine/${m}/editor/${id}` },
  physiotherapy: { label: "Fisioterapia", group: "Simulação", table: "physiotherapy_rooms", hasSoftDelete: true, hasModuleType: true, route: (id, m) => `/physiotherapy/${m}/editor/${id}` },
  biomedicine: { label: "Biomedicina", group: "Simulação", table: "biomedicine_rooms", hasSoftDelete: true, hasModuleType: true, route: (id, m) => `/biomedicine/${m}/editor/${id}` },
  sct: { label: "SCT", group: "Formulários", table: "sct_exams", hasSoftDelete: true, route: (id) => `/sct/${id}/edit` },
  kfe: { label: "KFE", group: "Formulários", table: "kfe_exams", hasSoftDelete: true, route: (id) => `/kfe/${id}/edit` },
  sjt: { label: "SJT", group: "Formulários", table: "sjt_exams", hasSoftDelete: true, route: (id) => `/sjt/${id}/edit` },
  progress_test: { label: "Progress Test", group: "Formulários", table: "progress_tests", hasSoftDelete: true, route: (id) => `/progress-test/${id}/edit` },
  clinical_observation: { label: "Mini-CEX e DOPS", group: "Formulários", table: "clinical_observations", hasSoftDelete: true, route: (id) => `/clinical-observations/${id}/edit` },
  mock_trial: { label: "Júri Simulado", group: "Júri Simulado", table: "mock_trials", hasSoftDelete: true, route: (id) => `/mock-trials/${id}/edit` },
};

export const CLASS_ACTIVITY_TYPE_KEYS = Object.keys(CLASS_ACTIVITY_TYPES) as ClassActivityType[];

export interface ClassActivityLink {
  id: string;
  class_id: string;
  activity_type: ClassActivityType;
  activity_id: string;
  created_at: string;
}

export interface ClassActivityItem {
  link: ClassActivityLink;
  title: string;
  status: string | null;
  moduleType?: string;
  missing: boolean;
}

export interface LinkableActivity {
  id: string;
  title: string;
  status: string | null;
  moduleType?: string;
}

// As tabelas novas ainda não estão no types.ts gerado; o cast evita depender da regeneração.
const db = supabase as any;

function selectColumns(cfg: ActivityTypeConfig) {
  return ["id", "title", "status", cfg.hasModuleType ? "module_type" : null].filter(Boolean).join(", ");
}

// Carrega os vínculos da turma e resolve o título e o estado de cada atividade.
export async function loadClassActivities(classId: string): Promise<ClassActivityItem[]> {
  const { data: links, error } = await db
    .from("class_activity_links")
    .select("id, class_id, activity_type, activity_id, created_at")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });
  if (error || !links) return [];

  const byType = new Map<ClassActivityType, ClassActivityLink[]>();
  for (const l of links as ClassActivityLink[]) {
    if (!CLASS_ACTIVITY_TYPES[l.activity_type]) continue;
    byType.set(l.activity_type, [...(byType.get(l.activity_type) ?? []), l]);
  }

  const items: ClassActivityItem[] = [];
  await Promise.all(
    Array.from(byType.entries()).map(async ([type, typeLinks]) => {
      const cfg = CLASS_ACTIVITY_TYPES[type];
      const { data } = await db.from(cfg.table).select(selectColumns(cfg)).in("id", typeLinks.map((l) => l.activity_id));
      const rows = new Map<string, any>(((data as any[]) ?? []).map((r) => [r.id, r]));
      for (const link of typeLinks) {
        const row = rows.get(link.activity_id);
        items.push({
          link,
          title: row?.title ?? "Atividade removida",
          status: row?.status ?? null,
          moduleType: row?.module_type,
          missing: !row,
        });
      }
    }),
  );
  return items.sort((a, b) => b.link.created_at.localeCompare(a.link.created_at));
}

// Atividades do docente que ainda não estão ligadas a esta turma.
export async function loadLinkableActivities(type: ClassActivityType, classId: string): Promise<LinkableActivity[]> {
  const cfg = CLASS_ACTIVITY_TYPES[type];
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  let query = db.from(cfg.table).select(selectColumns(cfg)).eq("user_id", user.user.id).order("created_at", { ascending: false });
  if (cfg.hasArchive) query = query.eq("is_archived", false);
  if (cfg.hasSoftDelete) query = query.is("deleted_at", null);
  const [{ data }, { data: existing }] = await Promise.all([
    query,
    db.from("class_activity_links").select("activity_id").eq("class_id", classId).eq("activity_type", type),
  ]);
  const linked = new Set(((existing as any[]) ?? []).map((r) => r.activity_id));
  return ((data as any[]) ?? [])
    .filter((r) => !linked.has(r.id))
    .map((r) => ({ id: r.id, title: r.title, status: r.status ?? null, moduleType: r.module_type }));
}

export async function linkActivityToClass(classId: string, type: ClassActivityType, activityId: string) {
  const { error } = await db.from("class_activity_links").insert({ class_id: classId, activity_type: type, activity_id: activityId });
  return !error;
}

export async function unlinkActivity(linkId: string) {
  const { error } = await db.from("class_activity_links").delete().eq("id", linkId);
  return !error;
}
