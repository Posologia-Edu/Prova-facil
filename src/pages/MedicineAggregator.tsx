import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Stethoscope, Activity, ArrowRightLeft, ClipboardList, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { moduleLabel, type MedicineModuleType } from "@/lib/medicine-modules";

type RoomInfo = { id: string; title: string; status: string; module_type: string };

export default function MedicineAggregator() {
  const navigate = useNavigate();

  const { data: rooms = [] } = useQuery({
    queryKey: ["medicine-agg-rooms"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase.from("medicine_rooms").select("id, title, status, module_type").eq("user_id", session.user.id).order("created_at", { ascending: false });
      return (data || []) as RoomInfo[];
    },
  });

  const { data: allResponses = [] } = useQuery({
    queryKey: ["medicine-agg-responses"],
    queryFn: async () => {
      const { data } = await supabase.from("medicine_responses").select("room_id, pair_index, admin_score, ai_score");
      return data || [];
    },
  });

  const { data: allParticipants = [] } = useQuery({
    queryKey: ["medicine-agg-participants"],
    queryFn: async () => {
      const { data } = await supabase.from("medicine_participants").select("room_id, pair_index, student_name, student_email, participant_role");
      return (data || []).filter((p: any) => p.participant_role === "student");
    },
  });

  const moduleTypes: MedicineModuleType[] = ["anamnese_medica", "exame_fisico", "raciocinio_clinico", "plano_terapeutico"];

  const consolidatedData = useMemo(() => {
    const studentMap: Record<string, { name: string; scores: Record<string, number[]> }> = {};

    rooms.forEach(room => {
      const roomResponses = allResponses.filter(r => r.room_id === room.id);
      roomResponses.forEach(resp => {
        const score = resp.admin_score != null ? Number(resp.admin_score) : (resp.ai_score != null ? Number(resp.ai_score) : null);
        if (score === null) return;
        const pairParticipants = allParticipants.filter(p => p.room_id === room.id && p.pair_index === resp.pair_index);
        pairParticipants.forEach(p => {
          const key = p.student_email || p.student_name;
          if (!studentMap[key]) studentMap[key] = { name: p.student_name, scores: {} };
          if (!studentMap[key].scores[room.module_type]) studentMap[key].scores[room.module_type] = [];
          studentMap[key].scores[room.module_type].push(score);
        });
      });
    });

    return Object.entries(studentMap).map(([key, val]) => {
      const moduleScores: Record<string, number | null> = {};
      let totalCount = 0; let totalSum = 0;
      moduleTypes.forEach(mt => {
        const scores = val.scores[mt];
        if (scores?.length) {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          moduleScores[mt] = avg;
          totalSum += avg; totalCount++;
        } else { moduleScores[mt] = null; }
      });
      return { email: key, name: val.name, ...moduleScores, average: totalCount > 0 ? totalSum / totalCount : null };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms, allResponses, allParticipants]);

  const roomsByModule = useMemo(() => {
    const map: Record<string, RoomInfo[]> = {};
    moduleTypes.forEach(mt => { map[mt] = rooms.filter(r => r.module_type === mt); });
    return map;
  }, [rooms]);

  const moduleIcons: Record<string, any> = { anamnese_medica: Heart, exame_fisico: ClipboardList, raciocinio_clinico: Activity, plano_terapeutico: ArrowRightLeft };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/medicine")}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
        <div>
          <h1 className="text-2xl font-bold">Agregador de Notas — Medicina</h1>
          <p className="text-muted-foreground">Notas consolidadas de todos os módulos</p>
        </div>
      </div>

      <Tabs defaultValue="consolidated">
        <TabsList>
          <TabsTrigger value="consolidated"><BarChart3 className="h-4 w-4 mr-1" />Consolidado</TabsTrigger>
          <TabsTrigger value="by-room">Por Sala</TabsTrigger>
        </TabsList>

        <TabsContent value="consolidated" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Notas Consolidadas</CardTitle></CardHeader>
            <CardContent>
              {consolidatedData.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma nota registrada ainda.</p> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aluno</TableHead>
                        {moduleTypes.map(mt => <TableHead key={mt}>{moduleLabel[mt]}</TableHead>)}
                        <TableHead>Média</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consolidatedData.map(student => (
                        <TableRow key={student.email}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          {moduleTypes.map(mt => (
                            <TableCell key={mt}>{(student as any)[mt] != null ? Number((student as any)[mt]).toFixed(1) : "—"}</TableCell>
                          ))}
                          <TableCell className="font-bold">{student.average != null ? student.average.toFixed(1) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-room" className="space-y-6">
          {moduleTypes.map(mt => {
            const Icon = moduleIcons[mt];
            const moduleRooms = roomsByModule[mt] || [];
            if (!moduleRooms.length) return null;
            return (
              <Card key={mt}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5" />{moduleLabel[mt]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {moduleRooms.map(room => {
                    const roomResps = allResponses.filter(r => r.room_id === room.id);
                    const roomParts = allParticipants.filter(p => p.room_id === room.id);
                    const pairIndices = [...new Set(roomResps.map(r => r.pair_index))].sort();
                    return (
                      <div key={room.id} className="border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-sm">{room.title}</span>
                          <Badge variant="outline" className="text-xs">{room.status === "completed" ? "Concluída" : room.status}</Badge>
                        </div>
                        {pairIndices.length === 0 ? <p className="text-xs text-muted-foreground">Sem respostas</p> : (
                          <div className="space-y-1">
                            {pairIndices.map(pi => {
                              const resp = roomResps.find(r => r.pair_index === pi);
                              const names = roomParts.filter(p => p.pair_index === pi).map(p => p.student_name).join(" & ");
                              const score = resp?.admin_score != null ? Number(resp.admin_score) : (resp?.ai_score != null ? Number(resp.ai_score) : null);
                              return (
                                <div key={pi} className="flex justify-between text-sm">
                                  <span>{names || `Dupla ${pi + 1}`}</span>
                                  <span className="font-medium">{score != null ? `${score.toFixed(1)}/10` : "—"}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
