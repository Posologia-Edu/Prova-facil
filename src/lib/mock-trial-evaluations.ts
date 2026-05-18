import { supabase } from "@/integrations/supabase/client";
import {
  JUDGE_EVALUATION_TEMPLATE,
  TEACHER_EVALUATION_TEMPLATE,
} from "@/lib/mock-trial-evaluation-templates";

/**
 * Garante que existem formulários de avaliação (judge e teacher) para o júri.
 * Retorna o array atualizado.
 */
export async function ensureEvaluationForms(mockTrialId: string) {
  const { data: existing } = await supabase
    .from("mock_trial_evaluation_forms")
    .select("*")
    .eq("mock_trial_id", mockTrialId);

  const have = new Set((existing || []).map((f: any) => f.evaluator_type));
  const toCreate: any[] = [];

  if (!have.has("judge")) {
    toCreate.push({
      mock_trial_id: mockTrialId,
      evaluator_type: "judge",
      title: JUDGE_EVALUATION_TEMPLATE.title,
      fields_json: JUDGE_EVALUATION_TEMPLATE.fields,
    });
  }
  if (!have.has("teacher")) {
    toCreate.push({
      mock_trial_id: mockTrialId,
      evaluator_type: "teacher",
      title: TEACHER_EVALUATION_TEMPLATE.title,
      fields_json: TEACHER_EVALUATION_TEMPLATE.fields,
    });
  }

  if (toCreate.length > 0) {
    await supabase.from("mock_trial_evaluation_forms").insert(toCreate);
  }

  const { data: refreshed } = await supabase
    .from("mock_trial_evaluation_forms")
    .select("*")
    .eq("mock_trial_id", mockTrialId);

  return refreshed || [];
}

export interface ConsolidatedScore {
  groupId: string;
  role: "prosecution" | "defense";
  judge?: number;
  teacher?: number;
  ai?: number;
  /** (judge + teacher) / 2 — nota do grupo Acusação/Defesa */
  finalGroup: number | null;
  /** Score IA dos jurados (mesma ideia, mas para os jurados como avaliadores) */
  juryAi: number | null;
}

/**
 * Calcula a nota final por grupo:
 *  - Acusação/Defesa: média (juiz + professor) / 2
 *  - Jurados: nota da IA é o "score" do grupo júri (separado)
 */
export function consolidateScores(
  evaluations: any[],
  assignments: any[]
): ConsolidatedScore[] {
  const result: ConsolidatedScore[] = [];
  for (const a of assignments) {
    if (a.role !== "prosecution" && a.role !== "defense") continue;
    const evals = evaluations.filter(
      (e) => e.group_id === a.group_id && e.case_id === a.case_id
    );
    const judge = evals.find((e) => e.evaluator_type === "judge");
    const teacher = evals.find((e) => e.evaluator_type === "teacher");
    const ai = evals.find((e) => e.evaluator_type === "ai_jury");

    const judgeScore = judge ? Number(judge.score) : undefined;
    const teacherScore = teacher ? Number(teacher.score) : undefined;
    const aiScore = ai ? Number(ai.score) : undefined;

    const parts = [judgeScore, teacherScore, aiScore].filter(
      (v): v is number => v != null && !Number.isNaN(v)
    );
    const finalGroup =
      parts.length > 0
        ? Number((parts.reduce((a, b) => a + b, 0) / parts.length).toFixed(2))
        : null;

    result.push({
      groupId: a.group_id,
      role: a.role,
      judge: judgeScore,
      teacher: teacherScore,
      ai: aiScore,
      finalGroup,
      juryAi: aiScore ?? null,
    });
  }
  return result;
}
