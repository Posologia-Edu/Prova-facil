import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Users, FileText, BarChart3, Bot, CheckCircle, Loader2, ChevronDown, ChevronRight, Lock } from "lucide-react";

type FormField = {
  id: string;
  label: string;
  type: string;
  options?: string[];
  max_score?: number;
};

export default function ReconciliationControl() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPairIndex, setSelectedPairIndex] = useState<number | null>(null);
  const [adminScore, setAdminScore] = useState("");
  const [adminFeedback, setAdminFeedback] = useState("");
  const [gradingAI, setGradingAI] = useState(false);

  const { data: room } = useQuery({
    queryKey: ["reconciliation-room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("reconciliation_rooms").select("*").eq("id", roomId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["reconciliation-participants", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reconciliation_participants")
        .select("*")
        .eq("room_id", roomId!)
        .order("pair_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
    refetchInterval: 5000,
  });

  const { data: responses = [] } = useQuery({
    queryKey: ["reconciliation-responses", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reconciliation_responses")
        .select("*")
        .eq("room_id", roomId!);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!roomId,
    refetchInterval: 5000,
  });

  const { data: forms = [] } = useQuery({
    queryKey: ["reconciliation-forms", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reconciliation_forms")
        .select("*")
        .eq("room_id", roomId!);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!roomId,
  });

  const { data: clinicalCases = [] } = useQuery({
    queryKey: ["reconciliation-clinical-cases", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reconciliation_clinical_cases")
        .select("*")
        .eq("room_id", roomId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  const students = participants.filter(p => p.participant_role === "student");
  const pairs = useMemo(() => {
    const map: Record<number, any[]> = {};
    students.forEach(s => {
      if (s.pair_index >= 0) {
        map[s.pair_index] = map[s.pair_index] || [];
        map[s.pair_index].push(s);
      }
    });
    return map;
  }, [students]);

  const reconciliationForm = forms.find((f: any) => f.form_type === "reconciliation");
  const answerKeyForm = forms.find((f: any) => f.form_type === "answer_key");

  const selectedResponse = responses.find(r => r.pair_index === selectedPairIndex);

  const formFields: FormField[] = reconciliationForm
    ? (Array.isArray(reconciliationForm.content_json) ? reconciliationForm.content_json : [])
    : [];

  // Get answer key for a specific clinical case
  const getAnswerKeyFieldsForCase = (caseId: string | null): FormField[] => {
    if (!answerKeyForm) return [];
    const content = answerKeyForm.content_json;
    // New per-case structure
    if (content && typeof content === "object" && !Array.isArray(content) && (content as any).case_answers) {
      const caseAnswers = (content as any).case_answers;
      if (caseId && caseAnswers[caseId]) return caseAnswers[caseId];
      // Fallback: first case
      const firstKey = Object.keys(caseAnswers)[0];
      return firstKey ? caseAnswers[firstKey] : [];
    }
    // Legacy: flat array
    if (Array.isArray(content)) return content as FormField[];
    return [];
  };

  const answerKeyFields: FormField[] = answerKeyForm
    ? getAnswerKeyFieldsForCase(selectedResponse?.clinical_case_id)
    : [];

  // Sync admin fields when selection changes
  const currentAdminScore = selectedResponse?.admin_score;
  const currentAdminFeedback = selectedResponse?.admin_feedback;

  useState(() => {
    if (selectedResponse) {
      setAdminScore(currentAdminScore != null ? String(currentAdminScore) : "");
      setAdminFeedback(currentAdminFeedback || "");
    }
  });

  const handleSelectPair = (pairIdx: number) => {
    setSelectedPairIndex(pairIdx);
    const resp = responses.find(r => r.pair_index === pairIdx);
    setAdminScore(resp?.admin_score != null ? String(resp.admin_score) : "");
    setAdminFeedback(resp?.admin_feedback || "");
  };

  const saveAdminEvaluation = async () => {
    if (!selectedResponse) return;
    const { error } = await supabase.from("reconciliation_responses").update({
      admin_score: adminScore ? Number(adminScore) : null,
      admin_feedback: adminFeedback || null,
    }).eq("id", selectedResponse.id);
    if (error) {
      toast({ title: "Erro", variant: "destructive" });
      return;
    }
    toast({ title: "Avaliação salva!" });
    queryClient.invalidateQueries({ queryKey: ["reconciliation-responses", roomId] });
  };

  const gradeWithAI = async () => {
    if (!selectedResponse || !answerKeyForm) {
      toast({ title: "Espelho necessário", description: "Cadastre um espelho de respostas primeiro.", variant: "destructive" });
      return;
    }
    setGradingAI(true);
    try {
      // Get the answer key specific to the clinical case this pair was assigned
      const caseSpecificAnswerKey = getAnswerKeyFieldsForCase(selectedResponse.clinical_case_id);
      if (!caseSpecificAnswerKey.length) {
        toast({ title: "Espelho não encontrado", description: "Não há espelho de respostas cadastrado para o caso clínico desta dupla.", variant: "destructive" });
        setGradingAI(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("grade-reconciliation", {
        body: {
          response_id: selectedResponse.id,
          room_id: roomId,
          answers_json: selectedResponse.answers_json,
          answer_key_json: caseSpecificAnswerKey,
          form_fields: reconciliationForm?.content_json || [],
        },
      });
      if (error) throw error;
      toast({ title: "Correção concluída!", description: "A IA corrigiu a ficha de reconciliação." });
      queryClient.invalidateQueries({ queryKey: ["reconciliation-responses", roomId] });

      // Refresh admin fields with AI result
      if (data?.ai_score != null) setAdminScore(String(data.ai_score));
      if (data?.ai_feedback) setAdminFeedback(data.ai_feedback);
    } catch (err: any) {
      toast({ title: "Erro na correção", description: err.message, variant: "destructive" });
    } finally {
      setGradingAI(false);
    }
  };

  const renderAnswerValue = (value: any) => {
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value || "—");
  };

  const pairNames = (pairIdx: number) => {
    const pair = pairs[pairIdx];
    if (!pair) return `Dupla ${pairIdx + 1}`;
    return pair.map(p => p.student_name).join(" & ");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(`/simulations/reconciliation/editor/${roomId}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" />Voltar
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-chart-3/10 text-chart-3 border-chart-3/30">Reconciliação</Badge>
            <h1 className="text-xl font-bold">{room?.title} — Controle</h1>
          </div>
          <p className="text-sm text-muted-foreground">PIN: {room?.access_code}</p>
        </div>
      </div>

      <Tabs defaultValue="participants">
        <TabsList>
          <TabsTrigger value="participants"><Users className="h-4 w-4 mr-1" />Participantes</TabsTrigger>
          <TabsTrigger value="responses"><FileText className="h-4 w-4 mr-1" />Respostas</TabsTrigger>
          <TabsTrigger value="grading"><BarChart3 className="h-4 w-4 mr-1" />Avaliação</TabsTrigger>
        </TabsList>

        {/* Participants */}
        <TabsContent value="participants" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(pairs).map(([idx, pair]) => {
              const pairIdx = Number(idx);
              const hasResponse = responses.some(r => r.pair_index === pairIdx);
              return (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Dupla {pairIdx + 1}</CardTitle>
                      <Badge variant={hasResponse ? "default" : "outline"}>
                        {hasResponse ? "Enviou" : pair.every(p => p.status === "ready") ? "Pronto" : "Aguardando"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {pair.map((p: any) => (
                      <p key={p.id} className="text-sm">{p.student_name}</p>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Responses - side by side */}
        <TabsContent value="responses" className="space-y-4">
          {!responses.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma resposta recebida ainda.</p>
          ) : (
            responses.map(resp => {
              const caseData = clinicalCases.find(c => c.id === resp.clinical_case_id);
              const respAnswerKeyFields = getAnswerKeyFieldsForCase(resp.clinical_case_id);
              return (
                <Card key={resp.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{pairNames(resp.pair_index)}</CardTitle>
                    {caseData && <p className="text-sm text-muted-foreground">Caso: {caseData.title}</p>}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Student answers */}
                      <div>
                        <h4 className="font-medium text-sm mb-3 flex items-center gap-1"><FileText className="h-4 w-4" />Respostas da Dupla</h4>
                        <div className="space-y-3">
                          {formFields.map(field => (
                            <div key={field.id} className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">{field.label} ({field.max_score || 0} pts)</p>
                              <p className="text-sm bg-muted p-2 rounded">{renderAnswerValue(resp.answers_json?.[field.id])}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Answer key */}
                      <div>
                        <h4 className="font-medium text-sm mb-3 flex items-center gap-1"><CheckCircle className="h-4 w-4" />Espelho de Respostas{caseData ? ` — ${caseData.title}` : ""}</h4>
                        {respAnswerKeyFields.length > 0 ? (
                          <div className="space-y-3">
                            {respAnswerKeyFields.map(field => (
                              <div key={field.id} className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">{field.label} ({field.max_score || 0} pts)</p>
                                <p className="text-sm bg-green-50 dark:bg-green-950 p-2 rounded border border-green-200 dark:border-green-800">
                                  {field.options?.join(", ") || "Ver espelho"}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhum espelho cadastrado.</p>
                        )}
                      </div>
                    </div>

                    {/* AI Feedback if available */}
                    {resp.ai_feedback_json && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><Bot className="h-4 w-4" />Feedback da IA</h4>
                        {typeof resp.ai_feedback_json === "object" && !Array.isArray(resp.ai_feedback_json) ? (
                          Object.entries(resp.ai_feedback_json as Record<string, any>).map(([key, val]) => (
                            <div key={key} className="text-sm mb-1">
                              <span className="font-medium">{formFields.find(f => f.id === key)?.label || key}:</span>{" "}
                              {typeof val === "object" ? JSON.stringify(val) : String(val)}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm">{String(resp.ai_feedback_json)}</p>
                        )}
                        {resp.ai_score != null && <p className="text-sm font-medium mt-2">Nota IA: {resp.ai_score}</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Grading */}
        <TabsContent value="grading" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Pair selector */}
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Selecionar Dupla</h3>
              {responses.map(resp => (
                <button
                  key={resp.id}
                  onClick={() => handleSelectPair(resp.pair_index)}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    selectedPairIndex === resp.pair_index
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <p className="text-sm font-medium">{pairNames(resp.pair_index)}</p>
                  <div className="flex gap-2 mt-1">
                    {resp.ai_score != null && <Badge variant="outline" className="text-xs">IA: {resp.ai_score}</Badge>}
                    {resp.admin_score != null && <Badge className="text-xs">Admin: {resp.admin_score}</Badge>}
                  </div>
                </button>
              ))}
              {!responses.length && <p className="text-sm text-muted-foreground">Sem respostas</p>}
            </div>

            {/* Evaluation panel */}
            <div className="md:col-span-3">
              {selectedResponse ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{pairNames(selectedPairIndex!)}</CardTitle>
                      <Button onClick={gradeWithAI} disabled={gradingAI} variant="outline">
                        {gradingAI ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Bot className="h-4 w-4 mr-1" />}
                        Corrigir com IA
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Show AI feedback per item if available */}
                    {selectedResponse.ai_feedback_json && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-1"><Bot className="h-4 w-4" />Correção da IA</h4>
                        {typeof selectedResponse.ai_feedback_json === "object" && !Array.isArray(selectedResponse.ai_feedback_json) ? (
                          Object.entries(selectedResponse.ai_feedback_json as Record<string, any>).map(([key, val]) => {
                            const field = formFields.find(f => f.id === key);
                            return (
                              <div key={key} className="text-sm border-b border-blue-100 dark:border-blue-900 pb-1">
                                <span className="font-medium">{field?.label || key}:</span>{" "}
                                {typeof val === "object" ? `Nota: ${(val as any).score || 0} — ${(val as any).feedback || ""}` : String(val)}
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm">{String(selectedResponse.ai_feedback_json)}</p>
                        )}
                        {selectedResponse.ai_score != null && <p className="font-medium">Nota IA: {selectedResponse.ai_score}</p>}
                      </div>
                    )}

                    <div>
                      <Label>Nota Final (Admin)</Label>
                      <Input type="number" value={adminScore} onChange={e => setAdminScore(e.target.value)} placeholder="Nota" />
                    </div>
                    <div>
                      <Label>Feedback do Admin</Label>
                      <Textarea value={adminFeedback} onChange={e => setAdminFeedback(e.target.value)} rows={4} placeholder="Feedback para a dupla..." />
                    </div>
                    <Button onClick={saveAdminEvaluation}>Salvar Avaliação</Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Selecione uma dupla para avaliar
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
