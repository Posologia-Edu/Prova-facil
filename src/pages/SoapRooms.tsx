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
      const { data, error } = await supabase
        .from("soap_rooms")
        .insert({
          user_id: session.user.id,
          title,
          description,
          anamnesis_room_id: anamnesisRoomId && anamnesisRoomId !== "none" ? anamnesisRoomId : null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["soap-rooms"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setAnamnesisRoomId("");
      setProfessorName("");
      setProfessorEmail("");
      navigate(`/simulations/soap/editor/${data.id}`);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Módulo SOAP</h1>
          <p className="text-muted-foreground">Gerencie salas do módulo SOAP vinculadas à anamnese</p>
        </div>
        <div className="flex items-center gap-2">
          <SystemPromptViewer toolKey="soap" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova Sala SOAP</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Sala SOAP</DialogTitle>
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
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
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
      ) : !rooms?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma sala SOAP</h3>
            <p className="text-muted-foreground mb-4">Crie uma sala para iniciar o módulo SOAP</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => {
            const studentCount = participantCounts?.[room.id] || 0;
            const pendingCount = pendingTeacherEvals?.[room.id] || 0;
            return (
              <Card key={room.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <EditableRoomTitle roomId={room.id} title={room.title} tableName="soap_rooms" invalidateKeys={["soap-rooms"]} />
                      {room.description && <CardDescription>{room.description}</CardDescription>}
                    </div>
                    <Badge className={statusColor[room.status] || ""}>
                      {room.status === "draft" ? "Rascunho" : room.status === "active" ? "Ativa" : "Concluída"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{studentCount} alunos</span>
                    <span className="font-mono text-xs">PIN: {room.access_code}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>{teacherName}</span>
                  </div>
                  {pendingCount > 0 && (
                    <div className="mb-3">
                      <Badge variant="destructive" className="text-xs">
                        {pendingCount} aluno(s) aguardando sua avaliação (par ausente)
                      </Badge>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/simulations/soap/editor/${room.id}`)}>
                      <Settings className="h-3.5 w-3.5 mr-1" />Editar
                    </Button>
                    {room.status !== "draft" && (
                      <Button size="sm" onClick={() => navigate(`/simulations/soap/control/${room.id}`)}>
                        <Play className="h-3.5 w-3.5 mr-1" />Controle
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => duplicateRoom.mutate(room.id)} title="Duplicar">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setShareRoomId(room.id); setShareRoomTitle(room.title); }} title="Enviar para professor">
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteRoom.mutate(room.id)} title="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
