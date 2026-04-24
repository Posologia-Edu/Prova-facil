import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Gavel, FileText, ClipboardList, Users } from "lucide-react";
import FormRenderer from "@/components/forms/FormRenderer";
import type { FormField } from "@/components/forms/types";
import { LegalProcessRenderer } from "@/components/mock-trial/LegalProcessRenderer";

const PHASE_LABELS: Record<string, string> = {
  pending: "Aguardando início",
  announcement: "Anúncio do Caso",
  prosecution: "Fala da Acusação",
  defense: "Fala da Defesa",
  jury_questions: "Perguntas do Júri",
  deliberation: "Deliberação",
  verdict: "Veredito",
  finished: "Sessão Finalizada",
};

export default function MockTrialStudent() {
  const { accessCode } = useParams<{ accessCode: string }>();
  const [studentEmail, setStudentEmail] = useState(() => sessionStorage.getItem("mt_email") || "");
  const [studentName, setStudentName] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const [trial, setTrial] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [myStudent, setMyStudent] = useState<any>(null);
  const [myGroup, setMyGroup] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");

  // Auto-join from StudentAuth redirect
  useEffect(() => {
    const savedPin = sessionStorage.getItem("mt_pin");
    const savedEmail = sessionStorage.getItem("mt_email");
    if (savedPin && savedEmail && !authenticated) {
      sessionStorage.removeItem("mt_pin");
      setStudentEmail(savedEmail);
      setTimeout(() => authenticateWithEmail(savedEmail), 100);
    }
  }, []);

  const authenticateWithEmail = async (email: string) => {
    if (!email.trim()) {
      toast.error("Informe seu email");
      return;
    }

    // Find trial by access code
    const { data: trialData } = await supabase
      .from("mock_trials")
      .select("*")
      .eq("access_code", accessCode!)
      .single();
    if (!trialData) { toast.error("Júri não encontrado"); return; }
    setTrial(trialData);

    const { data: grps } = await supabase.from("mock_trial_groups").select("*").eq("mock_trial_id", trialData.id).order("group_number");
    setGroups(grps || []);

    if (!grps || grps.length === 0) { toast.error("Nenhum grupo encontrado"); return; }

    const groupIds = grps.map(g => g.id);
    const { data: studs } = await supabase.from("mock_trial_students").select("*").in("group_id", groupIds);

    const normalizeEmail = (e: string) => e.trim().toLowerCase();
    const found = studs?.find(s => normalizeEmail(s.student_email || "") === normalizeEmail(email));

    if (!found) {
      toast.error("Email não encontrado neste júri simulado");
      return;
    }

    setMyStudent(found);
    setStudentName(found.student_name);
    const group = grps.find(g => g.id === found.group_id);
    setMyGroup(group);

    // Load cases, assignments, sessions, forms
    const { data: cs } = await supabase.from("mock_trial_cases").select("*").eq("mock_trial_id", trialData.id).order("position");
    setCases(cs || []);
    if (cs && cs.length > 0) setSelectedCaseId(cs[0].id);

    const caseIds = (cs || []).map(c => c.id);
    if (caseIds.length > 0) {
      const { data: assigns } = await supabase.from("mock_trial_assignments").select("*").in("case_id", caseIds);
      setAssignments(assigns || []);

      const { data: sess } = await supabase.from("mock_trial_sessions").select("*").in("case_id", caseIds);
      setSessions(sess || []);
    }

    const { data: frms } = await supabase.from("mock_trial_forms").select("*").eq("mock_trial_id", trialData.id);
    setForms(frms || []);

    setAuthenticated(true);
  };

  const authenticate = async () => {
    await authenticateWithEmail(studentEmail);
  };

  // Realtime for sessions
  useEffect(() => {
    if (!authenticated || cases.length === 0) return;
    const caseIds = cases.map(c => c.id);
    const channel = supabase
      .channel("student-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "mock_trial_sessions" }, (payload) => {
        const newRow = payload.new as any;
        if (caseIds.includes(newRow?.case_id)) {
          setSessions(prev => {
            const existing = prev.findIndex(s => s.id === newRow.id);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = newRow;
              return updated;
            }
            return [...prev, newRow];
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authenticated, cases]);

  // Get my role for a specific case
  const getMyRole = (caseId: string) => {
    if (!myGroup) return null;
    const assignment = assignments.find(a => a.case_id === caseId && a.group_id === myGroup.id);
    return assignment?.role || null;
  };

  const roleLabels: Record<string, string> = { prosecution: "Acusação", defense: "Defesa", jury: "Júri" };

  const selectedCase = cases.find(c => c.id === selectedCaseId);
  const selectedSession = sessions.find(s => s.case_id === selectedCaseId);
  const myRole = getMyRole(selectedCaseId);
  const myForms = forms.filter(f => f.target_role === myRole);

  // Characters for my role in this case
  const myCharacters = selectedCase?.characters_json
    ? (selectedCase.characters_json as any[]).filter((ch: any) => ch.side === myRole)
    : [];

  const submitResponse = async (formId: string, answers: Record<string, any>) => {
    if (!selectedSession || !myGroup) return;
    const { error } = await supabase.from("mock_trial_responses").insert({
      form_id: formId,
      session_id: selectedSession.id,
      group_id: myGroup.id,
      student_email: myStudent?.student_email || studentEmail,
      student_name: myStudent?.student_name || studentName,
      response_json: answers,
    });
    if (error) toast.error("Erro ao enviar resposta");
    else toast.success("Resposta enviada!");
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Gavel className="h-10 w-10 text-primary mx-auto mb-2" />
            <CardTitle>Júri Simulado - Portal do Aluno</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Seu Email</Label>
              <Input value={studentEmail} onChange={e => setStudentEmail(e.target.value)} placeholder="email@exemplo.com" type="email" />
            </div>
            <Button onClick={authenticate} className="w-full">Entrar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Gavel className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">{trial?.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{studentName}</span>
            <span>•</span>
            <span>{myGroup?.name}</span>
            {myRole && (
              <>
                <span>•</span>
                <Badge variant={myRole === "prosecution" ? "destructive" : myRole === "defense" ? "default" : "secondary"}>
                  {roleLabels[myRole] || myRole}
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Session Status */}
      {selectedSession && (
        <Card className="border-primary/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{PHASE_LABELS[selectedSession.status] || selectedSession.status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Case selector for multiple cases */}
      {cases.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {cases.map(c => (
            <Button key={c.id} variant={selectedCaseId === c.id ? "default" : "outline"} size="sm" onClick={() => setSelectedCaseId(c.id)}>
              {c.title}
            </Button>
          ))}
        </div>
      )}

      {!myRole ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Seu grupo não participa deste processo</h3>
            <p className="text-muted-foreground">Selecione outro processo ou aguarde instruções</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="process" className="space-y-4">
          <TabsList>
            <TabsTrigger value="process"><FileText className="h-4 w-4 mr-1" />Processo</TabsTrigger>
            {myCharacters.length > 0 && <TabsTrigger value="characters"><Users className="h-4 w-4 mr-1" />Personagens</TabsTrigger>}
            {myForms.length > 0 && <TabsTrigger value="forms"><ClipboardList className="h-4 w-4 mr-1" />Formulário</TabsTrigger>}
          </TabsList>

          <TabsContent value="process">
            <LegalProcessRenderer
              content={selectedCase?.process_content || "Conteúdo do processo não disponível"}
              caseNumber={selectedCase?.case_number}
              title={selectedCase?.title}
            />
          </TabsContent>

          {myCharacters.length > 0 && (
            <TabsContent value="characters">
              <Card className="mb-4 border-dashed bg-muted/30">
                <CardContent className="py-3 text-xs text-muted-foreground">
                  <strong className="text-foreground">Testemunha técnica:</strong> este personagem NÃO é o réu.
                  Trata-se de um(a) profissional convocado(a) pela {myRole === "prosecution" ? "acusação" : "defesa"} para
                  prestar depoimento técnico e fortalecer a argumentação do seu grupo. Estude as instruções e use
                  estrategicamente durante o júri.
                </CardContent>
              </Card>
              {myCharacters.map((char: any, idx: number) => (
                <Card key={idx} className="mb-4">
                  <CardHeader>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={char.side === "prosecution" ? "destructive" : "default"}>
                        Testemunha da {char.side === "prosecution" ? "Acusação" : "Defesa"}
                      </Badge>
                      <CardTitle className="text-base">{char.name}</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">{char.profession}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{char.instructions}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          )}

          {myForms.length > 0 && (
            <TabsContent value="forms">
              {myForms.map((form: any) => (
                <MockTrialFormCard
                  key={form.id}
                  form={form}
                  onSubmit={(answers) => submitResponse(form.id, answers)}
                />
              ))}
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}

function MockTrialFormCard({ form, onSubmit }: { form: any; onSubmit: (answers: Record<string, any>) => void }) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    onSubmit(answers);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card className="mb-4">
        <CardContent className="py-8 text-center">
          <p className="text-primary font-medium">✓ Resposta enviada com sucesso!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">{form.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormRenderer
          fields={(form.fields_json || []) as FormField[]}
          answers={answers}
          onChange={setAnswers}
        />
        <Button onClick={handleSubmit} className="w-full">Enviar Resposta</Button>
      </CardContent>
    </Card>
  );
}
