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
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Users, FileText, BarChart3, Bot, CheckCircle, Loader2, Table2 } from "lucide-react";

type FormField = { id: string; label: string; type: string; options?: string[]; max_score?: number };
type MedColumn = { id: string; label: string };
type MedFormContent = { columns: MedColumn[]; rows_score: number; answer_rows?: Record<string, string>[] };

export default function DocumentationControl() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPairIndex, setSelectedPairIndex] = useState<number | null>(null);
  const [adminScore, setAdminScore] = useState("");
  const [adminFeedback, setAdminFeedback] = useState("");
  const [gradingAI, setGradingAI] = useState(false);

  const { data: room } = useQuery({
    queryKey: ["documentation-room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documentation_rooms").select("*").eq("id", roomId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["documentation-participants", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documentation_participants").select("*").eq("room_id", roomId!).order("pair_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
    refetchInterval: 5000,
  });

  const { data: responses = [] } = useQuery({
    queryKey: ["documentation-responses", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documentation_responses").select("*").eq("room_id", roomId!);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!roomId,
    refetchInterval: 5000,
  });

  const { data: forms = [] } = useQuery({
    queryKey: ["documentation-forms", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documentation_forms").select("*").eq("room_id", roomId!);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!roomId,
  });

  const { data: clinicalCases = [] } = useQuery({
    queryKey: ["documentation-clinical-cases", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documentation_clinical_cases").select("*").eq("room_id", roomId!).order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  const students = participants.filter(p => p.participant_role === "student");
  const pairs = useMemo(() => {
    const map: Record<number, any[]> = {};
    students.forEach(s => { if (s.pair_index >= 0) { map[s.pair_index] = map[s.pair_index] || []; map[s.pair_index].push(s); } });
    return map;
  }, [students]);

  const referralForm = forms.find((f: any) => f.form_type === "referral");
  const referralAnswerKey = forms.find((f: any) => f.form_type === "referral_answer_key");
  const medForm = forms.find((f: any) => f.form_type === "medication_summary");
  const medAnswerKey = forms.find((f: any) => f.form_type === "medication_answer_key");

  const referralFields: FormField[] = referralForm ? (Array.isArray(referralForm.content_json) ? referralForm.content_json : []) : [];
  const referralKeyFields: FormField[] = referralAnswerKey ? (Array.isArray(referralAnswerKey.content_json) ? referralAnswerKey.content_json : []) : [];
  const medContent: MedFormContent | null = medForm ? (medForm.content_json as MedFormContent) : null;
  const medKeyContent: MedFormContent | null = medAnswerKey ? (medAnswerKey.content_json as MedFormContent) : null;

  // Get unique pair indices with responses
  const pairIndicesWithResponses = useMemo(() => {
    const set = new Set<number>();
    responses.forEach(r => set.add(r.pair_index));
    return Array.from(set).sort((a, b) => a - b);
  }, [responses]);

  const selectedReferralResp = responses.find(r => r.pair_index === selectedPairIndex && r.form_id === referralForm?.id);
  const selectedMedResp = responses.find(r => r.pair_index === selectedPairIndex && r.form_id === medForm?.id);

  const handleSelectPair = (pairIdx: number) => {
    setSelectedPairIndex(pairIdx);
    // Load admin scores from referral response
    const resp = responses.find(r => r.pair_index === pairIdx && r.form_id === referralForm?.id);
    setAdminScore(resp?.admin_score != null ? String(resp.admin_score) : "");
    setAdminFeedback(resp?.admin_feedback || "");
  };

  const saveAdminEvaluation = async () => {
    // Save for both referral and med responses
    const toUpdate = responses.filter(r => r.pair_index === selectedPairIndex);
    for (const resp of toUpdate) {
      await supabase.from("documentation_responses").update({
        admin_score: adminScore ? Number(adminScore) : null,
        admin_feedback: adminFeedback || null,
      }).eq("id", resp.id);
    }
    toast({ title: "Avaliação salva!" });
    queryClient.invalidateQueries({ queryKey: ["documentation-responses", roomId] });
  };

  const gradeWithAI = async () => {
    if (selectedPairIndex === null) return;
    setGradingAI(true);
    try {
      const respIds = responses.filter(r => r.pair_index === selectedPairIndex).map(r => r.id);
      const { data, error } = await supabase.functions.invoke("grade-documentation", {
        body: {
          room_id: roomId,
          pair_index: selectedPairIndex,
          referral_response: selectedReferralResp ? { id: selectedReferralResp.id, answers_json: selectedReferralResp.answers_json } : null,
          referral_answer_key: referralAnswerKey?.content_json || null,
          referral_fields: referralForm?.content_json || [],
          med_response: selectedMedResp ? { id: selectedMedResp.id, answers_json: selectedMedResp.answers_json } : null,
          med_answer_key: medKeyContent || null,
          med_columns: medContent?.columns || [],
        },
      });
      if (error) throw error;
      toast({ title: "Correção concluída!" });
      queryClient.invalidateQueries({ queryKey: ["documentation-responses", roomId] });
      if (data?.ai_score != null) setAdminScore(String(data.ai_score));
      if (data?.ai_feedback) setAdminFeedback(data.ai_feedback);
    } catch (err: any) {
      toast({ title: "Erro na correção", description: err.message, variant: "destructive" });
    } finally {
      setGradingAI(false);
    }
  };

  const pairNames = (pairIdx: number) => {
    const pair = pairs[pairIdx];
    if (!pair) return `Dupla ${pairIdx + 1}`;
    return pair.map(p => p.student_name).join(" & ");
  };

  const renderAnswerValue = (value: any) => {
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value || "—");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(`/simulations/documentation/editor/${roomId}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" />Voltar
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-chart-4/10 text-chart-4 border-chart-4/30">Documentação</Badge>
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
                    {pair.map((p: any) => <p key={p.id} className="text-sm">{p.student_name}</p>)}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          {!pairIndicesWithResponses.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma resposta recebida ainda.</p>
          ) : (
            pairIndicesWithResponses.map(pairIdx => {
              const refResp = responses.find(r => r.pair_index === pairIdx && r.form_id === referralForm?.id);
              const mResp = responses.find(r => r.pair_index === pairIdx && r.form_id === medForm?.id);
              const caseData = clinicalCases.find(c => c.id === (refResp || mResp)?.clinical_case_id);

              return (
                <Card key={pairIdx}>
                  <CardHeader>
                    <CardTitle className="text-base">{pairNames(pairIdx)}</CardTitle>
                    {caseData && <p className="text-sm text-muted-foreground">Caso: {caseData.title}</p>}
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Referral side-by-side */}
                    {refResp && (
                      <div>
                        <h4 className="font-medium text-sm mb-3 flex items-center gap-1"><FileText className="h-4 w-4" />Encaminhamento</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Resposta da Dupla</p>
                            {referralFields.map(field => (
                              <div key={field.id} className="mb-2">
                                <p className="text-xs font-medium text-muted-foreground">{field.label} ({field.max_score || 0} pts)</p>
                                <p className="text-sm bg-muted p-2 rounded">{renderAnswerValue((refResp.answers_json as any)?.[field.id])}</p>
                              </div>
                            ))}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Espelho</p>
                            {referralKeyFields.length ? referralKeyFields.map(field => (
                              <div key={field.id} className="mb-2">
                                <p className="text-xs font-medium text-muted-foreground">{field.label} ({field.max_score || 0} pts)</p>
                                <p className="text-sm bg-green-50 dark:bg-green-950 p-2 rounded border border-green-200 dark:border-green-800">{field.options?.join(", ") || "Ver espelho"}</p>
                              </div>
                            )) : <p className="text-sm text-muted-foreground">Sem espelho cadastrado.</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Medication summary side-by-side */}
                    {mResp && medContent && (
                      <div>
                        <h4 className="font-medium text-sm mb-3 flex items-center gap-1"><Table2 className="h-4 w-4" />Quadro Resumo</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Resposta da Dupla</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border">
                                <thead><tr>{medContent.columns.map(c => <th key={c.id} className="border p-2 text-left bg-muted">{c.label}</th>)}</tr></thead>
                                <tbody>
                                  {((mResp.answers_json as any)?.rows || []).map((row: any, rIdx: number) => (
                                    <tr key={rIdx}>{medContent.columns.map(c => <td key={c.id} className="border p-2">{row[c.id] || "—"}</td>)}</tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Espelho</p>
                            {medKeyContent?.answer_rows?.length ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm border">
                                  <thead><tr>{(medKeyContent.columns || medContent.columns).map(c => <th key={c.id} className="border p-2 text-left bg-green-50 dark:bg-green-950">{c.label}</th>)}</tr></thead>
                                  <tbody>
                                    {medKeyContent.answer_rows.map((row, rIdx) => (
                                      <tr key={rIdx}>{(medKeyContent.columns || medContent.columns).map(c => <td key={c.id} className="border p-2 bg-green-50 dark:bg-green-950">{row[c.id] || "—"}</td>)}</tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : <p className="text-sm text-muted-foreground">Sem espelho cadastrado.</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AI Feedback */}
                    {(refResp?.ai_feedback_json || mResp?.ai_feedback_json) && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><Bot className="h-4 w-4" />Feedback da IA</h4>
                        {refResp?.ai_feedback_json && typeof refResp.ai_feedback_json === "object" && (
                          <div className="mb-2">
                            <p className="text-xs font-semibold">Encaminhamento:</p>
                            {Object.entries(refResp.ai_feedback_json as Record<string, any>).map(([key, val]) => (
                              <p key={key} className="text-sm">{referralFields.find(f => f.id === key)?.label || key}: {typeof val === "object" ? `Nota: ${(val as any).score || 0} — ${(val as any).feedback || ""}` : String(val)}</p>
                            ))}
                          </div>
                        )}
                        {mResp?.ai_feedback_json && <p className="text-sm">{typeof mResp.ai_feedback_json === "string" ? mResp.ai_feedback_json : JSON.stringify(mResp.ai_feedback_json)}</p>}
                        {refResp?.ai_score != null && <p className="font-medium">Nota IA Encaminhamento: {refResp.ai_score}</p>}
                        {mResp?.ai_score != null && <p className="font-medium">Nota IA Quadro: {mResp.ai_score}</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="grading" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Selecionar Dupla</h3>
              {pairIndicesWithResponses.map(pairIdx => (
                <button key={pairIdx} onClick={() => handleSelectPair(pairIdx)} className={`w-full text-left p-3 rounded border transition-colors ${selectedPairIndex === pairIdx ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                  <p className="text-sm font-medium">{pairNames(pairIdx)}</p>
                  {(() => {
                    const refR = responses.find(r => r.pair_index === pairIdx && r.form_id === referralForm?.id);
                    return (
                      <div className="flex gap-2 mt-1">
                        {refR?.ai_score != null && <Badge variant="outline" className="text-xs">IA: {refR.ai_score}</Badge>}
                        {refR?.admin_score != null && <Badge className="text-xs">Admin: {refR.admin_score}</Badge>}
                      </div>
                    );
                  })()}
                </button>
              ))}
              {!pairIndicesWithResponses.length && <p className="text-sm text-muted-foreground">Sem respostas</p>}
            </div>

            <div className="md:col-span-3">
              {selectedPairIndex !== null && (selectedReferralResp || selectedMedResp) ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{pairNames(selectedPairIndex)}</CardTitle>
                      <Button onClick={gradeWithAI} disabled={gradingAI} variant="outline">
                        {gradingAI ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Bot className="h-4 w-4 mr-1" />}
                        Corrigir com IA
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedReferralResp?.ai_feedback_json && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-1"><Bot className="h-4 w-4" />Correção da IA</h4>
                        {typeof selectedReferralResp.ai_feedback_json === "object" && !Array.isArray(selectedReferralResp.ai_feedback_json) && (
                          Object.entries(selectedReferralResp.ai_feedback_json as Record<string, any>).map(([key, val]) => {
                            const field = referralFields.find(f => f.id === key);
                            return (
                              <div key={key} className="text-sm border-b border-blue-100 dark:border-blue-900 pb-1">
                                <span className="font-medium">{field?.label || key}:</span>{" "}
                                {typeof val === "object" ? `Nota: ${(val as any).score || 0} — ${(val as any).feedback || ""}` : String(val)}
                              </div>
                            );
                          })
                        )}
                        {selectedReferralResp.ai_score != null && <p className="font-medium">Nota IA: {selectedReferralResp.ai_score}</p>}
                      </div>
                    )}
                    <div><Label>Nota Final (Admin)</Label><Input type="number" value={adminScore} onChange={e => setAdminScore(e.target.value)} placeholder="Nota" /></div>
                    <div><Label>Feedback do Admin</Label><Textarea value={adminFeedback} onChange={e => setAdminFeedback(e.target.value)} rows={4} placeholder="Feedback para a dupla..." /></div>
                    <Button onClick={saveAdminEvaluation}>Salvar Avaliação</Button>
                  </CardContent>
                </Card>
              ) : (
                <Card><CardContent className="py-12 text-center text-muted-foreground">Selecione uma dupla para avaliar</CardContent></Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
