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
import { ArrowLeft, Users, FileText, BarChart3, Bot, CheckCircle, Loader2, Table2, ChevronDown, ChevronRight, Lock, Unlock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SimulationReportGenerator, type PairReport } from "@/components/SimulationReportGenerator";

type FormField = { id: string; label: string; type: string; options?: string[]; max_score?: number };
type MedColumn = { id: string; label: string };
type MedFormContent = { columns: MedColumn[]; rows_score: number; answer_rows?: Record<string, string>[] };
type MedCaseContent = { columns: MedColumn[]; rows_score: number; answer_rows: Record<string, string>[] };

export function CollapsibleAnswerField({ field }: { field: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const answerText = field.correct_answer || field.options?.join(", ") || "Sem conteúdo";
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-2">
      <div className="text-xs font-medium text-muted-foreground uppercase">{field.label} ({field.max_score || 0} pts)</div>
      <CollapsibleTrigger asChild>
        <button className="w-full text-left text-sm bg-green-50 dark:bg-green-950 p-2 rounded border border-green-200 dark:border-green-800 flex items-center justify-between hover:bg-green-100 dark:hover:bg-green-900 transition-colors">
          <span>{isOpen ? "Ocultar espelho" : "Ver espelho"}</span>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="text-sm bg-green-50 dark:bg-green-950 p-3 rounded-b border border-t-0 border-green-200 dark:border-green-800">
          {answerText}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function DocumentationControl() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPairIndex, setSelectedPairIndex] = useState<number | null>(null);
  const [adminReferralScore, setAdminReferralScore] = useState("");
  const [adminMedScore, setAdminMedScore] = useState("");
  const [adminFeedback, setAdminFeedback] = useState("");
  const [gradingAI, setGradingAI] = useState(false);
  const [gradingAllAI, setGradingAllAI] = useState(false);
  const [gradingAllProgress, setGradingAllProgress] = useState({ done: 0, total: 0 });

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

  // Get answer key fields for a specific clinical case
  const getReferralKeyFields = (caseId?: string): FormField[] => {
    if (!referralAnswerKey) return [];
    const content = referralAnswerKey.content_json;
    if (content?.case_answers) {
      if (caseId && content.case_answers[caseId]) return content.case_answers[caseId];
      const firstKey = Object.keys(content.case_answers)[0];
      return firstKey ? content.case_answers[firstKey] : [];
    }
    return Array.isArray(content) ? content : [];
  };

  const getMedKeyContent = (caseId?: string): MedFormContent | null => {
    if (!medAnswerKey) return null;
    const content = medAnswerKey.content_json;
    if (content?.case_answers) {
      if (caseId && content.case_answers[caseId]) return content.case_answers[caseId];
      const firstKey = Object.keys(content.case_answers)[0];
      return firstKey ? content.case_answers[firstKey] : null;
    }
    return content as MedFormContent;
  };

  const medContent: MedFormContent | null = medForm ? (medForm.content_json as MedFormContent) : null;

  // Get unique pair indices with responses
  const pairIndicesWithResponses = useMemo(() => {
    const set = new Set<number>();
    responses.forEach(r => set.add(r.pair_index));
    return Array.from(set).sort((a, b) => a - b);
  }, [responses]);

  // When duplicates exist for the same pair+form, prefer the row that has AI feedback/score; fallback to the most recent
  const findBestResponse = (pairIdx: number | null, formId: string | undefined) => {
    if (pairIdx === null || !formId) return undefined;
    const matches = responses.filter(r => r.pair_index === pairIdx && r.form_id === formId);
    if (matches.length === 0) return undefined;
    const withAi = matches.filter(r => r.ai_feedback_json != null || r.ai_score != null);
    const pool = withAi.length > 0 ? withAi : matches;
    return pool.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  };

  const selectedReferralResp = findBestResponse(selectedPairIndex, referralForm?.id);
  const selectedMedResp = findBestResponse(selectedPairIndex, medForm?.id);

  const handleSelectPair = (pairIdx: number) => {
    setSelectedPairIndex(pairIdx);
    const refResp = findBestResponse(pairIdx, referralForm?.id);
    const mResp = findBestResponse(pairIdx, medForm?.id);
    setAdminReferralScore(refResp?.admin_score != null ? String(refResp.admin_score) : "");
    setAdminMedScore(mResp?.admin_score != null ? String(mResp.admin_score) : "");
    setAdminFeedback(refResp?.admin_feedback || mResp?.admin_feedback || "");
  };

  // Round to 1 decimal place to avoid floating-point inconsistencies (e.g. 4 + 3 = 6.999... displayed as 6,2 due to stale state)
  const round1 = (n: number) => Math.round(n * 10) / 10;

  const parseScore = (v: string | number | null | undefined) => {
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    if (!Number.isFinite(n)) return null;
    return round1(Math.min(Math.max(n, 0), 5));
  };

  const getScoreSummary = (refScore: string | number | null | undefined, medScore: string | number | null | undefined) => {
    const referral = parseScore(refScore);
    const medication = parseScore(medScore);
    return {
      referral,
      medication,
      total: round1((referral ?? 0) + (medication ?? 0)),
      isComplete: referral !== null && medication !== null,
      hasAny: referral !== null || medication !== null,
    };
  };

  const saveAdminEvaluation = async () => {
    // Save referral score
    if (selectedReferralResp) {
      await supabase.from("documentation_responses").update({
        admin_score: parseScore(adminReferralScore),
        admin_feedback: adminFeedback || null,
      }).eq("id", selectedReferralResp.id);
    }

    if (selectedMedResp) {
      await supabase.from("documentation_responses").update({
        admin_score: parseScore(adminMedScore),
        admin_feedback: adminFeedback || null,
      }).eq("id", selectedMedResp.id);
    }
    toast({ title: "Avaliação salva!" });
    queryClient.invalidateQueries({ queryKey: ["documentation-responses", roomId] });
  };

  const gradeWithAI = async () => {
    if (selectedPairIndex === null) return;
    setGradingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("grade-documentation", {
        body: {
          room_id: roomId,
          pair_index: selectedPairIndex,
          referral_response: selectedReferralResp ? { id: selectedReferralResp.id, answers_json: selectedReferralResp.answers_json, clinical_case_id: selectedReferralResp.clinical_case_id } : null,
          referral_answer_key: referralAnswerKey?.content_json || null,
          referral_fields: referralForm?.content_json || [],
          med_response: selectedMedResp ? { id: selectedMedResp.id, answers_json: selectedMedResp.answers_json, clinical_case_id: selectedMedResp.clinical_case_id } : null,
          med_answer_key: medAnswerKey?.content_json || null,
          med_columns: medContent?.columns || [],
        },
      });
      if (error) throw error;
      toast({ title: "Correção concluída!" });
      queryClient.invalidateQueries({ queryKey: ["documentation-responses", roomId] });
    } catch (err: any) {
      toast({ title: "Erro na correção", description: err.message, variant: "destructive" });
    } finally {
      setGradingAI(false);
    }
  };

  const gradeAllWithAI = async () => {
    const pairsToGrade = pairIndicesWithResponses;
    if (pairsToGrade.length === 0) {
      toast({ title: "Sem respostas para corrigir", variant: "destructive" });
      return;
    }
    setGradingAllAI(true);
    setGradingAllProgress({ done: 0, total: pairsToGrade.length });
    let success = 0;
    let failed = 0;
    for (let i = 0; i < pairsToGrade.length; i++) {
      const pairIdx = pairsToGrade[i];
      const refResp = findBestResponse(pairIdx, referralForm?.id);
      const mResp = findBestResponse(pairIdx, medForm?.id);
      if (!refResp && !mResp) continue;
      try {
        const { error } = await supabase.functions.invoke("grade-documentation", {
          body: {
            room_id: roomId,
            pair_index: pairIdx,
            referral_response: refResp ? { id: refResp.id, answers_json: refResp.answers_json, clinical_case_id: refResp.clinical_case_id } : null,
            referral_answer_key: referralAnswerKey?.content_json || null,
            referral_fields: referralForm?.content_json || [],
            med_response: mResp ? { id: mResp.id, answers_json: mResp.answers_json, clinical_case_id: mResp.clinical_case_id } : null,
            med_answer_key: medAnswerKey?.content_json || null,
            med_columns: medContent?.columns || [],
          },
        });
        if (error) throw error;
        success++;
      } catch (err: any) {
        console.error(`Erro ao corrigir dupla ${pairIdx}:`, err);
        failed++;
      }
      setGradingAllProgress({ done: i + 1, total: pairsToGrade.length });
      // Pequeno delay para evitar rate limiting
      await new Promise(r => setTimeout(r, 800));
    }
    setGradingAllAI(false);
    queryClient.invalidateQueries({ queryKey: ["documentation-responses", roomId] });
    toast({
      title: "Correção em lote concluída",
      description: `${success} dupla(s) corrigida(s)${failed > 0 ? `, ${failed} falha(s)` : ""}.`,
      variant: failed > 0 ? "destructive" : "default",
    });
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

  const computeTotal = () => {
    const summary = getScoreSummary(adminReferralScore, adminMedScore);
    return {
      ref: summary.referral,
      med: summary.medication,
      total: summary.total.toFixed(1),
    };
  };

  const reopenPairSubmission = async (pairIdx: number) => {
    if (!roomId) return;
    try {
      // Clear submitted_at on all responses for this pair so the student form unlocks.
      // Existing answers stay so students can adjust instead of starting over.
      const { error: respErr } = await supabase
        .from("documentation_responses")
        .update({ submitted_at: null })
        .eq("room_id", roomId)
        .eq("pair_index", pairIdx);
      if (respErr) throw respErr;

      // Reset participants in this pair back to "ready" so they're not marked as done.
      await supabase
        .from("documentation_participants")
        .update({ status: "ready" })
        .eq("room_id", roomId)
        .eq("pair_index", pairIdx);

      // If the room was concluded, reactivate it so students can log back in.
      if (room?.status === "completed") {
        await supabase.from("documentation_rooms").update({ status: "active" }).eq("id", roomId);
        queryClient.invalidateQueries({ queryKey: ["documentation-room", roomId] });
      }

      queryClient.invalidateQueries({ queryKey: ["documentation-responses", roomId] });
      queryClient.invalidateQueries({ queryKey: ["documentation-participants", roomId] });
      toast({
        title: "Envio reaberto",
        description: "A dupla pode entrar novamente com PIN e e-mail para ajustar e reenviar.",
      });
    } catch (err: any) {
      toast({ title: "Erro ao reabrir envio", description: err.message, variant: "destructive" });
    }
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

      {/* Report Generator */}
      {pairIndicesWithResponses.length > 0 && (
        <SimulationReportGenerator
          stageName="Documentação"
          stageType="documentacao"
          roomTitle={room?.title || ""}
          pairs={pairIndicesWithResponses.map(pairIdx => {
            const pair = pairs[pairIdx] || [];
            const refResp = findBestResponse(pairIdx, referralForm?.id);
            const mResp = findBestResponse(pairIdx, medForm?.id);

            const sections: { title: string; items: { label: string; value: string; score?: string }[] }[] = [];
            
            if (refResp) {
              sections.push({
                title: "Encaminhamento",
                items: referralFields.map(f => ({
                  label: f.label,
                  value: String((refResp.answers_json as any)?.[f.id] || "—"),
                  score: (f.max_score || 0) > 0 ? `${f.max_score} pts` : undefined,
                })),
              });
            }
            if (mResp && medContent?.columns) {
              const medItems = medContent.columns.map(col => ({
                label: col.label,
                value: String((mResp.answers_json as any)?.rows?.[0]?.[col.id] || (mResp.answers_json as any)?.[col.id] || "—"),
              }));
              sections.push({
                title: "Quadro Resumo de Medicamentos",
                items: medItems,
              });
            }

            const adminSummary = getScoreSummary(refResp?.admin_score, mResp?.admin_score);
            const aiSummary = getScoreSummary(refResp?.ai_score, mResp?.ai_score);

            let aiFeedbackText: string | null = null;
            if (refResp?.ai_feedback_json || mResp?.ai_feedback_json) {
              const parts: string[] = [];
              if (refResp?.ai_feedback_json) {
                if (typeof refResp.ai_feedback_json === "object" && !Array.isArray(refResp.ai_feedback_json)) {
                  parts.push("ENCAMINHAMENTO:\n" + Object.entries(refResp.ai_feedback_json as Record<string, any>).map(([k, v]) => {
                    const field = referralFields.find(f => f.id === k);
                    return `${field?.label || k}: ${typeof v === "object" ? `Nota ${(v as any).score || 0} — ${(v as any).feedback || ""}` : v}`;
                  }).join("\n"));
                }
              }
              if (mResp?.ai_feedback_json) {
                parts.push("QUADRO RESUMO:\n" + (typeof mResp.ai_feedback_json === "string" ? mResp.ai_feedback_json : (mResp.ai_feedback_json as any)?.feedback || JSON.stringify(mResp.ai_feedback_json)));
              }
              aiFeedbackText = parts.join("\n\n");
            }

            return {
              pairIndex: pairIdx,
              students: pair.map((p: any) => ({ name: p.student_name, email: p.student_email || undefined })),
              score: adminSummary.isComplete ? adminSummary.total : aiSummary.total,
              maxScore: 10,
              details: [],
              sections,
              aiScore: aiSummary.isComplete ? aiSummary.total : null,
              adminScore: adminSummary.isComplete ? adminSummary.total : null,
              aiFeedback: aiFeedbackText,
              adminFeedback: refResp?.admin_feedback || mResp?.admin_feedback || null,
            } as PairReport;
          })}
        />
      )}

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
              const pairResponses = responses.filter(r => r.pair_index === pairIdx);
              const hasResponse = pairResponses.length > 0;
              const hasSubmitted = pairResponses.some(r => r.submitted_at);
              return (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{pair.some((p: any) => p.pair_position === "S") ? "Individual" : `Dupla ${pairIdx + 1}`}</CardTitle>
                      <Badge variant={hasSubmitted ? "default" : hasResponse ? "secondary" : "outline"}>
                        {hasSubmitted ? "Enviou" : hasResponse ? "Reaberto" : pair.every(p => p.status === "ready") ? "Pronto" : "Aguardando"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {pair.map((p: any) => <p key={p.id} className="text-sm">{p.student_name}</p>)}
                    {hasSubmitted && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full mt-2">
                            <Unlock className="h-3.5 w-3.5 mr-1" />Reabrir envio
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reabrir envio desta dupla?</AlertDialogTitle>
                            <AlertDialogDescription>
                              A dupla poderá entrar novamente com o PIN e o e-mail para ajustar e reenviar a documentação.
                              As respostas atuais serão mantidas como rascunho até o novo envio. Se a sala estiver concluída, ela será reativada.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => reopenPairSubmission(pairIdx)}>Reabrir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {room?.status === "active" && responses.length > 0 && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <p className="font-medium text-sm">Encerrar atividade</p>
                <p className="text-xs text-muted-foreground">Todas as duplas finalizaram? Conclua a sala.</p>
              </div>
              <Button
                variant="default"
                onClick={async () => {
                  await supabase.from("documentation_rooms").update({ status: "completed" }).eq("id", roomId!);
                  queryClient.invalidateQueries({ queryKey: ["documentation-room", roomId] });
                  toast({ title: "Sala concluída!" });
                }}
              >
                <Lock className="h-4 w-4 mr-1" />Concluir Sala
              </Button>
            </div>
          )}

          {room?.status === "completed" && (
            <Badge variant="outline" className="text-sm"><CheckCircle className="h-4 w-4 mr-1" />Sala concluída</Badge>
          )}
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          {!pairIndicesWithResponses.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma resposta recebida ainda.</p>
          ) : (
            pairIndicesWithResponses.map(pairIdx => {
              const refResp = findBestResponse(pairIdx, referralForm?.id);
              const mResp = findBestResponse(pairIdx, medForm?.id);
              const caseData = clinicalCases.find(c => c.id === (refResp || mResp)?.clinical_case_id);
              const caseKeyFields = getReferralKeyFields(caseData?.id);
              const caseMedKey = getMedKeyContent(caseData?.id);

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
                        <h4 className="font-medium text-sm mb-3 flex items-center gap-1"><FileText className="h-4 w-4" />Encaminhamento (máx 5,0 pts)</h4>
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
                            {caseKeyFields.length ? caseKeyFields.map((field: any) => (
                              <CollapsibleAnswerField key={field.id} field={field} />
                            )) : <p className="text-sm text-muted-foreground">Sem espelho cadastrado.</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Medication summary side-by-side */}
                    {mResp && medContent && (
                      <div>
                        <h4 className="font-medium text-sm mb-3 flex items-center gap-1"><Table2 className="h-4 w-4" />Quadro Resumo (máx 5,0 pts)</h4>
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
                            {caseMedKey?.answer_rows?.length ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm border">
                                  <thead><tr>{(caseMedKey.columns || medContent.columns).map(c => <th key={c.id} className="border p-2 text-left bg-green-50 dark:bg-green-950">{c.label}</th>)}</tr></thead>
                                  <tbody>
                                    {caseMedKey.answer_rows.map((row, rIdx) => (
                                      <tr key={rIdx}>{(caseMedKey.columns || medContent.columns).map(c => <td key={c.id} className="border p-2 bg-green-50 dark:bg-green-950">{row[c.id] || "—"}</td>)}</tr>
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
                        {mResp?.ai_feedback_json && (
                          <div className="mb-2">
                            <p className="text-xs font-semibold">Quadro Resumo:</p>
                            <p className="text-sm">{typeof mResp.ai_feedback_json === "string" ? mResp.ai_feedback_json : (mResp.ai_feedback_json as any)?.feedback || JSON.stringify(mResp.ai_feedback_json)}</p>
                          </div>
                        )}
                        <div className="flex gap-4 mt-2">
                          {refResp?.ai_score != null && <p className="font-medium text-sm">Encaminhamento: {refResp.ai_score}/5,0</p>}
                          {mResp?.ai_score != null && <p className="font-medium text-sm">Quadro: {mResp.ai_score}/5,0</p>}
                          {getScoreSummary(refResp?.ai_score, mResp?.ai_score).isComplete && (
                            <p className="font-bold text-sm">Total IA: {getScoreSummary(refResp?.ai_score, mResp?.ai_score).total.toFixed(1)}/10,0</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Admin scores summary */}
                    {getScoreSummary(refResp?.admin_score, mResp?.admin_score).isComplete && (
                      <div className="flex gap-4 p-2 bg-muted rounded">
                        {refResp?.admin_score != null && <Badge>Encaminhamento: {refResp.admin_score}/5,0</Badge>}
                        {mResp?.admin_score != null && <Badge>Quadro: {mResp.admin_score}/5,0</Badge>}
                        <Badge variant="default" className="font-bold">
                          Total: {getScoreSummary(refResp?.admin_score, mResp?.admin_score).total.toFixed(1)}/10,0
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="grading" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border">
            <div>
              <p className="text-sm font-medium">Correção automática em lote</p>
              <p className="text-xs text-muted-foreground">
                Aplica a correção da IA para todas as duplas com respostas enviadas.
                {gradingAllAI && ` (${gradingAllProgress.done}/${gradingAllProgress.total})`}
              </p>
            </div>
            <Button onClick={gradeAllWithAI} disabled={gradingAllAI || gradingAI || pairIndicesWithResponses.length === 0}>
              {gradingAllAI ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Bot className="h-4 w-4 mr-1" />}
              {gradingAllAI ? `Corrigindo ${gradingAllProgress.done}/${gradingAllProgress.total}...` : "Corrigir todas com IA"}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Selecionar Dupla</h3>
              {pairIndicesWithResponses.map(pairIdx => {
                const refR = findBestResponse(pairIdx, referralForm?.id);
                const mR = findBestResponse(pairIdx, medForm?.id);
                const adminSummary = getScoreSummary(refR?.admin_score, mR?.admin_score);
                const aiSummary = getScoreSummary(refR?.ai_score, mR?.ai_score);

                return (
                  <button key={pairIdx} onClick={() => handleSelectPair(pairIdx)} className={`w-full text-left p-3 rounded border transition-colors ${selectedPairIndex === pairIdx ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                    <p className="text-sm font-medium">{pairNames(pairIdx)}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {aiSummary.hasAny && <Badge variant="outline" className="text-xs">IA: {aiSummary.total.toFixed(1)}</Badge>}
                      {adminSummary.hasAny && <Badge className="text-xs">Admin: {adminSummary.total.toFixed(1)}</Badge>}
                    </div>
                  </button>
                );
              })}
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
                        <h4 className="text-sm font-medium flex items-center gap-1"><Bot className="h-4 w-4" />Correção da IA — Encaminhamento</h4>
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
                        {selectedReferralResp.ai_score != null && <p className="font-medium">Nota IA Encaminhamento: {selectedReferralResp.ai_score}/5,0</p>}
                      </div>
                    )}

                    {selectedMedResp?.ai_feedback_json && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-1"><Bot className="h-4 w-4" />Correção da IA — Quadro Resumo</h4>
                        <p className="text-sm">{typeof selectedMedResp.ai_feedback_json === "string" ? selectedMedResp.ai_feedback_json : (selectedMedResp.ai_feedback_json as any)?.feedback || JSON.stringify(selectedMedResp.ai_feedback_json)}</p>
                        {selectedMedResp.ai_score != null && <p className="font-medium">Nota IA Quadro: {selectedMedResp.ai_score}/5,0</p>}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nota Encaminhamento (máx 5,0)</Label>
                        <Input
                          type="number"
                          value={adminReferralScore}
                          onChange={e => setAdminReferralScore(e.target.value)}
                          placeholder="0 - 5"
                          max={5}
                          min={0}
                          step={0.1}
                        />
                      </div>
                      <div>
                        <Label>Nota Quadro Resumo (máx 5,0)</Label>
                        <Input
                          type="number"
                          value={adminMedScore}
                          onChange={e => setAdminMedScore(e.target.value)}
                          placeholder="0 - 5"
                          max={5}
                          min={0}
                          step={0.1}
                        />
                      </div>
                    </div>

                    {(() => {
                      const t = computeTotal();
                      return (
                        <div className="p-3 bg-muted rounded space-y-1">
                          <div className="flex gap-3 text-sm">
                            <span>Encaminhamento: <strong>{t.ref != null ? t.ref.toFixed(1) : "—"}</strong>/5,0</span>
                            <span>Quadro: <strong>{t.med != null ? t.med.toFixed(1) : "—"}</strong>/5,0</span>
                          </div>
                          <p className="text-sm font-bold">Nota Total: {t.total}/10,0</p>
                        </div>
                      );
                    })()}

                    <div>
                      <Label>Feedback do Admin</Label>
                      <Textarea value={adminFeedback} onChange={e => setAdminFeedback(e.target.value)} rows={4} placeholder="Feedback para a dupla..." />
                    </div>
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
