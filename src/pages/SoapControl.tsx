import { useState } from "react";
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
import { ArrowLeft, Users, FileText, BarChart3, CheckCircle, Clock, Send, Shuffle } from "lucide-react";

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

  const [selectedResponse, setSelectedResponse] = useState<any>(null);
  const [adminScore, setAdminScore] = useState<string>("");
  const [adminFeedback, setAdminFeedback] = useState("");

  // Pair formation logic — only students (exclude teachers)
  const studentsOnly = participants.filter((p: any) => (p as any).participant_role !== "teacher");
  const unpaired = studentsOnly.filter((p) => p.pair_index < 0);
  const paired = studentsOnly.filter((p) => p.pair_index >= 0);

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
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Nota salva!" });
    queryClient.invalidateQueries({ queryKey: ["soap-responses", roomId] });
    setSelectedResponse(null);
    setAdminScore("");
    setAdminFeedback("");
  };

  const completeRoom = async () => {
    await supabase.from("soap_rooms").update({ status: "completed" }).eq("id", roomId!);
    queryClient.invalidateQueries({ queryKey: ["soap-room", roomId] });
    toast({ title: "Sala concluída!" });
  };

  const soapResponses = responses.filter((r: any) => !r.target_participant_id);
  const peerResponses = responses.filter((r: any) => r.target_participant_id);
  const getParticipantName = (id: string) => participants.find((p) => p.id === id)?.student_name || "—";
  const submittedCount = soapResponses.length;
  const evaluatedCount = peerResponses.length;

  const avgAdminScore = responses.filter((r: any) => r.admin_score != null).reduce((sum: number, r: any) => sum + Number(r.admin_score), 0) / (responses.filter((r: any) => r.admin_score != null).length || 1);

  // Group pairs
  const pairGroups: Record<number, typeof paired> = {};
  paired.forEach((p) => { (pairGroups[p.pair_index] ||= []).push(p); });

  if (!room) return <p className="p-6 text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/simulations/soap")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{room.title} — Controle</h1>
          <p className="text-muted-foreground text-sm">PIN: {room.access_code} • {studentsOnly.length} alunos</p>
        </div>
        {room.status === "active" && (
          <Button variant="outline" onClick={completeRoom}>
            <CheckCircle className="h-4 w-4 mr-2" />Concluir Sala
          </Button>
        )}
      </div>

      {/* Status cards */}
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
        </TabsList>

        {/* Pairs Tab */}
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
                <CardTitle className="text-base">Dupla {idx}</CardTitle>
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
          ) : soapResponses.map((r: any) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{getParticipantName(r.participant_id)}</CardTitle>
                  <div className="flex items-center gap-2">
                    {r.admin_score != null && <Badge variant="default">Nota: {r.admin_score}</Badge>}
                    <Button variant="outline" size="sm" onClick={() => { setSelectedResponse(r); setAdminScore(r.admin_score?.toString() || ""); setAdminFeedback(r.admin_feedback || ""); }}>
                      Avaliar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(r.answers_json as Record<string, any>).map(([key, val]) => (
                    <div key={key} className="p-2 bg-muted/50 rounded text-sm">
                      <span className="text-muted-foreground">{key}: </span>
                      <span>{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="evaluations" className="space-y-3">
          {peerResponses.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma avaliação enviada ainda.</CardContent></Card>
          ) : peerResponses.map((r: any) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {getParticipantName(r.participant_id)} avaliou {getParticipantName(r.target_participant_id)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(r.answers_json as Record<string, any>).map(([key, val]) => (
                    <div key={key} className="p-2 bg-muted/50 rounded text-sm">
                      <span className="text-muted-foreground">{key}: </span>
                      <span>{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="admin" className="space-y-3">
          {selectedResponse ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Avaliar: {getParticipantName(selectedResponse.participant_id)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <Button variant="outline" onClick={() => setSelectedResponse(null)}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Selecione uma resposta SOAP para atribuir nota clicando em "Avaliar" na aba de Respostas SOAP.
              </CardContent>
            </Card>
          )}

          {responses.filter((r: any) => r.admin_score != null).length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notas Atribuídas</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {responses.filter((r: any) => r.admin_score != null).map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded">
                      <span>{getParticipantName(r.participant_id)}</span>
                      <div className="flex items-center gap-2">
                        <Badge>{r.admin_score}</Badge>
                        {r.admin_feedback && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{r.admin_feedback}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
