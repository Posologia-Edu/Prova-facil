import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, BarChart3, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsListLine, TabsTriggerLine } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "@/hooks/use-toast";
import SystemPromptViewer from "@/components/SystemPromptViewer";
import GenericSplitRoomDialog from "@/components/GenericSplitRoomDialog";
import ShareRoomDialog from "@/components/ShareRoomDialog";
import EditableRoomTitle from "@/components/EditableRoomTitle";
import SimulationRoomCard from "@/components/SimulationRoomCard";

export interface AreaModule {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
}

export interface AreaConfig {
  /** prefixo das tabelas e das rotas: nursing, nutrition, dentistry, medicine, physiotherapy, biomedicine */
  prefix: string;
  title: string;
  /** frase curta sob o título */
  subtitle: string;
  modules: AreaModule[];
}

// Lista de salas de uma área da saúde (Enfermagem, Nutrição, etc.): as 6 áreas usam esta mesma tela.
export default function AreaSimulationsPage({ config }: { config: AreaConfig }) {
  const { prefix, title: areaTitle, subtitle, modules } = config;
  const roomsTable = `${prefix}_rooms`;
  const roomsKey = `${prefix}-rooms-all`;
  const countsKey = `${prefix}-participant-counts`;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeModule, setActiveModule] = useState(modules[0].id);
  const [archiveFilter, setArchiveFilter] = useState<"active" | "archived">("active");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [splitRoomId, setSplitRoomId] = useState<string | null>(null);
  const [shareRoomId, setShareRoomId] = useState<string | null>(null);
  const [shareRoomTitle, setShareRoomTitle] = useState("");

  const { data: allRooms = [], isLoading } = useQuery({
    queryKey: [roomsKey],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [] as any[];
      const { data, error } = await supabase.from(roomsTable as any).select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: participantCounts = {} } = useQuery({
    queryKey: [countsKey],
    queryFn: async () => {
      const { data } = await supabase.from(`${prefix}_participants` as any).select("room_id, participant_role");
      const counts: Record<string, number> = {};
      ((data || []) as any[]).forEach((p) => { if (p.participant_role === "student") counts[p.room_id] = (counts[p.room_id] || 0) + 1; });
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
  const teacherName = profile?.full_name || "Professor";

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [roomsKey] });
    queryClient.invalidateQueries({ queryKey: [countsKey] });
  };

  const createRoom = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase.from(roomsTable as any).insert({ user_id: session.user.id, title, description, module_type: activeModule } as any).select().single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data) => {
      refresh();
      setOpen(false);
      setTitle("");
      setDescription("");
      navigate(`/${prefix}/${data.module_type}/editor/${data.id}`);
    },
    onError: () => toast({ title: "Erro", description: "Erro ao criar sala.", variant: "destructive" }),
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(roomsTable as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast({ title: "Sala excluída" }); },
    onError: () => toast({ title: "Erro", description: "Não foi possível excluir a sala.", variant: "destructive" }),
  });

  const archiveRoom = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase.from(roomsTable as any).update({ is_archived: archived } as any).eq("id", id);
      if (error) throw error;
      return archived;
    },
    onSuccess: (archived) => { refresh(); toast({ title: archived ? "Sala arquivada" : "Sala reativada" }); },
    onError: () => toast({ title: "Erro", description: "Não foi possível atualizar a sala.", variant: "destructive" }),
  });

  const duplicateRoom = useMutation({
    mutationFn: async (roomId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const original = allRooms.find((r) => r.id === roomId);
      if (!original) throw new Error("Room not found");
      const { data: newRoom, error } = await supabase
        .from(roomsTable as any)
        .insert({ user_id: session.user.id, title: `${original.title} (cópia)`, description: original.description, module_type: original.module_type } as any)
        .select()
        .single();
      if (error) throw error;
      const created = newRoom as any;
      const { data: forms } = await supabase.from(`${prefix}_forms` as any).select("*").eq("room_id", roomId);
      if (forms?.length) await supabase.from(`${prefix}_forms` as any).insert((forms as any[]).map((f) => ({ room_id: created.id, title: f.title, form_type: f.form_type, content_json: f.content_json })) as any);
      const { data: cases } = await supabase.from(`${prefix}_clinical_cases` as any).select("*").eq("room_id", roomId);
      if (cases?.length) await supabase.from(`${prefix}_clinical_cases` as any).insert((cases as any[]).map((c) => ({ room_id: created.id, title: c.title, content: c.content, position: c.position })) as any);
      const { data: participants } = await supabase.from(`${prefix}_participants` as any).select("*").eq("room_id", roomId);
      if (participants?.length) await supabase.from(`${prefix}_participants` as any).insert((participants as any[]).map((p) => ({ room_id: created.id, student_name: p.student_name, student_email: p.student_email, pair_index: p.pair_index, pair_position: p.pair_position, participant_role: p.participant_role })) as any);
      return created;
    },
    onSuccess: (data) => {
      refresh();
      toast({ title: "Sala duplicada" });
      navigate(`/${prefix}/${data.module_type}/editor/${data.id}`);
    },
    onError: () => toast({ title: "Erro", description: "Erro ao duplicar sala.", variant: "destructive" }),
  });

  const activateRoom = async (id: string) => {
    await supabase.from(roomsTable as any).update({ status: "active" } as any).eq("id", id);
    refresh();
    toast({ title: "Sala ativada!" });
  };

  const mod = modules.find((m) => m.id === activeModule) || modules[0];
  const moduleRooms = allRooms.filter((r) => r.module_type === mod.id);
  const countOf = (moduleId: string, archived: boolean) => allRooms.filter((r) => r.module_type === moduleId && !!r.is_archived === archived).length;
  const showArchived = archiveFilter === "archived";
  const visible = moduleRooms.filter((r) => !!r.is_archived === showArchived);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate("/simulations")}>
          <ArrowLeft className="h-4 w-4" />Simulação
        </Button>
        <PageHeader
          eyebrow="Praticar · Simulação"
          title={areaTitle}
          description={subtitle}
          actions={
            <>
              <SystemPromptViewer toolKey={prefix} />
              <Button variant="outline" onClick={() => navigate(`/${prefix}/aggregator`)}>
                <BarChart3 className="h-4 w-4" />Agregador de notas
              </Button>
              <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Nova sala</Button>
            </>
          }
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {modules.map((m) => (
            <Button key={m.id} size="sm" variant={activeModule === m.id ? "default" : "outline"} onClick={() => setActiveModule(m.id)}>
              {m.title}
              <span className="font-mono text-xs opacity-70">{countOf(m.id, false)}</span>
            </Button>
          ))}
        </div>
        {mod.description && <p className="text-sm text-muted-foreground">{mod.description}</p>}
      </div>

      <Tabs value={archiveFilter} onValueChange={(v) => setArchiveFilter(v as "active" | "archived")}>
        <TabsListLine>
          <TabsTriggerLine value="active">Ativas <span className="font-mono text-xs text-muted-foreground">{countOf(mod.id, false)}</span></TabsTriggerLine>
          <TabsTriggerLine value="archived">Inativas <span className="font-mono text-xs text-muted-foreground">{countOf(mod.id, true)}</span></TabsTriggerLine>
        </TabsListLine>
      </Tabs>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : visible.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-14 text-center">
          <mod.icon className="mb-4 h-10 w-10 text-muted-foreground/40" />
          <h3 className="font-heading text-lg font-medium">{showArchived ? "Nenhuma sala inativa" : `Nenhuma sala de ${mod.title}`}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {showArchived ? "Arquive salas de semestres anteriores para vê-las aqui." : "Crie a primeira sala para começar."}
          </p>
          {!showArchived && <Button className="mt-4" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Nova sala</Button>}
        </Card>
      ) : (
        <Card className="divide-y overflow-hidden">
          {visible.map((room) => {
            const studentCount = participantCounts[room.id] || 0;
            return (
              <SimulationRoomCard
                key={room.id}
                icon={mod.icon}
                title={<EditableRoomTitle roomId={room.id} title={room.title} tableName={roomsTable} invalidateKeys={[roomsKey]} />}
                description={room.description}
                status={room.status}
                archived={!!room.is_archived}
                meta={
                  <>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{studentCount} {studentCount === 1 ? "aluno" : "alunos"}</span>
                    <span>PIN <b className="font-mono font-medium text-foreground">{room.access_code}</b></span>
                    <span>{teacherName}</span>
                  </>
                }
                onEdit={() => navigate(`/${prefix}/${mod.id}/editor/${room.id}`)}
                onActivate={() => activateRoom(room.id)}
                onControl={() => navigate(`/${prefix}/${mod.id}/control/${room.id}`)}
                onSplit={room.status === "draft" && studentCount > 0 ? () => setSplitRoomId(room.id) : undefined}
                onDuplicate={() => duplicateRoom.mutate(room.id)}
                onShare={() => { setShareRoomId(room.id); setShareRoomTitle(room.title); }}
                onArchive={() => archiveRoom.mutate({ id: room.id, archived: !room.is_archived })}
                onDelete={() => deleteRoom.mutate(room.id)}
              />
            );
          })}
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-medium">Nova sala · {mod.title}</DialogTitle>
            <DialogDescription>Você define participantes e formulários depois, no editor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da sala</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Ex.: ${mod.title} · Turma A`} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => createRoom.mutate()} disabled={!title || createRoom.isPending}>Criar sala</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {splitRoomId && (
        <GenericSplitRoomDialog
          roomId={splitRoomId}
          open={!!splitRoomId}
          onOpenChange={(o) => { if (!o) setSplitRoomId(null); }}
          onComplete={() => { setSplitRoomId(null); refresh(); }}
          tablePrefix={prefix as any}
        />
      )}
      {shareRoomId && (
        <ShareRoomDialog open={!!shareRoomId} onOpenChange={(o) => { if (!o) setShareRoomId(null); }} roomId={shareRoomId} roomTitle={shareRoomTitle} moduleType={prefix} />
      )}
    </div>
  );
}
