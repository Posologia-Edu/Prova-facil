import { supabase } from "@/integrations/supabase/client";

export interface CompetencyScoreInput {
  studentEmail: string;
  competencyId: string;
  score: number;
  maxScore: number;
  sourceType: string;
  sourceId: string;
  sourceLabel: string;
  evaluatedAt?: string;
}

/**
 * Records competency scores for a student after grading.
 * Uses upsert to avoid duplicates (source_type + source_id + competency_id + student_email).
 */
export async function recordCompetencyScores(
  entries: CompetencyScoreInput[]
): Promise<void> {
  if (entries.length === 0) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const rows = entries.map((e) => ({
    user_id: user.id,
    student_email: e.studentEmail,
    competency_id: e.competencyId,
    score: e.score,
    max_score: e.maxScore,
    source_type: e.sourceType,
    source_id: e.sourceId,
    source_label: e.sourceLabel,
    evaluated_at: e.evaluatedAt || new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("competency_scores")
    .upsert(rows, {
      onConflict: "source_type,source_id,competency_id,student_email",
    });

  if (error) {
    console.error("Error recording competency scores:", error);
  }
}

/**
 * Given a room with competency_ids, records scores for all participants.
 */
export async function recordRoomCompetencyScores(opts: {
  competencyIds: string[];
  participants: { email: string; score: number; maxScore: number }[];
  sourceType: string;
  sourceId: string;
  sourceLabel: string;
}): Promise<void> {
  if (!opts.competencyIds?.length || !opts.participants?.length) return;

  const entries: CompetencyScoreInput[] = [];
  for (const p of opts.participants) {
    if (!p.email) continue;
    for (const cid of opts.competencyIds) {
      entries.push({
        studentEmail: p.email,
        competencyId: cid,
        score: p.score,
        maxScore: p.maxScore,
        sourceType: opts.sourceType,
        sourceId: opts.sourceId,
        sourceLabel: opts.sourceLabel,
      });
    }
  }

  await recordCompetencyScores(entries);
}
