import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, Stethoscope, ClipboardList, Handshake, FileText, Eye, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

type RoomInfo = { id: string; title: string; status: string };

type StudentScore = {
  email: string;
  name: string;
  anamnesis: number | null;
  soap: number | null;
  reconciliation: number | null;
  documentation: number | null;
  average: number | null;
};

type RoomGroup = {
  room: RoomInfo;
  module: string;
  students: { email: string; name: string; score: number | null }[];
};

export default function SimulationAggregator() {
  const navigate = useNavigate();
  const [hiddenRoomIds, setHiddenRoomIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("agg-hidden-rooms");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [showFilter, setShowFilter] = useState(false);

  const toggleRoom = (roomId: string) => {
    setHiddenRoomIds(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      localStorage.setItem("agg-hidden-rooms", JSON.stringify([...next]));
      return next;
    });
  };

  // Fetch all rooms per module
  const { data: anamnesisRooms = [] } = useQuery({
    queryKey: ["agg-anamnesis-rooms"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase.from("simulation_rooms").select("id, title, status").eq("user_id", session.user.id).is("deleted_at", null).order("created_at", { ascending: false });
      return (data || []) as RoomInfo[];
    },
  });

  const { data: soapRooms = [] } = useQuery({
    queryKey: ["agg-soap-rooms"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase.from("soap_rooms").select("id, title, status").eq("user_id", session.user.id).is("deleted_at", null).order("created_at", { ascending: false });
      return (data || []) as RoomInfo[];
    },
  });

  const { data: reconRooms = [] } = useQuery({
    queryKey: ["agg-recon-rooms"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase.from("reconciliation_rooms").select("id, title, status").eq("user_id", session.user.id).order("created_at", { ascending: false });
      return (data || []) as RoomInfo[];
    },
  });

  const { data: docRooms = [] } = useQuery({
    queryKey: ["agg-doc-rooms"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase.from("documentation_rooms").select("id, title, status").eq("user_id", session.user.id).order("created_at", { ascending: false });
      return (data || []) as RoomInfo[];
    },
  });

  // Anamnesis scores: attribute scores to the PROFESSIONAL of each round
  const { data: anamnesisScores = [] } = useQuery({
    queryKey: ["agg-anamnesis-scores", anamnesisRooms.map(r => r.id)],
    queryFn: async () => {
      const roomIds = anamnesisRooms.map(r => r.id);
      if (!roomIds.length) return [];

      // Get participants
      const { data: participants } = await supabase
        .from("simulation_participants")
        .select("id, student_email, student_name, room_id")
        .in("room_id", roomIds);

      // Get rounds for these rooms
      const { data: rounds } = await supabase
        .from("simulation_rounds")
        .select("id, room_id, status")
        .in("room_id", roomIds);

      if (!participants || !rounds) return [];

      const completedRoundIds = rounds.filter(r => r.status === "completed").map(r => r.id);
      if (!completedRoundIds.length) return [];

      // Get assignments to find professional per round
      const { data: assignments } = await supabase
        .from("simulation_round_assignments")
        .select("round_id, participant_id, assigned_role")
        .in("round_id", completedRoundIds);

      // Get eval forms
      const { data: allForms } = await supabase
        .from("simulation_forms")
        .select("id, form_type, room_id")
        .in("room_id", roomIds);

      // Get responses for completed rounds
      const { data: responses } = await supabase
        .from("simulation_responses")
        .select("round_id, score, form_id, submitted_at")
        .in("round_id", completedRoundIds);

      if (!assignments || !allForms || !responses) return [];

      const evalFormIds = new Set(
        allForms
          .filter(f => f.form_type === "professor_eval" || f.form_type === "observer_eval")
          .map(f => f.id)
      );

      // Build a map: round_id → room_id
      const roundRoomMap = new Map<string, string>();
      rounds.forEach(r => roundRoomMap.set(r.id, r.room_id));

      // For each round, find the professional and compute the average of eval scores
      // Group by professional participant
      const professionalScores = new Map<string, number[]>();

      completedRoundIds.forEach(roundId => {
        const roundAssigns = assignments.filter(a => a.round_id === roundId);
        const professionalAssign = roundAssigns.find(a => a.assigned_role === "professional");
        if (!professionalAssign) return;

        const roundResponses = responses.filter(
          r => r.round_id === roundId && evalFormIds.has(r.form_id) && r.submitted_at
        );

        if (roundResponses.length === 0) return;

        const avgScore = roundResponses.reduce((sum, r) => sum + (Number(r.score) || 0), 0) / roundResponses.length;

        if (!professionalScores.has(professionalAssign.participant_id)) {
          professionalScores.set(professionalAssign.participant_id, []);
        }
        professionalScores.get(professionalAssign.participant_id)!.push(avgScore);
      });

      return roomIds.map(roomId => {
        const roomParticipants = participants.filter(p => p.room_id === roomId);
        const roomRoundIds = rounds.filter(r => r.room_id === roomId).map(r => r.id);

        const students = roomParticipants.map(p => {
          const scores = professionalScores.get(p.id);
          // Only include scores from rounds that belong to this room
          let score: number | null = null;
          if (scores && scores.length > 0) {
            score = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
          }
          return { email: p.student_email?.toLowerCase() || "", name: p.student_name, score };
        });
        return { roomId, students };
      });
    },
    enabled: anamnesisRooms.length > 0,
  });

  // SOAP scores grouped by room
  const { data: soapScores = [] } = useQuery({
    queryKey: ["agg-soap-scores", soapRooms.map(r => r.id)],
    queryFn: async () => {
      const roomIds = soapRooms.map(r => r.id);
      if (!roomIds.length) return [];

      const { data: participants } = await supabase.from("soap_participants").select("id, student_email, student_name, room_id").in("room_id", roomIds);
      const { data: responses } = await supabase.from("soap_responses").select("participant_id, admin_score, room_id").in("room_id", roomIds);

      if (!participants || !responses) return [];

      return roomIds.map(roomId => {
        const roomParticipants = participants.filter(p => p.room_id === roomId);
        const students = roomParticipants.map(p => {
          const score = responses.filter(r => r.participant_id === p.id).reduce((sum, r) => sum + (Number(r.admin_score) || 0), 0) || null;
          return { email: p.student_email?.toLowerCase() || "", name: p.student_name, score };
        });
        return { roomId, students };
      });
    },
    enabled: soapRooms.length > 0,
  });

  // Reconciliation scores grouped by room
  const { data: reconScores = [] } = useQuery({
    queryKey: ["agg-recon-scores", reconRooms.map(r => r.id)],
    queryFn: async () => {
      const roomIds = reconRooms.map(r => r.id);
      if (!roomIds.length) return [];

      const { data: participants } = await supabase.from("reconciliation_participants").select("id, student_email, student_name, room_id, pair_index").in("room_id", roomIds);
      const { data: responses } = await supabase.from("reconciliation_responses").select("room_id, pair_index, admin_score, ai_score").in("room_id", roomIds);

      if (!participants || !responses) return [];

      return roomIds.map(roomId => {
        const roomParticipants = participants.filter(p => p.room_id === roomId);
        const students = roomParticipants.map(p => {
          const resp = responses.find(r => r.room_id === p.room_id && r.pair_index === p.pair_index);
          return { email: p.student_email?.toLowerCase() || "", name: p.student_name, score: Number(resp?.admin_score ?? resp?.ai_score) || null };
        });
        return { roomId, students };
      });
    },
    enabled: reconRooms.length > 0,
  });

  // Documentation scores grouped by room
  const { data: docScores = [] } = useQuery({
    queryKey: ["agg-doc-scores", docRooms.map(r => r.id)],
    queryFn: async () => {
      const roomIds = docRooms.map(r => r.id);
      if (!roomIds.length) return [];

      const { data: participants } = await supabase.from("documentation_participants").select("id, student_email, student_name, room_id, pair_index").in("room_id", roomIds);
      const { data: responses } = await supabase.from("documentation_responses").select("room_id, pair_index, admin_score, ai_score").in("room_id", roomIds);

      if (!participants || !responses) return [];

      return roomIds.map(roomId => {
        const roomParticipants = participants.filter(p => p.room_id === roomId);
        const students = roomParticipants.map(p => {
          const resps = responses.filter(r => r.room_id === p.room_id && r.pair_index === p.pair_index);
          const totalScore = resps.reduce((sum, r) => sum + (Number(r.admin_score ?? r.ai_score) || 0), 0);
          return { email: p.student_email?.toLowerCase() || "", name: p.student_name, score: totalScore || null };
        });
        return { roomId, students };
      });
    },
    enabled: docRooms.length > 0,
  });

  // All rooms for filter panel
  const allRooms = useMemo(() => {
    const rooms: { id: string; title: string; status: string; module: string }[] = [];
    anamnesisRooms.forEach(r => rooms.push({ ...r, module: "anamnesis" }));
    soapRooms.forEach(r => rooms.push({ ...r, module: "soap" }));
    reconRooms.forEach(r => rooms.push({ ...r, module: "reconciliation" }));
    docRooms.forEach(r => rooms.push({ ...r, module: "documentation" }));
    return rooms;
  }, [anamnesisRooms, soapRooms, reconRooms, docRooms]);

  // Build a global email→scores map for cross-referencing all modules
  const globalScoreMap = useMemo(() => {
    const map = new Map<string, { anamnesis: number | null; soap: number | null; reconciliation: number | null; documentation: number | null }>();

    const process = (scores: { roomId: string; students: { email: string; name: string; score: number | null }[] }[], key: "anamnesis" | "soap" | "reconciliation" | "documentation", rooms: RoomInfo[]) => {
      scores.forEach(({ roomId, students }) => {
        if (hiddenRoomIds.has(roomId)) return;
        students.forEach(s => {
          if (!s.email) return;
          const existing = map.get(s.email) || { anamnesis: null, soap: null, reconciliation: null, documentation: null };
          if (s.score != null && (existing[key] == null || s.score > existing[key]!)) {
            existing[key] = s.score;
          }
          map.set(s.email, existing);
        });
      });
    };

    process(anamnesisScores, "anamnesis", anamnesisRooms);
    process(soapScores, "soap", soapRooms);
    process(reconScores, "reconciliation", reconRooms);
    process(docScores, "documentation", docRooms);

    return map;
  }, [anamnesisScores, soapScores, reconScores, docScores, anamnesisRooms, soapRooms, reconRooms, docRooms, hiddenRoomIds]);

  // Build room groups for each module (excluding hidden rooms)
  const roomGroups = useMemo(() => {
    const groups: RoomGroup[] = [];

    anamnesisRooms.filter(r => !hiddenRoomIds.has(r.id)).forEach(room => {
      const scoreData = anamnesisScores.find(s => s.roomId === room.id);
      groups.push({ room, module: "anamnesis", students: scoreData?.students || [] });
    });

    soapRooms.filter(r => !hiddenRoomIds.has(r.id)).forEach(room => {
      const scoreData = soapScores.find(s => s.roomId === room.id);
      groups.push({ room, module: "soap", students: scoreData?.students || [] });
    });

    reconRooms.filter(r => !hiddenRoomIds.has(r.id)).forEach(room => {
      const scoreData = reconScores.find(s => s.roomId === room.id);
      groups.push({ room, module: "reconciliation", students: scoreData?.students || [] });
    });

    docRooms.filter(r => !hiddenRoomIds.has(r.id)).forEach(room => {
      const scoreData = docScores.find(s => s.roomId === room.id);
      groups.push({ room, module: "documentation", students: scoreData?.students || [] });
    });

    return groups;
  }, [anamnesisRooms, soapRooms, reconRooms, docRooms, anamnesisScores, soapScores, reconScores, docScores, hiddenRoomIds]);

  // Consolidated view (excluding hidden rooms)
  const consolidated = useMemo(() => {
    const map = new Map<string, StudentScore>();
    const visibleRoomIds = new Set(roomGroups.map(g => g.room.id));

    const processModule = (rooms: RoomInfo[], scores: { roomId: string; students: { email: string; name: string; score: number | null }[] }[], key: keyof Pick<StudentScore, "anamnesis" | "soap" | "reconciliation" | "documentation">) => {
      scores.forEach(({ roomId, students }) => {
        if (!visibleRoomIds.has(roomId)) return;
        students.forEach(s => {
          if (!s.email) return;
          const existing = map.get(s.email) || { email: s.email, name: s.name, anamnesis: null, soap: null, reconciliation: null, documentation: null, average: null };
          if (s.score != null) {
            if (existing[key] == null || s.score > existing[key]!) {
              existing[key] = s.score;
            }
          }
          if (!existing.name && s.name) existing.name = s.name;
          map.set(s.email, existing);
        });
      });
    };

    processModule(anamnesisRooms, anamnesisScores, "anamnesis");
    processModule(soapRooms, soapScores, "soap");
    processModule(reconRooms, reconScores, "reconciliation");
    processModule(docRooms, docScores, "documentation");

    map.forEach(row => {
      const scores = [row.anamnesis, row.soap, row.reconciliation, row.documentation].filter(s => s != null) as number[];
      row.average = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : null;
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [anamnesisRooms, soapRooms, reconRooms, docRooms, anamnesisScores, soapScores, reconScores, docScores, roomGroups]);

  const moduleLabel = (mod: string) => {
    switch (mod) {
      case "anamnesis": return "Anamnese";
      case "soap": return "SOAP";
      case "reconciliation": return "Reconciliação";
      case "documentation": return "Documentação";
      default: return mod;
    }
  };

  const moduleIcon = (mod: string) => {
    switch (mod) {
      case "anamnesis": return <Stethoscope className="h-4 w-4" />;
      case "soap": return <ClipboardList className="h-4 w-4" />;
      case "reconciliation": return <Handshake className="h-4 w-4" />;
      case "documentation": return <FileText className="h-4 w-4" />;
      default: return null;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "draft": return "Rascunho";
      case "active": return "Ativa";
      case "completed": return "Concluída";
      default: return status;
    }
  };

  const statusVariant = (status: string): "default" | "secondary" | "outline" => {
    switch (status) {
      case "completed": return "secondary";
      case "active": return "default";
      default: return "outline";
    }
  };

  const getModuleGroups = (mod: string) => roomGroups.filter(g => g.module === mod);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/simulations")}>
          <ArrowLeft className="h-4 w-4 mr-1" />Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />Agregador de Notas
          </h1>
          <p className="text-muted-foreground">Visão geral das notas dos 4 módulos da simulação realística</p>
        </div>
        <Button
          variant={showFilter ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilter(!showFilter)}
          className="hover:text-accent-foreground"
        >
          <Filter className="h-4 w-4 mr-1" />
          Filtrar Salas
          {hiddenRoomIds.size > 0 && (
            <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">{hiddenRoomIds.size} ocultas</Badge>
          )}
        </Button>
      </div>

      {showFilter && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Selecione as salas que deseja exibir</CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setHiddenRoomIds(new Set()); localStorage.removeItem("agg-hidden-rooms"); }}>
                  <Eye className="h-3.5 w-3.5 mr-1" />Mostrar todas
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {["anamnesis", "soap", "reconciliation", "documentation"].map(mod => {
                const rooms = allRooms.filter(r => r.module === mod);
                if (rooms.length === 0) return null;
                return (
                  <div key={mod}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      {moduleIcon(mod)} {moduleLabel(mod)}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {rooms.map(room => (
                        <label
                          key={room.id}
                          className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                            hiddenRoomIds.has(room.id)
                              ? "bg-muted/50 border-muted text-muted-foreground opacity-60"
                              : "bg-background border-border hover:bg-accent/50"
                          }`}
                        >
                          <Checkbox
                            checked={!hiddenRoomIds.has(room.id)}
                            onCheckedChange={() => toggleRoom(room.id)}
                          />
                          <span className="text-sm truncate flex-1">{room.title}</span>
                          <Badge variant={statusVariant(room.status)} className="text-[10px] px-1.5 py-0 shrink-0">
                            {statusLabel(room.status)}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="by-room">
        <TabsList>
          <TabsTrigger value="by-room">Por Sala</TabsTrigger>
          <TabsTrigger value="consolidated">Consolidado</TabsTrigger>
        </TabsList>

        <TabsContent value="by-room" className="space-y-6 mt-4">
          {["anamnesis", "soap", "reconciliation", "documentation"].map(mod => {
            const groups = getModuleGroups(mod);
            if (groups.length === 0) return null;

            return (
              <div key={mod} className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  {moduleIcon(mod)} {moduleLabel(mod)}
                </h2>

                {groups.map(group => (
                  <Card key={group.room.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          {group.room.title}
                        </CardTitle>
                        <Badge variant={statusVariant(group.room.status)}>{statusLabel(group.room.status)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {group.students.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum participante nesta sala.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Aluno</TableHead>
                              <TableHead className="text-center w-32">Nota</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.students.sort((a, b) => a.name.localeCompare(b.name)).map((s, i) => (
                              <TableRow key={`${s.email}-${i}`}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-sm">{s.name}</p>
                                    <p className="text-xs text-muted-foreground">{s.email}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center font-semibold">
                                  {s.score != null ? s.score : "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })}

          {roomGroups.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma sala encontrada. Crie salas nos módulos para ver as notas aqui.</p>
          )}
        </TabsContent>

        <TabsContent value="consolidated" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visão Consolidada por Aluno</CardTitle>
            </CardHeader>
            <CardContent>
              {consolidated.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum dado encontrado.</p>
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
                      {consolidated.map(row => (
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
