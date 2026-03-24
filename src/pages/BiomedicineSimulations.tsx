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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, Settings, Play, Trash2, ArrowRight, Copy, GraduationCap, Microscope, Scissors } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { biomedicineModules, moduleLabel, type BiomedicineModuleType } from "@/lib/biomedicine-modules";
import SystemPromptViewer from "@/components/SystemPromptViewer";
import GenericSplitRoomDialog from "@/components/GenericSplitRoomDialog";

export default function BiomedicineSimulations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("modules");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [createModuleType, setCreateModuleType] = useState<BiomedicineModuleType>("analise_laboratorial");
  const [splitRoomId, setSplitRoomId] = useState<string | null>(null);

  const moduleTypes: BiomedicineModuleType[] = ["analise_laboratorial", "controle_qualidade", "interpretacao_resultados", "laudo_tecnico"];

  const { data: allRooms = [], isLoading } = useQuery({
    queryKey: ["biomedicine-rooms-all"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase.from("biomedicine_rooms").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: participantCounts = {} } = useQuery({
    queryKey: ["biomedicine-participant-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("biomedicine_participants").select("room_id, participant_role");
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => { if (p.participant_role === "student") counts[p.room_id] = (counts[p.room_id] || 0) + 1; });
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
      const { data, error } = await supabase.from("biomedicine_rooms").insert({ user_id: session.user.id, title, description, module_type: createModuleType }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ["biomedicine-rooms-all"] }); setOpen(false); setTitle(""); setDescription(""); navigate(`/biomedicine/${data.module_type}/editor/${data.id}`); },
    onError: () => toast({ title: "Erro", description: "Erro ao criar sala.", variant: "destructive" }),
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("biomedicine_rooms").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["biomedicine-rooms-all"] }),
  });

  const duplicateRoom = useMutation({
    mutationFn: async (roomId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const original = allRooms.find(r => r.id === roomId);
      if (!original) throw new Error("Room not found");
      const { data: newRoom, error } = await supabase.from("biomedicine_rooms").insert({ user_id: session.user.id, title: `${original.title} (cópia)`, description: original.description, module_type: original.module_type }).select().single();
      if (error) throw error;
      const { data: forms } = await supabase.from("biomedicine_forms").select("*").eq("room_id", roomId);
      if (forms?.length) await supabase.from("biomedicine_forms").insert(forms.map(f => ({ room_id: newRoom.id, title: f.title, form_type: f.form_type, content_json: f.content_json })));
      const { data: cases } = await supabase.from("biomedicine_clinical_cases").select("*").eq("room_id", roomId);
      if (cases?.length) await supabase.from("biomedicine_clinical_cases").insert(cases.map(c => ({ room_id: newRoom.id, title: c.title, content: c.content, position: c.position })));
      const { data: participants } = await supabase.from("biomedicine_participants").select("*").eq("room_id", roomId);
      if (participants?.length) await supabase.from("biomedicine_participants").insert(participants.map(p => ({ room_id: newRoom.id, student_name: p.student_name, student_email: p.student_email, pair_index: p.pair_index, pair_position: p.pair_position, participant_role: p.participant_role })));
      return newRoom;
    },
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ["biomedicine-rooms-all"] }); toast({ title: "Sala duplicada" }); navigate(`/biomedicine/${data.module_type}/editor/${data.id}`); },
    onError: () => toast({ title: "Erro", description: "Erro ao duplicar sala.", variant: "destructive" }),
  });

  const statusColor: Record<string, string> = { draft: "bg-muted text-muted-foreground", active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
  const teacherName = profile?.full_name || "Professor";

  const renderRoomCards = (moduleType: BiomedicineModuleType) => {
    const rooms = allRooms.filter(r => r.module_type === moduleType);
    if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
    if (!rooms.length) return (<Card><CardContent className="flex flex-col items-center justify-center py-12 text-center"><Microscope className="h-12 w-12 text-muted-foreground/50 mb-4" /><h3 className="text-lg font-medium text-foreground mb-2">Nenhuma sala de {moduleLabel[moduleType]}</h3><p className="text-muted-foreground mb-4">Crie uma sala para iniciar o módulo</p></CardContent></Card>);
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => {
          const studentCount = participantCounts[room.id] || 0;
          return (
            <Card key={room.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3"><div className="flex items-start justify-between"><div className="space-y-1"><CardTitle className="text-lg">{room.title}</CardTitle>{room.description && <CardDescription>{room.description}</CardDescription>}</div><Badge className={statusColor[room.status] || ""}>{room.status === "draft" ? "Rascunho" : room.status === "active" ? "Ativa" : "Concluída"}</Badge></div></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2"><span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{studentCount} alunos</span><span className="font-mono text-xs">PIN: {room.access_code}</span></div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4"><GraduationCap className="h-3.5 w-3.5" /><span>{teacherName}</span></div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/biomedicine/${moduleType}/editor/${room.id}`)}><Settings className="h-3.5 w-3.5 mr-1" />Editar</Button>
                  {room.status === "draft" && (<Button size="sm" onClick={async () => { await supabase.from("biomedicine_rooms").update({ status: "active" }).eq("id", room.id); queryClient.invalidateQueries({ queryKey: ["biomedicine-rooms-all"] }); toast({ title: "Sala ativada!" }); }}><Play className="h-3.5 w-3.5 mr-1" />Ativar</Button>)}
                  {(room.status === "active" || room.status === "completed") && (<Button size="sm" variant={room.status === "completed" ? "outline" : "default"} onClick={() => navigate(`/biomedicine/${moduleType}/control/${room.id}`)}><Play className="h-3.5 w-3.5 mr-1" />{room.status === "completed" ? "Resultados" : "Controle"}</Button>)}
                  {room.status === "draft" && studentCount > 0 && (<Button variant="outline" size="sm" onClick={() => setSplitRoomId(room.id)}><Scissors className="h-3.5 w-3.5 mr-1" />Dividir</Button>)}
                  <Button variant="outline" size="sm" onClick={() => duplicateRoom.mutate(room.id)} title="Duplicar"><Copy className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteRoom.mutate(room.id)} title="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Biomedicina</h1><p className="text-muted-foreground">Simulação realística com módulos de biomedicina: Análise Laboratorial, CQ, Interpretação e Laudo</p></div>
        <SystemPromptViewer toolKey="biomedicine" />
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="modules"><Microscope className="h-4 w-4 mr-1" />Módulos</TabsTrigger>
          {moduleTypes.map(mt => { const mod = biomedicineModules.find(m => m.id === mt)!; return <TabsTrigger key={mt} value={mt}><mod.icon className="h-4 w-4 mr-1" />{moduleLabel[mt]}</TabsTrigger>; })}
        </TabsList>
        <TabsContent value="modules" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {biomedicineModules.map((mod) => (
              <Card key={mod.id} className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-primary/20" onClick={() => { if ((mod as any).route) navigate((mod as any).route); else setActiveTab(mod.id); }}>
                <CardHeader className="pb-3"><div className="flex items-start gap-4"><div className={`h-12 w-12 rounded-xl ${mod.bgColor} flex items-center justify-center shrink-0`}><mod.icon className={`h-6 w-6 ${mod.color}`} /></div><div className="flex-1 min-w-0"><CardTitle className="text-lg flex items-center justify-between">{mod.title}<ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></CardTitle><CardDescription className="mt-1">{mod.description}</CardDescription></div></div></CardHeader>
                <CardContent className="pt-0"><Badge variant="outline" className="text-xs">{mod.id === "aggregator" ? "Acessar módulo" : `${allRooms.filter(r => r.module_type === mod.id).length} salas`}</Badge></CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        {moduleTypes.map(mt => (
          <TabsContent key={mt} value={mt} className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={open && createModuleType === mt} onOpenChange={(o) => { setOpen(o); setCreateModuleType(mt); }}>
                <DialogTrigger asChild><Button onClick={() => setCreateModuleType(mt)}><Plus className="h-4 w-4 mr-2" />Nova Sala</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Criar Sala — {moduleLabel[mt]}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Nome da Sala</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder={`Ex: ${moduleLabel[mt]} Turma A`} /></div>
                    <div><Label>Descrição</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
                    <Button onClick={() => createRoom.mutate()} disabled={!title || createRoom.isPending} className="w-full">Criar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {renderRoomCards(mt)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
