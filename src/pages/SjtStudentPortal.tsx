import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, Scale, GripVertical } from "lucide-react";

interface SjtScenario {
  id: string;
  position: number;
  scenario_text: string;
  actions_json: { id: string; text: string }[];
}

export default function SjtStudentPortal() {
  const { examId } = useParams<{ examId: string }>();
  const [examTitle, setExamTitle] = useState("");
  const [examStatus, setExamStatus] = useState("");
  const [scenarios, setScenarios] = useState<SjtScenario[]>([]);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [phase, setPhase] = useState<"identify" | "exam" | "result">("identify");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rankings, setRankings] = useState<Record<string, string[]>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState<{ total: number; max: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dragItem, setDragItem] = useState<number | null>(null);

  useEffect(() => {
    // A prova vem da função sjt-aluno, sem o ranking ideal (a nota é calculada no servidor)
    const fetch = async () => {
      const { data } = await supabase.functions.invoke("sjt-aluno", { body: { action: "exame", exam_id: examId } });
      if (data?.ok) { setExamTitle(data.titulo); setExamStatus(data.status); }

      const scenarioData = (data?.ok ? data.cenarios : []) as unknown as SjtScenario[];
      setScenarios(scenarioData);

      // Initialize rankings with shuffled actions
      const initial: Record<string, string[]> = {};
      scenarioData.forEach(s => {
        const shuffled = [...s.actions_json.map(a => a.id)].sort(() => Math.random() - 0.5);
        initial[s.id] = shuffled;
      });
      setRankings(initial);
      setLoading(false);
    };
    fetch();
  }, [examId]);

  const handleStart = async () => {
    if (!studentName.trim() || !studentEmail.trim()) { toast.error("Preencha nome e e-mail"); return; }
    const { data, error } = await supabase.functions.invoke("sjt-aluno", {
      body: { action: "iniciar", exam_id: examId, name: studentName.trim(), email: studentEmail.trim() },
    });
    if (error || !data?.ok) { toast.error(data?.error || "Erro ao iniciar"); return; }
    setSessionId(data.session_id);
    setPhase("exam");
  };

  const moveItem = useCallback((scenarioId: string, fromIdx: number, toIdx: number) => {
    setRankings(prev => {
      const arr = [...(prev[scenarioId] || [])];
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return { ...prev, [scenarioId]: arr };
    });
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    // O servidor calcula a nota pelo ranking enviado e devolve só o resultado
    const { data, error } = await supabase.functions.invoke("sjt-aluno", {
      body: { action: "enviar", session_id: sessionId, rankings },
    });
    if (error || !data?.ok) {
      toast.error(data?.motivo === "ja_enviada" ? "Estas respostas já foram enviadas." : "Não foi possível enviar. Tente novamente.");
      setSubmitting(false);
      return;
    }
    setScore({ total: data.total, max: data.max });
    setPhase("result");
    setSubmitting(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;

  if (examStatus !== "active") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Scale className="h-16 w-16 text-muted-foreground/40 mx-auto" />
            <h2 className="font-heading text-2xl font-medium">Exame não disponível</h2>
            <p className="text-muted-foreground">Este exame SJT ainda não está aberto.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "result") {
    const pct = score ? ((score.total / score.max) * 100).toFixed(1) : "0";
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-success mx-auto" />
            <h2 className="font-heading text-2xl font-medium">Respostas Enviadas!</h2>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-3xl font-bold text-primary">{pct}%</p>
              <p className="text-sm text-muted-foreground mt-1">Pontuação: {score?.total.toFixed(1)}/{score?.max}</p>
            </div>
            <p className="text-xs text-muted-foreground">Pontuação calculada por concordância parcial com o ranking ideal.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "identify") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <Scale className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="eyebrow">SJT</div>
            <CardTitle className="font-heading text-lg font-medium">{examTitle}</CardTitle>
            <p className="text-sm text-muted-foreground">Situational Judgment Test — {scenarios.length} cenários</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Seu nome</Label><Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Maria Silva" /></div>
            <div><Label>Seu e-mail</Label><Input value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="maria@aluno.com" type="email" /></div>
            <Button className="w-full" onClick={handleStart}>Iniciar Exame</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exam phase
  const currentScenario = scenarios[currentIndex];
  const currentRanking = rankings[currentScenario?.id] || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div><div className="eyebrow mb-1">SJT</div><h1 className="font-heading text-2xl font-medium">{examTitle}</h1></div>
          <Badge variant="outline">{currentIndex + 1}/{scenarios.length}</Badge>
        </div>

        {currentScenario && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-lg font-medium">Cenário {currentIndex + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{currentScenario.scenario_text}</p>
              </div>

              <div>
                <p className="text-xs font-medium mb-3">Ordene as ações da <strong>mais apropriada</strong> para a <strong>menos apropriada</strong>:</p>
                <div className="space-y-2">
                  {currentRanking.map((actionId, idx) => {
                    const action = currentScenario.actions_json.find(a => a.id === actionId);
                    return (
                      <div
                        key={actionId}
                        draggable
                        onDragStart={() => setDragItem(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragItem !== null && dragItem !== idx) {
                            moveItem(currentScenario.id, dragItem, idx);
                          }
                          setDragItem(null);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-grab active:cursor-grabbing ${
                          dragItem === idx ? "border-primary bg-primary/5 opacity-50" : "border-border hover:border-primary/30"
                        }`}
                      >
                        <span className="text-sm font-bold text-muted-foreground w-6 text-center">{idx + 1}º</span>
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm flex-1">{action?.text || actionId}</span>
                        <div className="flex gap-1">
                          {idx > 0 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(currentScenario.id, idx, idx - 1)}>↑</Button>
                          )}
                          {idx < currentRanking.length - 1 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(currentScenario.id, idx, idx + 1)}>↓</Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                {currentIndex > 0 && (
                  <Button variant="outline" onClick={() => setCurrentIndex(currentIndex - 1)}>Anterior</Button>
                )}
                <div className="ml-auto">
                  {currentIndex < scenarios.length - 1 ? (
                    <Button onClick={() => setCurrentIndex(currentIndex + 1)}>Próximo</Button>
                  ) : (
                    <Button onClick={handleSubmit} disabled={submitting}>
                      {submitting ? "Enviando..." : "Finalizar Exame"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
