import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, Stethoscope, ClipboardList, Handshake, FileText, Eye, Filter, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

type RoomInfo = { id: string; title: string; status: string; created_at: string };

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

/* ── helpers ── */

function extractTurma(title: string): string {
  const m = title.match(/^(T\d+|Turma\s*\d+)/i);
  return m ? m[1].trim() : "Sem turma";
}

function deriveSemester(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const half = d.getMonth() < 6 ? 1 : 2;
  return `${year}.${half}`;
}

export default function SimulationAggregator() {
  const navigate = useNavigate();
  const [hiddenRoomIds, setHiddenRoomIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("agg-hidden-rooms");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [showFilter, setShowFilter] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState("__all__");
  const [selectedTurma, setSelectedTurma] = useState("__all__");

  const toggleRoom = (roomId: string) => {
    setHiddenRoomIds(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      localStorage.setItem("agg-hidden-rooms", JSON.stringify([...next]));
      return next;
    });
  };

  // ── Fetch rooms (now include created_at) ──
  const { data: anamnesisRooms = [] } = useQuery({
    queryKey: ["agg-anamnesis-rooms"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase.from("simulation_rooms").select("id, title, status, created_at").eq("user_id", session.user.id).order("created_at", { ascending: false });
      return (data || []) as RoomInfo[];
    },
  });

  const { data: soapRooms = [] } = useQuery({
    queryKey: ["agg-soap-rooms"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase.from("soap_rooms").select("id, title, status, created_at").eq("user_id", session.user.id).order("created_at", { ascending: false });
      return (data || []) as RoomInfo[];
    },
  });

  const { data: reconRooms = [] } = useQuery({
    queryKey: ["agg-recon-rooms"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase.from("reconciliation_rooms").select("id, title, status, created_at").eq("user_id", session.user.id).order("created_at", { ascending: false });
      return (data || []) as RoomInfo[];
    },
  });

  const { data: docRooms = [] } = useQuery({
    queryKey: ["agg-doc-rooms"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase.from("documentation_rooms").select("id, title, status, created_at").eq("user_id", session.user.id).order("created_at", { ascending: false });
      return (data || []) as RoomInfo[];
    },
  });

  // ── Scores (unchanged logic) ──
  const { data: anamnesisScores = [] } = useQuery({
    queryKey: ["agg-anamnesis-scores", anamnesisRooms.map(r => r.id)],
    queryFn: async () => {
      const roomIds = anamnesisRooms.map(r => r.id);
      if (!roomIds.length) return [];
      const { data: participants } = await supabase.from("simulation_participants").select("id, student_email, student_name, room_id").in("room_id", roomIds);
      const { data: rounds } = await supabase.from("simulation_rounds").select("id, room_id, status").in("room_id", roomIds);
      if (!participants || !rounds) return [];
      const completedRoundIds = rounds.filter(r => r.status === "completed").map(r => r.id);
      if (!completedRoundIds.length) return [];
      const { data: assignments } = await supabase.from("simulation_round_assignments").select("round_id, participant_id, assigned_role").in("round_id", completedRoundIds);
      const { data: allForms } = await supabase.from("simulation_forms").select("id, form_type, room_id").in("room_id", roomIds);
      const { data: responses } = await supabase.from("simulation_responses").select("round_id, score, form_id, submitted_at").in("round_id", completedRoundIds);
      if (!assignments || !allForms || !responses) return [];
      const evalFormIds = new Set(allForms.filter(f => f.form_type === "professor_eval" || f.form_type === "observer_eval").map(f => f.id));
      const professionalScores = new Map<string, number[]>();
      completedRoundIds.forEach(roundId => {
        const roundAssigns = assignments.filter(a => a.round_id === roundId);
        const professionalAssign = roundAssigns.find(a => a.assigned_role === "professional");
        if (!professionalAssign) return;
        const roundResponses = responses.filter(r => r.round_id === roundId && evalFormIds.has(r.form_id) && r.submitted_at);
        if (roundResponses.length === 0) return;
        const avgScore = roundResponses.reduce((sum, r) => sum + (Number(r.score) || 0), 0) / roundResponses.length;
        if (!professionalScores.has(professionalAssign.participant_id)) professionalScores.set(professionalAssign.participant_id, []);
        professionalScores.get(professionalAssign.participant_id)!.push(avgScore);
      });
      return roomIds.map(roomId => {
        const roomParticipants = participants.filter(p => p.room_id === roomId);
        const students = roomParticipants.map(p => {
          const scores = professionalScores.get(p.id);
          let score: number | null = null;
          if (scores && scores.length > 0) score = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
          return { email: p.student_email?.toLowerCase() || "", name: p.student_name, score };
        });
        return { roomId, students };
      });
    },
    enabled: anamnesisRooms.length > 0,
  });

  const { data: soapScores = [] } = useQuery({
    queryKey: ["agg-soap-scores", soapRooms.map(r => r.id)],
    queryFn: async () => {
      const roomIds = soapRooms.map(r => r.id);
      if (!roomIds.length) return [];
      const { data: participants } = await supabase.from("soap_participants").select("id, student_email, student_name, room_id, participant_role").in("room_id", roomIds);
      const { data: responses } = await supabase.from("soap_responses").select("id, participant_id, target_participant_id, admin_score, answers_json, room_id, form_id").in("room_id", roomIds);
      const { data: forms } = await supabase.from("soap_forms").select("id, form_type, content_json, room_id").in("room_id", roomIds);
      if (!participants || !responses || !forms) return [];
      return roomIds.map(roomId => {
        const roomParticipants = participants.filter(p => p.room_id === roomId);
        const roomResponses = responses.filter(r => r.room_id === roomId);
        const soapResponses = roomResponses.filter(r => !r.target_participant_id);
        const peerResponses = roomResponses.filter(r => r.target_participant_id);
        const evalForm = forms.find(f => f.room_id === roomId && f.form_type === "peer_eval");
        const evalFields: any[] = evalForm && Array.isArray(evalForm.content_json) ? (evalForm.content_json as any[]) : [];
        const allStudents = roomParticipants.filter(p => p.participant_role !== "teacher");
        const students = allStudents.map(student => {
          const peerEval = peerResponses.find(r => r.target_participant_id === student.id);
          let peerScore: number | null = null;
          if (peerEval && evalFields.length > 0) {
            let totalScore = 0; let totalMax = 0;
            for (const field of evalFields) {
              if (!field.max_score) continue;
              totalMax += field.max_score;
              const answer = (peerEval.answers_json as Record<string, any>)?.[field.id];
              if (field.type === "radio" || field.type === "dropdown") {
                const options = field.options || [];
                const correctIdx = options.findIndex((o: any) => o === field.correct_answer);
                const answerIdx = typeof answer === "number" ? answer : options.indexOf(answer);
                if (correctIdx >= 0 && answerIdx === correctIdx) totalScore += field.max_score;
              } else if (field.type === "scale" || field.type === "rating") {
                const max = field.scale_max || field.max || 5;
                const val = Number(answer) || 0;
                totalScore += (val / max) * field.max_score;
              } else if (field.type === "checkbox") {
                if (answer) totalScore += field.max_score;
              } else {
                if (answer && String(answer).trim()) totalScore += field.max_score;
              }
            }
            peerScore = totalMax > 0 ? (totalScore / totalMax) * 10 : 0;
          }
          const soapResp = soapResponses.find(r => r.participant_id === student.id);
          const adminSc = soapResp?.admin_score != null ? Number(soapResp.admin_score) : null;
          const scores = [peerScore, adminSc].filter((s): s is number => s != null);
          const finalScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : null;
          return { email: student.student_email?.toLowerCase() || "", name: student.student_name, score: finalScore };
        });
        return { roomId, students };
      });
    },
    enabled: soapRooms.length > 0,
  });

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
          const rawScore = resp ? (resp.admin_score ?? resp.ai_score) : null;
          return { email: p.student_email?.toLowerCase() || "", name: p.student_name, score: rawScore != null ? Number(rawScore) : null };
        });
        return { roomId, students };
      });
    },
    enabled: reconRooms.length > 0,
  });

  const { data: docScores = [] } = useQuery({
    queryKey: ["agg-doc-scores", docRooms.map(r => r.id)],
    queryFn: async () => {
      const roomIds = docRooms.map(r => r.id);
      if (!roomIds.length) return [];
      const { data: participants } = await supabase.from("documentation_participants").select("id, student_email, student_name, room_id, pair_index").in("room_id", roomIds);
      const { data: responses } = await supabase.from("documentation_responses").select("room_id, pair_index, form_id, admin_score, created_at").in("room_id", roomIds);
      if (!participants || !responses) return [];
      return roomIds.map(roomId => {
        const roomParticipants = participants.filter(p => p.room_id === roomId);
        const students = roomParticipants.map(p => {
          const resps = responses.filter(r => r.room_id === p.room_id && r.pair_index === p.pair_index && r.admin_score != null);
          if (resps.length === 0) return { email: p.student_email?.toLowerCase() || "", name: p.student_name, score: null };
          const byForm = new Map<string, { score: number; created_at: string }>();
          resps.forEach(r => {
            const score = Number(r.admin_score);
            const existing = byForm.get(r.form_id);
            if (!existing || new Date(r.created_at).getTime() > new Date(existing.created_at).getTime()) {
              byForm.set(r.form_id, { score, created_at: r.created_at });
            }
          });
          const totalAdminScore = Array.from(byForm.values()).reduce((sum, item) => sum + item.score, 0);
          return { email: p.student_email?.toLowerCase() || "", name: p.student_name, score: Math.round(totalAdminScore * 100) / 100 };
        });
        return { roomId, students };
      });
    },
    enabled: docRooms.length > 0,
  });

  // ── Derive available semesters and turmas ──
  const allRoomsWithMeta = useMemo(() => {
    const rooms: (RoomInfo & { module: string; turma: string; semester: string })[] = [];
    anamnesisRooms.forEach(r => rooms.push({ ...r, module: "anamnesis", turma: extractTurma(r.title), semester: deriveSemester(r.created_at) }));
    soapRooms.forEach(r => rooms.push({ ...r, module: "soap", turma: extractTurma(r.title), semester: deriveSemester(r.created_at) }));
    reconRooms.forEach(r => rooms.push({ ...r, module: "reconciliation", turma: extractTurma(r.title), semester: deriveSemester(r.created_at) }));
    docRooms.forEach(r => rooms.push({ ...r, module: "documentation", turma: extractTurma(r.title), semester: deriveSemester(r.created_at) }));
    return rooms;
  }, [anamnesisRooms, soapRooms, reconRooms, docRooms]);

  const availableSemesters = useMemo(() => [...new Set(allRoomsWithMeta.map(r => r.semester))].sort().reverse(), [allRoomsWithMeta]);
  const availableTurmas = useMemo(() => {
    const filtered = selectedSemester === "__all__" ? allRoomsWithMeta : allRoomsWithMeta.filter(r => r.semester === selectedSemester);
    return [...new Set(filtered.map(r => r.turma))].sort();
  }, [allRoomsWithMeta, selectedSemester]);

  // ── Filter rooms by semester + turma ──
  const filteredRoomIds = useMemo(() => {
    return new Set(
      allRoomsWithMeta
        .filter(r => (selectedSemester === "__all__" || r.semester === selectedSemester))
        .filter(r => (selectedTurma === "__all__" || r.turma === selectedTurma))
        .filter(r => !hiddenRoomIds.has(r.id))
        .map(r => r.id)
    );
  }, [allRoomsWithMeta, selectedSemester, selectedTurma, hiddenRoomIds]);

  // ── Room groups filtered ──
  const roomGroups = useMemo(() => {
    const groups: RoomGroup[] = [];
    const addGroups = (rooms: RoomInfo[], scores: { roomId: string; students: { email: string; name: string; score: number | null }[] }[], mod: string) => {
      rooms.filter(r => filteredRoomIds.has(r.id)).forEach(room => {
        const scoreData = scores.find(s => s.roomId === room.id);
        groups.push({ room, module: mod, students: scoreData?.students || [] });
      });
    };
    addGroups(anamnesisRooms, anamnesisScores, "anamnesis");
    addGroups(soapRooms, soapScores, "soap");
    addGroups(reconRooms, reconScores, "reconciliation");
    addGroups(docRooms, docScores, "documentation");
    return groups;
  }, [anamnesisRooms, soapRooms, reconRooms, docRooms, anamnesisScores, soapScores, reconScores, docScores, filteredRoomIds]);

  // ── Consolidated view filtered by semester + turma ──
  const consolidated = useMemo(() => {
    const map = new Map<string, StudentScore>();

    const processModule = (scores: { roomId: string; students: { email: string; name: string; score: number | null }[] }[], key: keyof Pick<StudentScore, "anamnesis" | "soap" | "reconciliation" | "documentation">) => {
      scores.forEach(({ roomId, students }) => {
        if (!filteredRoomIds.has(roomId)) return;
        students.forEach(s => {
          if (!s.email) return;
          const existing = map.get(s.email) || { email: s.email, name: s.name, anamnesis: null, soap: null, reconciliation: null, documentation: null, average: null };
          if (s.score != null) {
            if (existing[key] == null || s.score > existing[key]!) existing[key] = s.score;
          }
          if (!existing.name && s.name) existing.name = s.name;
          map.set(s.email, existing);
        });
      });
    };

    processModule(anamnesisScores, "anamnesis");
    processModule(soapScores, "soap");
    processModule(reconScores, "reconciliation");
    processModule(docScores, "documentation");

    map.forEach(row => {
      const scores = [row.anamnesis, row.soap, row.reconciliation, row.documentation].filter(s => s != null) as number[];
      row.average = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : null;
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [anamnesisScores, soapScores, reconScores, docScores, filteredRoomIds]);

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

  const exportConsolidatedPDF = () => {
    if (consolidated.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Premium header band
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageW, 32, "F");
      doc.setFillColor(202, 138, 4); // amber/gold accent
      doc.rect(0, 32, pageW, 1.5, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Boletim Consolidado", 14, 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Simulação Realística — Notas por Módulo", 14, 21);

      // Filters chip on right
      const filterText = `Semestre: ${selectedSemester === "__all__" ? "Todos" : selectedSemester}   |   Turma: ${selectedTurma === "__all__" ? "Todas" : selectedTurma}`;
      doc.setFontSize(9);
      doc.text(filterText, pageW - 14, 14, { align: "right" });
      const dateStr = new Date().toLocaleString("pt-BR");
      doc.text(`Emitido em ${dateStr}`, pageW - 14, 21, { align: "right" });

      // Stats summary
      const withAvg = consolidated.filter(r => r.average != null);
      const overallAvg = withAvg.length ? withAvg.reduce((a, r) => a + (r.average || 0), 0) / withAvg.length : 0;
      const approved = withAvg.filter(r => (r.average || 0) >= 7).length;

      const cardsY = 42;
      const cardW = (pageW - 28 - 16) / 3;
      const drawCard = (x: number, label: string, value: string, accent: [number, number, number]) => {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, cardsY, cardW, 20, 2, 2, "F");
        doc.setFillColor(...accent);
        doc.rect(x, cardsY, 1.5, 20, "F");
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(label.toUpperCase(), x + 5, cardsY + 7);
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(value, x + 5, cardsY + 16);
      };
      drawCard(14, "Alunos", String(consolidated.length), [37, 99, 235]);
      drawCard(14 + cardW + 8, "Média Geral", overallAvg.toFixed(2), [202, 138, 4]);
      drawCard(14 + (cardW + 8) * 2, "Aprovados (≥7)", `${approved}/${withAvg.length}`, [22, 163, 74]);

      // Table
      const fmt = (v: number | null) => v != null ? v.toFixed(1) : "—";
      const rows = consolidated.map((r, idx) => [
        String(idx + 1),
        r.name,
        r.email || "—",
        fmt(r.anamnesis),
        fmt(r.soap),
        fmt(r.reconciliation),
        fmt(r.documentation),
        fmt(r.average),
      ]);

      autoTable(doc, {
        startY: 70,
        head: [["#", "Aluno", "E-mail", "Anamnese", "SOAP", "Reconciliação", "Documentação", "Média"]],
        body: rows,
        theme: "grid",
        styles: { font: "helvetica", fontSize: 9, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.1, textColor: [30, 41, 59] },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 10, halign: "center", textColor: [100, 116, 139] },
          1: { cellWidth: 50, fontStyle: "bold" },
          2: { cellWidth: 60, textColor: [100, 116, 139], fontSize: 8 },
          3: { halign: "center" },
          4: { halign: "center" },
          5: { halign: "center" },
          6: { halign: "center" },
          7: { halign: "center", fontStyle: "bold", fillColor: [254, 249, 195] },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 7) {
            const val = parseFloat(data.cell.text[0]);
            if (!isNaN(val)) {
              if (val >= 7) data.cell.styles.textColor = [22, 101, 52];
              else if (val >= 5) data.cell.styles.textColor = [161, 98, 7];
              else data.cell.styles.textColor = [153, 27, 27];
            }
          }
        },
        didDrawPage: () => {
          const pageNum = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(`Página ${pageNum}`, pageW - 14, pageH - 6, { align: "right" });
          doc.text("ProvaFácil — Boletim Consolidado", 14, pageH - 6);
        },
        margin: { left: 14, right: 14, top: 38 },
      });

      const fileName = `boletim-consolidado-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      toast.success("PDF exportado com sucesso");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    }
  };

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

      {/* ── Filtros de Semestre e Turma ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Semestre:</span>
          <Select value={selectedSemester} onValueChange={v => { setSelectedSemester(v); setSelectedTurma("__all__"); }}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {availableSemesters.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Turma:</span>
          <Select value={selectedTurma} onValueChange={setSelectedTurma}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {availableTurmas.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
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
                const rooms = allRoomsWithMeta.filter(r => r.module === mod);
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

        {/* ── ABA POR SALA: mostra APENAS a nota do módulo ── */}
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
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Aluno</TableHead>
                                <TableHead className="text-center">Nota</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.students.sort((a, b) => a.name.localeCompare(b.name)).map((s, i) => (
                                <TableRow key={`${s.email}-${i}`}>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium text-sm">{s.name}</p>
                                      {s.email && <p className="text-xs text-muted-foreground">{s.email}</p>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center font-medium">
                                    {s.score != null ? s.score.toFixed(1) : "—"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
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

        {/* ── ABA CONSOLIDADO ── */}
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
