import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FormRenderer from "@/components/forms/FormRenderer";
import type { FormField } from "@/components/forms/types";
import { toast } from "sonner";
import { CheckCircle2, Save } from "lucide-react";
import {
  computeScoreFromCriteria,
  ROLE_LABELS,
} from "@/lib/mock-trial-evaluation-templates";

interface Props {
  sessionId: string;
  caseId: string;
  groupId: string;
  groupLabel: string;
  evaluatedRole: "prosecution" | "defense";
  evaluatorType: "judge" | "teacher";
  evaluatorName?: string;
  fields: FormField[];
  existing?: any | null;
  onSaved?: () => void;
}

export function MockTrialEvaluationForm({
  sessionId,
  caseId,
  groupId,
  groupLabel,
  evaluatedRole,
  evaluatorType,
  evaluatorName,
  fields,
  existing,
  onSaved,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      // Hidrata escalas a partir de criteria + comentário
      const init: Record<string, any> = { ...(existing.criteria_json || {}) };
      if (existing.feedback) init.comments = existing.feedback;
      setAnswers(init);
      setSavedAt(existing.updated_at || existing.created_at);
    }
  }, [existing?.id]);

  const handleSave = async () => {
    setSaving(true);
    const { score, criteria } = computeScoreFromCriteria(fields, answers);
    const payload = {
      session_id: sessionId,
      case_id: caseId,
      group_id: groupId,
      evaluated_role: evaluatedRole,
      evaluator_type: evaluatorType,
      score,
      max_score: 10,
      criteria_json: criteria,
      feedback: answers.comments || null,
      ai_generated: false,
      evaluator_name: evaluatorName || null,
    };
    const { error } = await supabase
      .from("mock_trial_evaluations")
      .upsert(payload, { onConflict: "case_id,group_id,evaluator_type" });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar avaliação");
      console.error(error);
      return;
    }
    setSavedAt(new Date().toISOString());
    toast.success(`Avaliação salva (${score.toFixed(1)}/10)`);
    onSaved?.();
  };

  const { score } = computeScoreFromCriteria(fields, answers);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Badge
              variant={evaluatedRole === "prosecution" ? "destructive" : "default"}
            >
              {ROLE_LABELS[evaluatedRole]}
            </Badge>
            <span>{groupLabel}</span>
          </CardTitle>
          {savedAt && (
            <Badge className="bg-green-600 text-white border-green-700">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Salvo • Nota {score.toFixed(1)}/10
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormRenderer fields={fields} answers={answers} onChange={setAnswers} />
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            Nota parcial: <strong>{score.toFixed(1)}/10</strong>
          </span>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Salvando..." : savedAt ? "Atualizar avaliação" : "Salvar avaliação"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
