import { useEffect, useMemo, useState } from "react";
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
import { ArrowLeft, Users, FileText, BarChart3, CheckCircle, Send, Shuffle, Trophy } from "lucide-react";
import { computeFieldScore, FormField } from "@/components/forms/types";

export default function SoapControl() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: room } = useQuery({
    queryKey: ["soap-room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("soap_rooms").select("*").eq("id", roomId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  const { data: participants = [], refetch: refetchParticipants } = useQuery({
    queryKey: ["soap-participants", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("soap_participants")
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
    queryKey: ["soap-responses", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("soap_responses")
        .select("*, soap_forms(*)")
        .eq("room_id", roomId!);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!roomId,
    refetchInterval: 5000,
  });

  const { data: forms = [] } = useQuery({
    queryKey: ["soap-forms", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("soap_forms").select("*").eq("room_id", roomId!);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!roomId,
  });

  // Load anamnesis patient names for each participant
  const { data: patientNames = {} } = useQuery({
    queryKey: ["soap-patient-names", roomId, participants.map((p) => p.id).join(",")],
    queryFn: async () => {
      const withAnamnesis = participants.filter((p) => p.anamnesis_participant_id);
      if (!withAnamnesis.length) return {};

      const anamnesisIds = withAnamnesis.map((p) => p.anamnesis_participant_id!);
      const { data: anamnesisParticipants } = await supabase
        .from("simulation_participants")
        .select("id, pair_index, room_id")
        .in("id", anamnesisIds);
      if (!anamnesisParticipants?.length) return {};

      const result: Record<string, string> = {};
      for (const ap of anamnesisParticipants) {
        if (ap.pair_index < 0) continue;
        const { data: partner } = await supabase
          .from("simulation_participants")
          .select("student_name")
          .eq("room_id", ap.room_id)
          .eq("pair_index", ap.pair_index)
          .neq("id", ap.id)
          .limit(1)
          .maybeSingle();
        if (partner) {
          const soapP = withAnamnesis.find((p) => p.anamnesis_participant_id === ap.id);
          if (soapP) result[soapP.id] = partner.student_name;
        }
      }
      return result;
    },
    enabled: !!roomId && participants.length > 0,
  });

  const studentsOnly = participants.filter((p: any) => (p as any).participant_role !== "teacher");
  const unpaired = studentsOnly.filter((p) => p.pair_index < 0);
  const paired = studentsOnly.filter((p) => p.pair_index >= 0);
  const soapResponses = responses.filter((r: any) => !r.target_participant_id);
  const peerResponses = responses.filter((r: any) => r.target_participant_id);

  const fieldLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    forms.forEach((form: any) => {
      const fields = form.content_json as any[];
      if (!Array.isArray(fields)) return;

      fields.forEach((field: any) => {
        if (field.id && field.label) {
          labels[field.id] = field.label;
        }
      });
    });
    return labels;
  }, [forms]);

  const responseFieldMeta = useMemo(() => {
    const meta: Record<string, { label: string; maxScore?: number | null }> = {};
    forms.forEach((form: any) => {
      const fields = form.content_json as any[];
      if (!Array.isArray(fields)) return;

      fields.forEach((field: any) => {
        if (field.id) {
          meta[field.id] = {
            label: field.label || field.id,
            maxScore: typeof field.max_score === "number" ? field.max_score : null,
          };
        }
      });
    });
    return meta;
  }, [forms]);

  const resolveLabel = (key: string) => fieldLabels[key] || key;
  const getParticipantName = (id: string) => participants.find((p) => p.id === id)?.student_name || "—";
  const submittedCount = soapResponses.length;
  const evaluatedCount = peerResponses.length;
  const avgAdminScore = responses.filter((r: any) => r.admin_score != null).reduce((sum: number, r: any) => sum + Number(r.admin_score), 0) / (responses.filter((r: any) => r.admin_score != null).length || 1);

  const pairGroups: Record<number, typeof paired> = {};
  paired.forEach((p) => {
    (pairGroups[p.pair_index] ||= []).push(p);
  });

  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [adminScore, setAdminScore] = useState<string>("");
  const [adminFeedback, setAdminFeedback] = useState("");

  const selectedResponse = useMemo(
    () => soapResponses.find((response: any) => response.id === selectedResponseId) ?? null,
    [soapResponses, selectedResponseId],
  );

  useEffect(() => {
    if (!soapResponses.length) {
      setSelectedResponseId(null);
      return;
    }

    if (!selectedResponseId || !soapResponses.some((response: any) => response.id === selectedResponseId)) {
      setSelectedResponseId(soapResponses[0].id);
    }
  }, [soapResponses, selectedResponseId]);

  useEffect(() => {
    setAdminScore(selectedResponse?.admin_score != null ? String(selectedResponse.admin_score) : "");
    setAdminFeedback(selectedResponse?.admin_feedback || "");
  }, [selectedResponse?.id, selectedResponse?.admin_score, selectedResponse?.admin_feedback]);

  const openAdminEvaluation = (response: any) => {
    setSelectedResponseId(response.id);
  };

  const renderAnswerEntries = (answers: Record<string, any>, showItemScores = false) => {
    const entries = Object.entries(answers || {}).filter(([key]) => key !== "_feedback");

    if (!entries.length) {
      return <p className="text-sm text-muted-foreground">Nenhuma resposta encontrada.</p>;
    }

    return (
      <div className="space-y-2">
        {entries.map(([key, value]) => {
          const fieldMeta = responseFieldMeta[key];
          return (
            <div key={key} className="rounded border bg-muted/50 p-3 text-sm">
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="font-medium text-foreground">{resolveLabel(key)}</span>
                {showItemScores && fieldMeta?.maxScore != null && (
                  <Badge variant="outline">{fieldMeta.maxScore} pts</Badge>
                )}
              </div>
              <div className="text-muted-foreground">
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const formPairsAuto = async () => {
    if (unpaired.length < 2) {
      toast({ title: "Insuficiente", description: "Precisa de pelo menos 2 alunos sem dupla.", variant: "destructive" });
      return;
    }
    const maxPairIdx = Math.max(0, ...paired.map((p) => p.pair_index));
    let pairIdx = paired.length > 0 ? maxPairIdx + 1 : 0;
    for (let i = 0; i < unpaired.length - 1; i += 2) {
      await supabase.from("soap_participants").update({ pair_index: pairIdx, pair_position: "A" }).eq("id", unpaired[i].id);
      await supabase.from("soap_participants").update({ pair_index: pairIdx, pair_position: "B" }).eq("id", unpaired[i + 1].id);
      pairIdx++;
    }
    refetchParticipants();
    toast({ title: "Duplas formadas!" });
  };

  const resetPairs = async () => {
    for (const p of participants) {
      await supabase.from("soap_participants").update({ pair_index: -1, pair_position: "X" }).eq("id", p.id);
    }
    refetchParticipants();
    toast({ title: "Duplas desfeitas" });
  };

  const saveAdminScore = async () => {
    if (!selectedResponse) return;
    const { error } = await supabase.from("soap_responses").update({
      admin_score: adminScore ? Number(adminScore) : null,
      admin_feedback: adminFeedback || null,
    }).eq("id", selectedResponse.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Nota salva!" });
    queryClient.invalidateQueries({ queryKey: ["soap-responses", roomId] });
  };

  const completeRoom = async () => {
    await supabase.from("soap_rooms").update({ status: "completed" }).eq("id", roomId!);
    queryClient.invalidateQueries({ queryKey: ["soap-room", roomId] });
    toast({ title: "Sala concluída!" });
  };

  if (!room) return <p className="p-6 text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/simulations/soap")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold"><span className="text-xs font-normal bg-chart-2/10 text-chart-2 border border-chart-2/30 rounded px-1.5 py-0.5 mr-2">SOAP</span>{room.title} — Controle</h1>
          <p className="text-muted-foreground text-sm">PIN: {room.access_code} • {studentsOnly.length} alunos</p>
        </div>
        {room.status === "active" && (
          <Button variant="outline" onClick={completeRoom}>
            <CheckCircle className="h-4 w-4 mr-2" />Concluir Sala
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <Users className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{participants.length}</p>
            <p className="text-xs text-muted-foreground">Alunos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <FileText className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{submittedCount}</p>
            <p className="text-xs text-muted-foreground">SOAPs Enviados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Send className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{evaluatedCount}</p>
            <p className="text-xs text-muted-foreground">Avaliações</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <BarChart3 className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{avgAdminScore.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Média Admin</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pairs">
        <TabsList>
          <TabsTrigger value="pairs"><Shuffle className="h-4 w-4 mr-1" />Duplas</TabsTrigger>
          <TabsTrigger value="responses">Respostas SOAP</TabsTrigger>
          <TabsTrigger value="evaluations">Avaliações entre Pares</TabsTrigger>
          <TabsTrigger value="admin">Notas do Admin</TabsTrigger>
          <TabsTrigger value="final"><Trophy className="h-4 w-4 mr-1" />Notas Finais</TabsTrigger>
        </TabsList>

        <TabsContent value="pairs" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={formPairsAuto} disabled={unpaired.length < 2}>
              <Users className="h-4 w-4 mr-2" />Formar Duplas Automaticamente
            </Button>
            {paired.length > 0 && (
              <Button variant="outline" onClick={resetPairs}>
                Desfazer Duplas
              </Button>
            )}
          </div>

          {unpaired.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Sem Dupla ({unpaired.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {unpaired.map((p) => (
                    <Badge key={p.id} variant="secondary">{p.student_name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {Object.entries(pairGroups).map(([idx, members]) => (
            <Card key={idx}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{members.some(m => m.pair_position === "S") ? "Individual" : `Dupla ${idx}`}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {members.sort((a, b) => a.pair_position.localeCompare(b.pair_position)).map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <Badge variant={m.pair_position === "A" ? "default" : "secondary"}>{m.pair_position}</Badge>
                      <span>{m.student_name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="responses" className="space-y-3">
          {soapResponses.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum SOAP enviado ainda.</CardContent></Card>
          ) : soapResponses.map((response: any) => (
            <Card key={response.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{getParticipantName(response.participant_id)}</CardTitle>
                    {(patientNames as Record<string, string>)[response.participant_id] && (
                      <p className="text-xs text-muted-foreground mt-0.5">Paciente simulado: <strong>{(patientNames as Record<string, string>)[response.participant_id]}</strong></p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {response.admin_score != null && <Badge variant="default">Nota: {response.admin_score}</Badge>}
                    <Button variant="outline" size="sm" onClick={() => openAdminEvaluation(response)}>
                      Avaliar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>{renderAnswerEntries(response.answers_json)}</CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="evaluations" className="space-y-3">
          {peerResponses.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma avaliação enviada ainda.</CardContent></Card>
          ) : peerResponses.map((response: any) => (
            <Card key={response.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {getParticipantName(response.participant_id)} avaliou {getParticipantName(response.target_participant_id)}
                </CardTitle>
              </CardHeader>
              <CardContent>{renderAnswerEntries(response.answers_json, true)}</CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          {soapResponses.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum SOAP foi enviado ainda para avaliação.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Respostas disponíveis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {soapResponses.map((response: any) => {
                    const isSelected = response.id === selectedResponse?.id;
                    return (
                      <button
                        key={response.id}
                        type="button"
                        onClick={() => openAdminEvaluation(response)}
                        className={`w-full rounded border p-3 text-left transition-colors ${
                          isSelected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-medium text-foreground">{getParticipantName(response.participant_id)}</span>
                            {(patientNames as Record<string, string>)[response.participant_id] && (
                              <p className="text-xs text-muted-foreground">Pac: {(patientNames as Record<string, string>)[response.participant_id]}</p>
                            )}
                          </div>
                          {response.admin_score != null && <Badge variant="secondary">{response.admin_score}</Badge>}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {response.admin_feedback ? "Com feedback salvo" : "Sem feedback ainda"}
                        </p>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Avaliar: {selectedResponse ? getParticipantName(selectedResponse.participant_id) : "Selecione uma resposta"}
                  </CardTitle>
                  {selectedResponse && (patientNames as Record<string, string>)[selectedResponse.participant_id] && (
                    <p className="text-sm text-muted-foreground">Paciente simulado: <strong>{(patientNames as Record<string, string>)[selectedResponse.participant_id]}</strong></p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedResponse ? (
                    <>
                      <div className="space-y-2">
                        <Label>Resposta SOAP</Label>
                        {renderAnswerEntries(selectedResponse.answers_json)}
                      </div>
                      <div>
                        <Label>Nota</Label>
                        <Input type="number" value={adminScore} onChange={(e) => setAdminScore(e.target.value)} placeholder="0-10" />
                      </div>
                      <div>
                        <Label>Feedback</Label>
                        <Textarea value={adminFeedback} onChange={(e) => setAdminFeedback(e.target.value)} rows={4} />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={saveAdminScore}>Salvar Nota</Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Selecione uma resposta para começar a avaliação.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {responses.filter((r: any) => r.admin_score != null).length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notas Atribuídas</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {responses.filter((r: any) => r.admin_score != null).map((response: any) => (
                    <div key={response.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded">
                      <span>{getParticipantName(response.participant_id)}</span>
                      <div className="flex items-center gap-2">
                        <Badge>{response.admin_score}</Badge>
                        {response.admin_feedback && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{response.admin_feedback}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="final" className="space-y-4">
          {(() => {
            // Build per-student final grades
            const evalForm = forms.find((f: any) => f.form_type === "peer_evaluation" || f.title?.toLowerCase().includes("avaliação"));
            const evalFields: FormField[] = evalForm ? (evalForm.content_json as FormField[]) : [];

            const studentGrades: {
              id: string;
              name: string;
              peerScore: number | null;
              peerMaxScore: number;
              adminScore: number | null;
              finalScore: number | null;
            }[] = [];

            const allStudents = participants.filter((p: any) => p.participant_role !== "teacher");

            for (const student of allStudents) {
              // Peer score: find peer evaluation targeting this student
              const peerEval = peerResponses.find((r: any) => r.target_participant_id === student.id);
              let peerScore: number | null = null;
              let peerMaxScore = 0;

              if (peerEval && evalFields.length > 0) {
                let totalScore = 0;
                let totalMax = 0;
                for (const field of evalFields) {
                  if (!field.max_score) continue;
                  totalMax += field.max_score;
                  const answer = (peerEval.answers_json as Record<string, any>)?.[field.id];
                  totalScore += computeFieldScore(field, answer);
                }
                peerMaxScore = totalMax;
                // Normalize to 0-10
                peerScore = totalMax > 0 ? (totalScore / totalMax) * 10 : 0;
              }

              // Admin score: from SOAP response
              const soapResp = soapResponses.find((r: any) => r.participant_id === student.id);
              const adminSc = soapResp?.admin_score != null ? Number(soapResp.admin_score) : null;

              // Final: average of available scores
              const scores = [peerScore, adminSc].filter((s): s is number => s != null);
              const finalScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

              studentGrades.push({
                id: student.id,
                name: student.student_name,
                peerScore,
                peerMaxScore,
                adminScore: adminSc,
                finalScore,
              });
            }

            if (studentGrades.length === 0) {
              return (
                <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum aluno encontrado.</CardContent></Card>
              );
            }

            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Nota Final do Módulo SOAP por Aluno</CardTitle>
                  <p className="text-sm text-muted-foreground">Média entre a nota do professor e a avaliação entre pares (escala 0-10)</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="py-2 pr-4 font-medium">Aluno</th>
                          <th className="py-2 px-4 font-medium text-center">Nota Pares</th>
                          <th className="py-2 px-4 font-medium text-center">Nota Professor</th>
                          <th className="py-2 pl-4 font-medium text-center">Nota Final</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentGrades.map((sg) => (
                          <tr key={sg.id} className="border-b last:border-0">
                            <td className="py-3 pr-4 font-medium">{sg.name}</td>
                            <td className="py-3 px-4 text-center">
                              {sg.peerScore != null ? (
                                <Badge variant="outline">{sg.peerScore.toFixed(1)}</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {sg.adminScore != null ? (
                                <Badge variant="outline">{sg.adminScore.toFixed(1)}</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="py-3 pl-4 text-center">
                              {sg.finalScore != null ? (
                                <Badge variant="default" className="text-base px-3 py-1">{sg.finalScore.toFixed(1)}</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
