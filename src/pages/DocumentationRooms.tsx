import { useState } from "react";
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
import { Plus, Users, Settings, Play, Trash2, GraduationCap, FileText, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function DocumentationRooms() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reconRoomId, setReconRoomId] = useState<string>("");

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["documentation-rooms"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase
        .from("documentation_rooms")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: reconRooms } = useQuery({
    queryKey: ["reconciliation-rooms-for-documentation"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase
        .from("reconciliation_rooms")
        .select("id, title, access_code")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: participantCounts } = useQuery({
    queryKey: ["documentation-participant-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("documentation_participants").select("room_id, participant_role");
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        if (p.participant_role === "student") {
          counts[p.room_id] = (counts[p.room_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

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

      const selectedReconId = reconRoomId && reconRoomId !== "none" ? reconRoomId : null;

      const { data, error } = await supabase
        .from("documentation_rooms")
        .insert({
          user_id: session.user.id,
          title,
          description,
          reconciliation_room_id: selectedReconId,
        })
        .select()
        .single();
      if (error) throw error;

      // Auto-import participants and clinical cases from reconciliation
      if (selectedReconId) {
        const { data: reconParticipants } = await supabase
          .from("reconciliation_participants")
          .select("*")
          .eq("room_id", selectedReconId)
          .eq("participant_role", "student");

        if (reconParticipants?.length) {
          await supabase.from("documentation_participants").insert(
            reconParticipants.map(rp => ({
              room_id: data.id,
              student_name: rp.student_name,
              student_email: rp.student_email,
              pair_index: rp.pair_index,
              pair_position: rp.pair_position,
              reconciliation_participant_id: rp.id,
              participant_role: "student",
            }))
          );
        }

        const { data: reconCases } = await supabase
          .from("reconciliation_clinical_cases")
          .select("*")
          .eq("room_id", selectedReconId)
          .order("position", { ascending: true });

        if (reconCases?.length) {
          await supabase.from("documentation_clinical_cases").insert(
            reconCases.map(rc => ({
              room_id: data.id,
              reconciliation_case_id: rc.id,
              title: rc.title,
              content: rc.content,
              position: rc.position,
            }))
          );
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["documentation-rooms"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setReconRoomId("");
      navigate(`/simulations/documentation/editor/${data.id}`);
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao criar sala de documentação.", variant: "destructive" });
    },
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documentation_rooms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documentation-rooms"] }),
  });

  const duplicateRoom = useMutation({
    mutationFn: async (roomId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const original = rooms?.find(r => r.id === roomId);
      if (!original) throw new Error("Room not found");
      const { data: newRoom, error } = await supabase.from("documentation_rooms").insert({
        user_id: session.user.id,
        title: `${original.title} (cópia)`,
        description: original.description,
        reconciliation_room_id: original.reconciliation_room_id,
      }).select().single();
      if (error) throw error;
      const { data: forms } = await supabase.from("documentation_forms").select("*").eq("room_id", roomId);
      if (forms?.length) {
        await supabase.from("documentation_forms").insert(forms.map(f => ({ room_id: newRoom.id, title: f.title, form_type: f.form_type, content_json: f.content_json })));
      }
      const { data: cases } = await supabase.from("documentation_clinical_cases").select("*").eq("room_id", roomId);
      if (cases?.length) {
        await supabase.from("documentation_clinical_cases").insert(cases.map(c => ({ room_id: newRoom.id, title: c.title, content: c.content, position: c.position })));
      }
      return newRoom;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["documentation-rooms"] });
      toast({ title: "Sala duplicada", description: "A sala de documentação foi duplicada com sucesso." });
      navigate(`/simulations/documentation/editor/${data.id}`);
    },
    onError: () => toast({ title: "Erro", description: "Erro ao duplicar sala.", variant: "destructive" }),
  });

  const statusColor: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    finished: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  };

  const teacherName = profile?.full_name || "Professor";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Módulo Documentação</h1>
          <p className="text-muted-foreground">Encaminhamento e quadro resumo de medicamentos vinculados à Reconciliação</p>
        </div>
        <div className="flex items-center gap-2">
          <SystemPromptViewer toolKey="documentation" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova Sala</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Sala de Documentação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome da Sala</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Documentação Turma A" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div>
                <Label>Sala de Reconciliação de origem</Label>
                <Select value={reconRoomId} onValueChange={setReconRoomId}>
                  <SelectTrigger><SelectValue placeholder="Vincular a uma sala de Reconciliação" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {reconRooms?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.title} (PIN: {r.access_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createRoom.mutate()} disabled={!title || createRoom.isPending} className="w-full">
                Criar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : !rooms?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma sala de documentação</h3>
            <p className="text-muted-foreground mb-4">Crie uma sala para iniciar o módulo de documentação</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => {
            const studentCount = participantCounts?.[room.id] || 0;
            return (
              <Card key={room.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{room.title}</CardTitle>
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
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/simulations/documentation/editor/${room.id}`)}>
                      <Settings className="h-3.5 w-3.5 mr-1" />Editar
                    </Button>
                    {room.status === "active" && (
                      <Button size="sm" onClick={() => navigate(`/simulations/documentation/control/${room.id}`)}>
                        <Play className="h-3.5 w-3.5 mr-1" />Controle
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => duplicateRoom.mutate(room.id)} title="Duplicar">
                      <Copy className="h-3.5 w-3.5" />
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
    </div>
  );
}
