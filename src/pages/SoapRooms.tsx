import { useState } from "react";
import SystemPromptViewer from "@/components/SystemPromptViewer";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Settings, Play, Trash2, FileText, GraduationCap, Copy, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ShareRoomDialog from "@/components/ShareRoomDialog";
import EditableRoomTitle from "@/components/EditableRoomTitle";
import SimulationRoomCard from "@/components/SimulationRoomCard";
import { StatusBadge } from "@/components/ui/status-badge";
import { ClipboardList as RoomIcon } from "lucide-react";

export default function SoapRooms() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [anamnesisRoomId, setAnamnesisRoomId] = useState<string>("");
  const [professorName, setProfessorName] = useState("");
  const [professorEmail, setProfessorEmail] = useState("");

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["soap-rooms"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase
        .from("soap_rooms")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: anamnesisRooms } = useQuery({
    queryKey: ["anamnesis-rooms-for-soap"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase
        .from("simulation_rooms")
        .select("id, title, access_code")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: participantCounts } = useQuery({
    queryKey: ["soap-participant-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("soap_participants").select("room_id");
      if (error) return {};
      const counts: Record<string, number> = {};
      (data || []).forEach((p) => { counts[p.room_id] = (counts[p.room_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: pendingTeacherEvals } = useQuery({
    queryKey: ["soap-pending-teacher-evals"],
    queryFn: async () => {
      const { data: responses } = await (supabase as any)
        .from("soap_responses")
        .select("id, room_id, participant_id, needs_teacher_peer_eval, target_participant_id")
        .eq("needs_teacher_peer_eval", true);
      if (!responses?.length) return {};
      const targets = new Set(
        (responses as any[])
          .filter((r) => r.target_participant_id)
          .map((r) => `${r.room_id}:${r.target_participant_id}`)
      );
      const counts: Record<string, number> = {};
      (responses as any[]).forEach((r) => {
        if (r.target_participant_id) return;
        if (targets.has(`${r.room_id}:${r.participant_id}`)) return;
        counts[r.room_id] = (counts[r.room_id] || 0) + 1;
      });
      return counts;
    },
    refetchInterval: 30000,
  });

  // Fetch profiles to show teacher name
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", session.user.id).maybeSingle();
      return data;
    },
  });

  const createRoom = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const linkedAnamnesisId = anamnesisRoomId && anamnesisRoomId !== "none" ? anamnesisRoomId : null;
      const { data, error } = await supabase
        .from("soap_rooms")
        .insert({
          user_id: session.user.id,
          title,
          description,
          anamnesis_room_id: linkedAnamnesisId,
        })
        .select()
        .single();
      if (error) throw error;

      let importedStudents = 0;
      let importedForms = 0;

      if (linkedAnamnesisId) {
        // 1) Import students from the linked anamnesis room
        const { data: simParticipants } = await supabase
          .from("simulation_participants")
          .select("id, student_name, student_email, participant_role")
          .eq("room_id", linkedAnamnesisId);
        const students = (simParticipants || []).filter((p: any) => p.participant_role === "student");
        if (students.length) {
          const { error: insErr } = await supabase.from("soap_participants").insert(
            students.map((p: any) => ({
              room_id: data.id,
              student_name: p.student_name,
              student_email: p.student_email || "",
              anamnesis_participant_id: p.id,
              participant_role: "student",
            })) as any
          );
          if (!insErr) importedStudents = students.length;
        }

        // 2) Reuse SOAP forms from a previous SOAP room linked to the same anamnesis room
        const { data: siblingRooms } = await supabase
          .from("soap_rooms")
          .select("id, created_at")
          .eq("anamnesis_room_id", linkedAnamnesisId)
          .neq("id", data.id)
          .order("created_at", { ascending: false });
        for (const sibling of siblingRooms || []) {
          const { data: sourceForms } = await supabase
            .from("soap_forms")
            .select("form_type, title, content_json")
            .eq("room_id", sibling.id);
          if (sourceForms?.length) {
            const { error: fErr } = await supabase.from("soap_forms").insert(
              sourceForms.map((f: any) => ({
                room_id: data.id,
                form_type: f.form_type,
                title: f.title,
                content_json: f.content_json,
              })) as any
            );
            if (!fErr) importedForms = sourceForms.length;
            break;
          }
        }
      }

      return { room: data, importedStudents, importedForms };
    },
    onSuccess: ({ room, importedStudents, importedForms }) => {
      queryClient.invalidateQueries({ queryKey: ["soap-rooms"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setAnamnesisRoomId("");
      setProfessorName("");
      setProfessorEmail("");
      if (importedStudents || importedForms) {
        toast({
          title: "Sala criada com importação",
          description: `${importedStudents} aluno(s) e ${importedForms} formulário(s) importados da anamnese.`,
        });
      }
      navigate(`/simulations/soap/editor/${room.id}`);
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao criar sala SOAP.", variant: "destructive" });
    },
  });


  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("soap_rooms")
        .delete()
        .eq("id", id)
        .select("id");

      if (error) throw error;
      if (!data?.length) throw new Error("Sala não encontrada ou sem permissão para excluir.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["soap-rooms"] });
      toast({ title: "Sala excluída com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir sala", description: error.message, variant: "destructive" });
    },
  });

  const duplicateRoom = useMutation({
    mutationFn: async (roomId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const original = rooms?.find(r => r.id === roomId);
      if (!original) throw new Error("Room not found");
      const { data: newRoom, error } = await supabase.from("soap_rooms").insert({
        user_id: session.user.id,
        title: `${original.title} (cópia)`,
        description: original.description,
        anamnesis_room_id: original.anamnesis_room_id,
      }).select().single();
      if (error) throw error;
      const { data: forms } = await supabase.from("soap_forms").select("*").eq("room_id", roomId);
      if (forms?.length) {
        await supabase.from("soap_forms").insert(forms.map(f => ({ room_id: newRoom.id, title: f.title, form_type: f.form_type, content_json: f.content_json })));
      }
      const { data: participants } = await supabase.from("soap_participants").select("*").eq("room_id", roomId);
      if (participants?.length) {
        await supabase.from("soap_participants").insert(participants.map(p => ({ room_id: newRoom.id, student_name: p.student_name, student_email: p.student_email, pair_index: p.pair_index, pair_position: p.pair_position, participant_role: p.participant_role })));
      }
      return newRoom;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["soap-rooms"] });
      toast({ title: "Sala duplicada", description: "A sala SOAP foi duplicada com sucesso." });
      navigate(`/simulations/soap/editor/${data.id}`);
    },
    onError: () => toast({ title: "Erro", description: "Erro ao duplicar sala.", variant: "destructive" }),
  });

  const [shareRoomId, setShareRoomId] = useState<string | null>(null);
  const [shareRoomTitle, setShareRoomTitle] = useState("");

  const statusColor: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  };

  const teacherName = profile?.full_name || "Professor";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="eyebrow mb-2.5">Praticar · Simulação</div>
          <h1 className="font-heading text-[2rem] font-medium leading-[1.1] text-foreground">Módulo SOAP</h1>
          <p className="mt-2 text-sm text-muted-foreground">Gerencie salas do módulo SOAP vinculadas à anamnese</p>
        </div>
        <div className="flex items-center gap-2">
          <SystemPromptViewer toolKey="soap" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova Sala SOAP</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading text-xl font-medium">Criar Sala SOAP</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome da Sala</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: SOAP Turma A" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div>
                <Label>Sala de Anamnese (opcional)</Label>
                <Select value={anamnesisRoomId} onValueChange={setAnamnesisRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vincular a uma sala de anamnese" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma (modo independente)</SelectItem>
                    {anamnesisRooms?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.title} (PIN: {r.access_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!anamnesisRoomId || anamnesisRoomId === "none") && (
                  <p className="text-xs text-warning-ink mt-1">
                    ⚠️ Modo independente: use quando a anamnese foi realizada offline. Os participantes deverão ser adicionados manualmente.
                  </p>
                )}
              </div>
              <Button onClick={() => createRoom.mutate()} disabled={!title || createRoom.isPending} className="w-full">
                Criar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : !(rooms || []).filter((r: any) => !r.is_archived).length ? (
        <Card className="flex flex-col items-center justify-center py-14 text-center">
          <RoomIcon className="mb-4 h-10 w-10 text-muted-foreground/40" />
          <h3 className="font-heading text-lg font-medium">Nenhuma sala SOAP</h3>
          <p className="mt-1 text-sm text-muted-foreground">Crie uma sala para iniciar este módulo. Salas arquivadas ficam em Simulação, aba Inativas.</p>
        </Card>
      ) : (
        <Card className="divide-y overflow-hidden">
          {(rooms || []).filter((r: any) => !r.is_archived).map((room) => {
            const studentCount = participantCounts?.[room.id] || 0;
            const pendingCount = pendingTeacherEvals?.[room.id] || 0;
            return (
              <SimulationRoomCard
                key={room.id}
                icon={RoomIcon}
                title={<EditableRoomTitle roomId={room.id} title={room.title} tableName="soap_rooms" invalidateKeys={["soap-rooms"]} />}
                description={room.description}
                status={room.status}
                meta={
                  <>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{studentCount} {studentCount === 1 ? "aluno" : "alunos"}</span>
                    <span>PIN <b className="font-mono font-medium text-foreground">{room.access_code}</b></span>
                    <span>{teacherName}</span>
                  </>
                }
                  extra={pendingCount > 0 ? (
                    <div className="mt-3"><StatusBadge tone="bad">{pendingCount} aluno(s) aguardando sua avaliação (par ausente)</StatusBadge></div>
                  ) : undefined}
                onEdit={() => navigate(`/simulations/soap/editor/${room.id}`)}
                onActivate={async () => {
                  await supabase.from("soap_rooms").update({ status: "active" }).eq("id", room.id);
                  queryClient.invalidateQueries({ queryKey: ["soap-rooms"] });
                  toast({ title: "Sala ativada!" });
                }}
                onControl={() => navigate(`/simulations/soap/control/${room.id}`)}
                onDuplicate={() => duplicateRoom.mutate(room.id)}
                onShare={() => { setShareRoomId(room.id); setShareRoomTitle(room.title); }}
                onArchive={async () => {
                  await supabase.from("soap_rooms").update({ is_archived: true } as any).eq("id", room.id);
                  queryClient.invalidateQueries({ queryKey: ["soap-rooms"] });
                  toast({ title: "Sala arquivada" });
                }}
                onDelete={() => deleteRoom.mutate(room.id)}
              />
            );
          })}
        </Card>
      )}

      {shareRoomId && (
        <ShareRoomDialog
          open={!!shareRoomId}
          onOpenChange={(o) => { if (!o) setShareRoomId(null); }}
          roomId={shareRoomId}
          roomTitle={shareRoomTitle}
          moduleType="soap"
        />
      )}
    </div>
  );
}
