import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, CheckCircle2, Clock, RefreshCw, Sparkles, Gavel, GraduationCap, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MockTrialEvaluationForm } from "@/components/mock-trial/MockTrialEvaluationForm";
import { consolidateScores } from "@/lib/mock-trial-evaluations";

interface Props {
  cases: any[];
  groups: any[];
  assignments: any[];
  forms: any[];
  responses: any[];
  evaluations: any[];
  sessions: any[];
  evaluationForms: any[];
  onRefresh: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  prosecution: "Acusação",
  defense: "Defesa",
  jury: "Júri Técnico",
};
const ROLE_COLOR: Record<string, string> = {
  prosecution: "bg-red-500/10 text-red-700 border-red-500/30",
  defense: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  jury: "bg-amber-500/10 text-amber-700 border-amber-500/30",
};

export function ResultsPanel(props: Props) {
  const { cases, groups, assignments, forms, responses, evaluations, sessions, evaluationForms, onRefresh } = props;
  const [selectedCaseId, setSelectedCaseId] = useState<string>(cases[0]?.id || "");
  const [aiRunning, setAiRunning] = useState(false);

  if (cases.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Crie processos para acompanhar resultados</h3>
        </CardContent>
      </Card>
    );
  }

  const selectedCase = cases.find(c => c.id === selectedCaseId) || cases[0];
  const session = sessions.find(s => s.case_id === selectedCase.id);
  const caseAssigns = assignments.filter(a => a.case_id === selectedCase.id);
  const caseEvaluations = evaluations.filter(e => e.case_id === selectedCase.id);
  const teacherForm = evaluationForms.find(f => f.evaluator_type === "teacher");

  const consolidated = consolidateScores(caseEvaluations, caseAssigns);

  const runAi = async () => {
    if (!session?.id) {
      toast.error("Inicie a sessão deste processo no painel do juiz primeiro.");
      return;
    }
    setAiRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("grade-mock-trial-jury", {
        body: { session_id: session.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Avaliação da IA dos jurados concluída!");
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao gerar avaliação da IA");
    } finally {
      setAiRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Seletor de processo */}
      {cases.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {cases.map(c => (
            <Button
              key={c.id}
              variant={selectedCaseId === c.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCaseId(c.id)}
            >
              {c.title}
            </Button>
          ))}
        </div>
      )}

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Notas Consolidadas</TabsTrigger>
          <TabsTrigger value="submissions">Envios dos Grupos</TabsTrigger>
          <TabsTrigger value="ai">Avaliação dos Jurados (IA)</TabsTrigger>
          <TabsTrigger value="teacher">Avaliação do Professor</TabsTrigger>
        </TabsList>

        {/* === Notas consolidadas === */}
        <TabsContent value="summary" className="space-y-3">
          {consolidated.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Sem grupos distribuídos.</CardContent></Card>
          ) : (
            consolidated.map(c => {
              const group = groups.find(g => g.id === c.groupId);
              return (
                <Card key={c.groupId}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={c.role === "prosecution" ? "destructive" : "default"}>
                        {ROLE_LABEL[c.role]}
                      </Badge>
                      <CardTitle className="text-base">
                        Grupo {group?.group_number}{group?.name ? ` – ${group.name}` : ""}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                      <ScoreBox icon={<Gavel className="h-4 w-4" />} label="Juiz" value={c.judge} />
                      <ScoreBox icon={<GraduationCap className="h-4 w-4" />} label="Professor" value={c.teacher} />
                      <ScoreBox icon={<Sparkles className="h-4 w-4" />} label="IA (jurados)" value={c.ai} hint="Coerência com evidências" />
                      <div className="rounded-lg border-2 border-primary p-3 bg-primary/5">
                        <div className="text-xs text-muted-foreground">Nota Final do Grupo</div>
                        <div className="text-3xl font-bold text-primary">
                          {c.finalGroup != null ? c.finalGroup.toFixed(1) : "—"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">(Juiz + Professor) / 2</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* === Envios dos grupos (corrige bug visualização) === */}
        <TabsContent value="submissions" className="space-y-3">
          {caseAssigns.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhum grupo distribuído neste processo.</CardContent></Card>
          ) : (
            caseAssigns.map(a => {
              const group = groups.find(g => g.id === a.group_id);
              if (!group) return null;
              const formForRole = forms.find((f: any) => f.target_role === a.role);
              const groupResponses = responses.filter((r: any) =>
                r.session_id === session?.id &&
                r.group_id === group.id &&
                (formForRole ? r.form_id === formForRole.id : true)
              );
              return (
                <Card key={a.id} className={`border ${ROLE_COLOR[a.role] || ""}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{ROLE_LABEL[a.role]}</Badge>
                        <CardTitle className="text-sm">
                          Grupo {group.group_number}{group.name ? ` – ${group.name}` : ""}
                        </CardTitle>
                      </div>
                      {groupResponses.length > 0 ? (
                        <Badge className="bg-green-600 text-white border-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {groupResponses.length} envio(s)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-dashed">
                          <Clock className="h-3 w-3 mr-1" />Aguardando
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {groupResponses.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Nenhum envio até o momento.</p>
                    ) : (
                      <div className="space-y-2">
                        {groupResponses.map((r: any) => (
                          <details key={r.id} className="rounded border bg-background p-2">
                            <summary className="cursor-pointer text-sm font-medium flex items-center justify-between">
                              <span>{r.student_name || "Anônimo"} <span className="text-xs text-muted-foreground ml-1">{r.student_email}</span></span>
                              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                            </summary>
                            <pre className="text-xs bg-muted p-2 mt-2 rounded overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(r.response_json, null, 2)}
                            </pre>
                          </details>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* === IA dos jurados === */}
        <TabsContent value="ai" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Avaliação dos Jurados pela IA
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    A IA compara as respostas dos jurados com a argumentação dos grupos e as evidências do processo.
                  </p>
                </div>
                <Button onClick={runAi} disabled={aiRunning} size="sm">
                  <RefreshCw className={`h-4 w-4 mr-1 ${aiRunning ? "animate-spin" : ""}`} />
                  {aiRunning ? "Processando..." : "Gerar / Recalcular"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {caseEvaluations.filter(e => e.evaluator_type === "ai_jury").length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Ainda não foi gerada avaliação da IA. Aguarde os jurados enviarem o formulário e clique em "Gerar".
                </p>
              ) : (
                caseEvaluations.filter(e => e.evaluator_type === "ai_jury").map(e => {
                  const group = groups.find(g => g.id === e.group_id);
                  return (
                    <div key={e.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={e.evaluated_role === "prosecution" ? "destructive" : "default"}>
                            {ROLE_LABEL[e.evaluated_role]}
                          </Badge>
                          <span className="font-medium text-sm">
                            Grupo {group?.group_number}{group?.name ? ` – ${group.name}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {e.edited_by_teacher && <Badge variant="outline" className="text-xs">Revisada</Badge>}
                          <Badge className="text-base px-3 py-1">{Number(e.score).toFixed(1)}/10</Badge>
                        </div>
                      </div>
                      {e.feedback && (
                        <p className="text-sm text-muted-foreground bg-muted/40 p-2 rounded">
                          {e.feedback}
                        </p>
                      )}
                      <EditableScore evaluationId={e.id} currentScore={Number(e.score)} onSaved={onRefresh} />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Avaliação do Professor === */}
        <TabsContent value="teacher" className="space-y-3">
          {!session ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Inicie a sessão no painel do juiz para liberar a avaliação.</CardContent></Card>
          ) : !teacherForm ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Carregando formulário...</CardContent></Card>
          ) : (
            caseAssigns
              .filter(a => a.role === "prosecution" || a.role === "defense")
              .map(a => {
                const group = groups.find(g => g.id === a.group_id);
                if (!group) return null;
                const existing = caseEvaluations.find(
                  e => e.group_id === a.group_id && e.evaluator_type === "teacher"
                );
                return (
                  <MockTrialEvaluationForm
                    key={a.id}
                    sessionId={session.id}
                    caseId={selectedCase.id}
                    groupId={a.group_id}
                    groupLabel={`Grupo ${group.group_number}${group.name ? ` – ${group.name}` : ""}`}
                    evaluatedRole={a.role}
                    evaluatorType="teacher"
                    fields={teacherForm.fields_json}
                    existing={existing}
                    onSaved={onRefresh}
                  />
                );
              })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScoreBox({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value?: number; hint?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className="text-2xl font-bold">{value != null ? value.toFixed(1) : "—"}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function EditableScore({ evaluationId, currentScore, onSaved }: { evaluationId: string; currentScore: number; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentScore);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("mock_trial_evaluations")
      .update({ score: value, edited_by_teacher: true })
      .eq("id", evaluationId);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Nota da IA atualizada");
    setEditing(false);
    onSaved();
  };

  if (!editing) {
    return (
      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
        Revisar nota
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={10}
        step={0.1}
        value={value}
        onChange={e => setValue(Number(e.target.value))}
        className="w-20 rounded border px-2 py-1 text-sm bg-background"
      />
      <Button size="sm" onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
      <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setValue(currentScore); }}>Cancelar</Button>
    </div>
  );
}
