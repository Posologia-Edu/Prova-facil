import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, BarChart3 } from "lucide-react";

type StudentRow = {
  email: string;
  name: string;
  anamnesis: number | null;
  soap: number | null;
  reconciliation: number | null;
  documentation: number | null;
  average: number | null;
};

export default function SimulationAggregator() {
  const navigate = useNavigate();

  // Anamnesis scores from simulation_responses
  const { data: simResponses = [] } = useQuery({
    queryKey: ["agg-sim-responses"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      // Get all participant data with their scores
      const { data: participants } = await supabase.from("simulation_participants").select("id, student_email, student_name, room_id");
      const { data: rooms } = await supabase.from("simulation_rooms").select("id").eq("user_id", session.user.id);
      if (!rooms || !participants) return [];
      const roomIds = new Set(rooms.map(r => r.id));
      const relevantParticipants = participants.filter(p => roomIds.has(p.room_id));

      const { data: responses } = await supabase.from("simulation_responses").select("participant_id, score, round_id, form_id");
      if (!responses) return [];

      // Get forms to identify professor_eval and observer_eval
      const { data: allForms } = await supabase.from("simulation_forms").select("id, form_type, room_id").in("room_id", Array.from(roomIds));
      const evalFormIds = new Set((allForms || []).filter(f => f.form_type === "professor_eval" || f.form_type === "observer_eval").map(f => f.id));

      return relevantParticipants.map(p => {
        // Only count eval form responses, group by round, average per round
        const pResponses = responses.filter(r => r.participant_id === p.id && evalFormIds.has(r.form_id));
        const roundMap = new Map<string, number[]>();
        pResponses.forEach(r => {
          if (!roundMap.has(r.round_id)) roundMap.set(r.round_id, []);
          roundMap.get(r.round_id)!.push(Number(r.score) || 0);
        });
        const roundAvgs = Array.from(roundMap.values()).map(scores => scores.reduce((a, b) => a + b, 0) / scores.length);
        const score = roundAvgs.length > 0 ? roundAvgs.reduce((a, b) => a + b, 0) / roundAvgs.length : null;
        return { email: p.student_email?.toLowerCase() || "", name: p.student_name, score: score != null ? Math.round(score * 100) / 100 : null };
      });
    },
  });

  // SOAP scores
  const { data: soapData = [] } = useQuery({
    queryKey: ["agg-soap-responses"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data: rooms } = await supabase.from("soap_rooms").select("id").eq("user_id", session.user.id);
      if (!rooms) return [];
      const roomIds = rooms.map(r => r.id);

      const { data: participants } = await supabase.from("soap_participants").select("id, student_email, student_name, room_id").in("room_id", roomIds);
      const { data: responses } = await supabase.from("soap_responses").select("participant_id, admin_score").in("room_id", roomIds);
      if (!participants || !responses) return [];

      return participants.map(p => ({
        email: p.student_email?.toLowerCase() || "",
        name: p.student_name,
        score: responses.filter(r => r.participant_id === p.id).reduce((sum, r) => sum + (Number(r.admin_score) || 0), 0) || null,
      }));
    },
  });

  // Reconciliation scores
  const { data: reconData = [] } = useQuery({
    queryKey: ["agg-recon-responses"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data: rooms } = await supabase.from("reconciliation_rooms").select("id").eq("user_id", session.user.id);
      if (!rooms) return [];
      const roomIds = rooms.map(r => r.id);

      const { data: participants } = await supabase.from("reconciliation_participants").select("id, student_email, student_name, room_id, pair_index").in("room_id", roomIds);
      const { data: responses } = await supabase.from("reconciliation_responses").select("room_id, pair_index, admin_score, ai_score").in("room_id", roomIds);
      if (!participants || !responses) return [];

      return participants.map(p => {
        const resp = responses.find(r => r.room_id === p.room_id && r.pair_index === p.pair_index);
        return { email: p.student_email?.toLowerCase() || "", name: p.student_name, score: Number(resp?.admin_score ?? resp?.ai_score) || null };
      });
    },
  });

  // Documentation scores
  const { data: docData = [] } = useQuery({
    queryKey: ["agg-doc-responses"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data: rooms } = await supabase.from("documentation_rooms").select("id").eq("user_id", session.user.id);
      if (!rooms) return [];
      const roomIds = rooms.map(r => r.id);

      const { data: participants } = await supabase.from("documentation_participants").select("id, student_email, student_name, room_id, pair_index").in("room_id", roomIds);
      const { data: responses } = await supabase.from("documentation_responses").select("room_id, pair_index, admin_score, ai_score").in("room_id", roomIds);
      if (!participants || !responses) return [];

      return participants.map(p => {
        const resps = responses.filter(r => r.room_id === p.room_id && r.pair_index === p.pair_index);
        const totalScore = resps.reduce((sum, r) => sum + (Number(r.admin_score ?? r.ai_score) || 0), 0);
        return { email: p.student_email?.toLowerCase() || "", name: p.student_name, score: totalScore || null };
      });
    },
  });

  const aggregated: StudentRow[] = useMemo(() => {
    const map = new Map<string, StudentRow>();

    const addData = (items: { email: string; name: string; score: number | null }[], key: keyof Pick<StudentRow, "anamnesis" | "soap" | "reconciliation" | "documentation">) => {
      items.forEach(item => {
        if (!item.email) return;
        const existing = map.get(item.email) || { email: item.email, name: item.name, anamnesis: null, soap: null, reconciliation: null, documentation: null, average: null };
        if (item.score != null) {
          existing[key] = (existing[key] || 0) + item.score;
        }
        if (!existing.name && item.name) existing.name = item.name;
        map.set(item.email, existing);
      });
    };

    addData(simResponses, "anamnesis");
    addData(soapData, "soap");
    addData(reconData, "reconciliation");
    addData(docData, "documentation");

    // Calculate average
    map.forEach(row => {
      const scores = [row.anamnesis, row.soap, row.reconciliation, row.documentation].filter(s => s != null) as number[];
      row.average = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : null;
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [simResponses, soapData, reconData, docData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/simulations")}>
          <ArrowLeft className="h-4 w-4 mr-1" />Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />Agregador de Notas
          </h1>
          <p className="text-muted-foreground">Visão geral das notas dos 4 módulos da simulação realística</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas por Aluno</CardTitle>
        </CardHeader>
        <CardContent>
          {aggregated.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum dado encontrado. Complete atividades nos módulos para ver as notas aqui.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead className="text-center">Anamnese</TableHead>
                    <TableHead className="text-center">SOAP</TableHead>
                    <TableHead className="text-center">Reconciliação</TableHead>
                    <TableHead className="text-center">Documentação</TableHead>
                    <TableHead className="text-center font-bold">Média</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aggregated.map(row => (
                    <TableRow key={row.email}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{row.anamnesis != null ? row.anamnesis : "—"}</TableCell>
                      <TableCell className="text-center">{row.soap != null ? row.soap : "—"}</TableCell>
                      <TableCell className="text-center">{row.reconciliation != null ? row.reconciliation : "—"}</TableCell>
                      <TableCell className="text-center">{row.documentation != null ? row.documentation : "—"}</TableCell>
                      <TableCell className="text-center font-bold">{row.average != null ? row.average : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
