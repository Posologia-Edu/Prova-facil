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
import { dentistryModuleLabel, type DentistryModuleType } from "@/lib/dentistry-modules";

type FormField = { id: string; label: string; type: string; options?: string[]; max_score?: number };

function CollapsibleAnswerField({ field }: { field: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const answerText = field.options?.join(", ") || "Sem conteúdo";
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-2">
      <div className="text-xs font-medium text-muted-foreground uppercase">{field.label} ({field.max_score || 0} pts)</div>
      <CollapsibleTrigger asChild><button className="w-full text-left text-sm bg-green-50 dark:bg-green-950 p-2 rounded border border-green-200 dark:border-green-800 flex items-center justify-between hover:bg-green-100 dark:hover:bg-green-900 transition-colors"><span>{isOpen ? "Ocultar espelho" : "Ver espelho"}</span>{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button></CollapsibleTrigger>
      <CollapsibleContent><div className="text-sm bg-green-50 dark:bg-green-950 p-3 rounded-b border border-t-0 border-green-200 dark:border-green-800">{answerText}</div></CollapsibleContent>
    </Collapsible>
  );
}

export default function DentistryControl() {
  const { roomId, moduleType } = useParams<{ roomId: string; moduleType: string }>();
  const mt = (moduleType || "anamnese_odontologica") as DentistryModuleType;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPairIndex, setSelectedPairIndex] = useState<number | null>(null);
  const [adminScore, setAdminScore] = useState("");
  const [adminFeedback, setAdminFeedback] = useState("");
  const [gradingAI, setGradingAI] = useState(false);

  const { data: room } = useQuery({ queryKey: ["dentistry-room", roomId], queryFn: async () => { const { data, error } = await supabase.from("dentistry_rooms").select("*").eq("id", roomId!).single(); if (error) throw error; return data; }, enabled: !!roomId });
  const { data: participants = [] } = useQuery({ queryKey: ["dentistry-participants", roomId], queryFn: async () => { const { data, error } = await supabase.from("dentistry_participants").select("*").eq("room_id", roomId!).order("pair_index", { ascending: true }); if (error) throw error; return data; }, enabled: !!roomId, refetchInterval: 5000 });
  const { data: responses = [] } = useQuery({ queryKey: ["dentistry-responses", roomId], queryFn: async () => { const { data, error } = await supabase.from("dentistry_responses").select("*").eq("room_id", roomId!); if (error) throw error; return data as any[]; }, enabled: !!roomId, refetchInterval: 5000 });
  const { data: forms = [] } = useQuery({ queryKey: ["dentistry-forms", roomId], queryFn: async () => { const { data, error } = await supabase.from("dentistry_forms").select("*").eq("room_id", roomId!); if (error) throw error; return data as any[]; }, enabled: !!roomId });
  const { data: clinicalCases = [] } = useQuery({ queryKey: ["dentistry-clinical-cases", roomId], queryFn: async () => { const { data, error } = await supabase.from("dentistry_clinical_cases").select("*").eq("room_id", roomId!).order("position", { ascending: true }); if (error) throw error; return data; }, enabled: !!roomId });

  const students = participants.filter(p => p.participant_role === "student");
  const pairs = useMemo(() => { const map: Record<number, any[]> = {}; students.forEach(s => { if (s.pair_index >= 0) { map[s.pair_index] = map[s.pair_index] || []; map[s.pair_index].push(s); } }); return map; }, [students]);

  const standardForm = forms.find((f: any) => f.form_type === "standard");
  const answerKeyForm = forms.find((f: any) => f.form_type === "answer_key");
  const standardFields: FormField[] = standardForm ? (Array.isArray(standardForm.content_json) ? standardForm.content_json : []) : [];

  const getAnswerKeyFields = (caseId?: string): FormField[] => {
    if (!answerKeyForm) return [];
    const content = answerKeyForm.content_json;
    if (content?.case_answers) { if (caseId && content.case_answers[caseId]) return content.case_answers[caseId]; const firstKey = Object.keys(content.case_answers)[0]; return firstKey ? content.case_answers[firstKey] : []; }
    return Array.isArray(content) ? content : [];
  };

  const pairIndicesWithResponses = useMemo(() => { const set = new Set<number>(); responses.forEach(r => set.add(r.pair_index)); return Array.from(set).sort((a, b) => a - b); }, [responses]);
  const selectedResp = responses.find(r => r.pair_index === selectedPairIndex && r.form_id === standardForm?.id);

  const handleSelectPair = (pairIdx: number) => { setSelectedPairIndex(pairIdx); const resp = responses.find(r => r.pair_index === pairIdx && r.form_id === standardForm?.id); setAdminScore(resp?.admin_score != null ? String(resp.admin_score) : ""); setAdminFeedback(resp?.admin_feedback || ""); };

  const saveAdminEvaluation = async () => { if (selectedResp) await supabase.from("dentistry_responses").update({ admin_score: adminScore ? Number(adminScore) : null, admin_feedback: adminFeedback || null }).eq("id", selectedResp.id); toast({ title: "Avaliação salva!" }); queryClient.invalidateQueries({ queryKey: ["dentistry-responses", roomId] }); };

  const gradeWithAI = async () => {
    if (selectedPairIndex === null) return; setGradingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("grade-dentistry", { body: { room_id: roomId, module_type: mt, pair_index: selectedPairIndex, response: selectedResp ? { id: selectedResp.id, answers_json: selectedResp.answers_json, clinical_case_id: selectedResp.clinical_case_id } : null, answer_key: answerKeyForm?.content_json || null, form_fields: standardForm?.content_json || [] } });
      if (error) throw error;
      toast({ title: "Correção concluída!" }); queryClient.invalidateQueries({ queryKey: ["dentistry-responses", roomId] });
      if (data?.score != null) setAdminScore(String(data.score)); if (data?.feedback) setAdminFeedback(data.feedback);
    } catch (err: any) { toast({ title: "Erro na correção", description: err.message, variant: "destructive" }); }
    finally { setGradingAI(false); }
  };

  const pairNames = (pairIdx: number) => { const pair = pairs[pairIdx]; if (!pair) return `Dupla ${pairIdx + 1}`; return pair.map(p => p.student_name).join(" & "); };
  const renderAnswerValue = (value: any) => { if (Array.isArray(value)) return value.join(", "); if (typeof value === "object") return JSON.stringify(value); return String(value || "—"); };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(`/dentistry/${mt}/editor/${roomId}`)}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
        <div><div className="flex items-center gap-2"><Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-500 border-cyan-500/30">{dentistryModuleLabel[mt]}</Badge><h1 className="text-xl font-bold">{room?.title} — Controle</h1></div><p className="text-sm text-muted-foreground">PIN: {room?.access_code}</p></div>
      </div>
      <Tabs defaultValue="participants">
        <TabsList><TabsTrigger value="participants"><Users className="h-4 w-4 mr-1" />Participantes</TabsTrigger><TabsTrigger value="responses"><FileText className="h-4 w-4 mr-1" />Respostas</TabsTrigger><TabsTrigger value="grading"><BarChart3 className="h-4 w-4 mr-1" />Avaliação</TabsTrigger></TabsList>
        <TabsContent value="participants" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{Object.entries(pairs).map(([idx, pair]) => { const pairIdx = Number(idx); const hasResponse = responses.some(r => r.pair_index === pairIdx); const isSolo = pair.some((p: any) => p.pair_position === "S"); return (<Card key={idx}><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm">{isSolo ? "Individual" : `Dupla ${pairIdx + 1}`}</CardTitle><Badge variant={hasResponse ? "default" : "outline"}>{hasResponse ? "Enviou" : "Aguardando"}</Badge></div></CardHeader><CardContent>{pair.map((p: any) => <p key={p.id} className="text-sm">{p.student_name}</p>)}</CardContent></Card>); })}</div>
          {room?.status === "active" && responses.length > 0 && (<div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50"><div><p className="font-medium text-sm">Encerrar atividade</p></div><Button variant="default" onClick={async () => { await supabase.from("dentistry_rooms").update({ status: "completed" }).eq("id", roomId!); queryClient.invalidateQueries({ queryKey: ["dentistry-room", roomId] }); toast({ title: "Sala concluída!" }); }}><Lock className="h-4 w-4 mr-1" />Concluir Sala</Button></div>)}
          {room?.status === "completed" && <Badge variant="outline" className="text-sm"><CheckCircle className="h-4 w-4 mr-1" />Sala concluída</Badge>}
        </TabsContent>
        <TabsContent value="responses" className="space-y-4">
          {!pairIndicesWithResponses.length ? <p className="text-sm text-muted-foreground">Nenhuma resposta recebida ainda.</p> : pairIndicesWithResponses.map(pairIdx => {
            const resp = responses.find(r => r.pair_index === pairIdx && r.form_id === standardForm?.id); const caseData = clinicalCases.find(c => c.id === resp?.clinical_case_id); const caseKeyFields = getAnswerKeyFields(caseData?.id);
            return (<Card key={pairIdx}><CardHeader><CardTitle className="text-base">{pairNames(pairIdx)}</CardTitle>{caseData && <p className="text-sm text-muted-foreground">Caso: {caseData.title}</p>}</CardHeader><CardContent className="space-y-4">
              {resp && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><p className="text-xs font-semibold text-muted-foreground mb-2">Resposta da Dupla</p>{standardFields.map(field => (<div key={field.id} className="mb-2"><p className="text-xs font-medium text-muted-foreground">{field.label} ({field.max_score || 0} pts)</p><p className="text-sm bg-muted p-2 rounded">{renderAnswerValue((resp.answers_json as any)?.[field.id])}</p></div>))}</div><div><p className="text-xs font-semibold text-muted-foreground mb-2">Espelho</p>{caseKeyFields.length ? caseKeyFields.map((f: any) => <CollapsibleAnswerField key={f.id} field={f} />) : <p className="text-sm text-muted-foreground">Sem espelho cadastrado.</p>}</div></div>)}
              {resp?.ai_feedback_json && (<div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800"><h4 className="text-sm font-medium mb-2 flex items-center gap-1"><Bot className="h-4 w-4" />Feedback da IA</h4><p className="text-sm">{typeof resp.ai_feedback_json === "string" ? resp.ai_feedback_json : (resp.ai_feedback_json as any)?.feedback || JSON.stringify(resp.ai_feedback_json)}</p>{resp.ai_score != null && <p className="font-medium text-sm mt-2">Nota IA: {resp.ai_score}/10,0</p>}</div>)}
              {resp?.admin_score != null && <Badge variant="default" className="font-bold">Nota Professor: {resp.admin_score}/10,0</Badge>}
            </CardContent></Card>);
          })}
        </TabsContent>
        <TabsContent value="grading" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2"><h3 className="font-medium text-sm">Selecionar Dupla</h3>{pairIndicesWithResponses.map(pairIdx => { const resp = responses.find(r => r.pair_index === pairIdx && r.form_id === standardForm?.id); return (<Button key={pairIdx} variant={selectedPairIndex === pairIdx ? "default" : "outline"} className="w-full justify-start" size="sm" onClick={() => handleSelectPair(pairIdx)}>{pairNames(pairIdx)}{resp?.admin_score != null && <Badge className="ml-auto" variant="secondary">{resp.admin_score}</Badge>}</Button>); })}</div>
            <div className="md:col-span-3 space-y-4">{selectedPairIndex !== null ? (<Card><CardContent className="p-4 space-y-4"><div><Label>Nota do Professor (0-10)</Label><Input type="number" value={adminScore} onChange={e => setAdminScore(e.target.value)} min={0} max={10} step={0.5} /></div><div><Label>Feedback</Label><Textarea value={adminFeedback} onChange={e => setAdminFeedback(e.target.value)} rows={3} /></div><div className="flex gap-2"><Button onClick={saveAdminEvaluation}>Salvar Avaliação</Button><Button variant="outline" onClick={gradeWithAI} disabled={gradingAI}>{gradingAI ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Corrigindo...</> : <><Bot className="h-4 w-4 mr-1" />Corrigir com IA</>}</Button></div></CardContent></Card>) : <p className="text-sm text-muted-foreground">Selecione uma dupla para avaliar.</p>}</div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
